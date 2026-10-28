const { pickBy, isUndefined, get, set } = require('lodash');
const restApiHelper = require('./restApiHelper');
const clusterHelper = require('../../shared/helpers/clusterHelper');
const parserHelper = require('./parserHelper');
const {
	GET_META_REGEXP,
	GET_PARTITION_HASH_REGEXP,
	DEFAULT_NAME,
	DEFAULT_PRIMARY_INDEX_NAME,
} = require('../../shared/constants');
const { INDEX_TYPE } = require('../../shared/enums/indexType');

const DEFER_BUILD_REGEXP = /"defer_build"\s*:\s*true/i;

const handleIndex = ({ index, indexStatus }) => {
	const indexData = {
		...getHackoladeCompatibleIndex(index),
		withOptions: getWithOptions({ index, indexStatus }),
	};
	return pickBy(indexData, value => !isUndefined(value));
};

/**
 * Nodes are not reverse-engineered: /indexStatus always reports the hosts of an index,
 * even when no nodes were specified at creation.
 */
const getWithOptions = ({ index, indexStatus }) => {
	const deferBuild = index.state === 'deferred' || DEFER_BUILD_REGEXP.test(indexStatus?.definition ?? '');
	const numReplica = Number(indexStatus?.numReplica);

	return {
		defer_build: deferBuild,
		...(numReplica > 0 && { num_replica: numReplica }),
	};
};

const getIndexKey = ({ bucketName, scopeName, collectionName, indexName }) =>
	[bucketName, scopeName, collectionName, indexName].join('.');

const getIndexStatusMap = async ({ connectionInfo, logger }) => {
	try {
		const indexStatuses = await restApiHelper.getIndexes({ connectionInfo, logger });

		return (indexStatuses ?? []).reduce((result, indexStatus) => {
			const key = getIndexKey({
				bucketName: indexStatus.bucket,
				scopeName: indexStatus.scope ?? DEFAULT_NAME,
				collectionName: indexStatus.collection ?? DEFAULT_NAME,
				indexName: indexStatus.indexName ?? indexStatus.index,
			});

			return result.has(key) ? result : result.set(key, indexStatus);
		}, new Map());
	} catch (error) {
		logger.error(error);
		return new Map();
	}
};

const getHackoladeCompatibleIndex = index => {
	if (index.is_primary) {
		return {
			indxName: index.name === DEFAULT_PRIMARY_INDEX_NAME ? '' : index.name,
			indxType: INDEX_TYPE.primary,
			usingGSI: index.using === 'gsi',
			...getPartitionProperties(index),
		};
	} else if (checkArrayIndex(index)) {
		return {
			indxName: index.name,
			indxType: INDEX_TYPE.array,
			usingGSI: index.using === 'gsi',
			arrayExpr: index.index_key.map(getExpression).join(','),
			whereClause: getWhereCondition(index),
			...getPartitionProperties(index),
		};
	} else if (checkMetaIndex(index)) {
		return {
			indxName: index.name,
			indxType: INDEX_TYPE.metadata,
			usingGSI: index.using === 'gsi',
			metadataExpr: index.index_key.map(getExpression).join(','),
			whereClause: getWhereCondition(index),
			...getPartitionProperties(index),
		};
	} else {
		const partitionByHash = getPartition(index);
		const { expression, keys } = getKeysAndExpression(index);

		return {
			indxName: index.name,
			indxType: INDEX_TYPE.secondary,
			usingGSI: index.using === 'gsi',
			indxKey: keys,
			functionExpr: expression,
			whereClause: getWhereCondition(index),
			partitionByHash: partitionByHash.type,
			partitionByHashExpr: partitionByHash.expression,
		};
	}
};

const checkMetaIndex = index => {
	return Boolean(get(index, 'index_key', []).find(key => GET_META_REGEXP.test(key)));
};

const checkArrayIndex = index => {
	return Boolean(
		get(index, 'index_key', []).find(
			key => key.startsWith('(distinct') || key.startsWith('(all') || key.startsWith('array'),
		),
	);
};

const getKeysAndExpression = index => {
	const indexKeys = get(index, 'index_key', []);
	const keys = indexKeys.filter(checkKeySimple).map(getSimpleKey);
	const expression = indexKeys.filter(key => !checkKeySimple(key)).join(',');

	if (expression) {
		return { keys, expression };
	}

	return { keys };
};

const checkKeySimple = key => {
	return /^`.*?`$/.test(key) || /^\(`.*?`\)$/.test(key);
};

const getExpression = key => {
	if (GET_META_REGEXP.test(key)) {
		return `META().` + GET_META_REGEXP.exec(key)[1];
	}

	return key;
};

const getSimpleKey = key => {
	const isDescending = key.endsWith('DESC');
	const keyName = key
		.replace(/`/gi, '')
		.replace(' DESC', '')
		.replace(/^\s+/, '')
		.replace(/\s+$/, '')
		.replace(/^\((.*?)\)$/, '$1');

	return { name: keyName, type: isDescending ? 'descending' : 'ascending' };
};

const getPartition = index => {
	if (index.partition && GET_PARTITION_HASH_REGEXP.test(index.partition)) {
		return { expression: get(GET_PARTITION_HASH_REGEXP.exec(index.partition), '[2]'), type: 'Expression' };
	}

	return { type: '' };
};

const getPartitionProperties = index => {
	const { type, expression } = getPartition(index);

	return type ? { partitionByHash: type, partitionByHashExpr: expression } : {};
};

const getWhereCondition = index => {
	if (index.condition) {
		return index.condition;
	}
};

const getIndexes = async ({ cluster, connectionInfo, logger }) => {
	try {
		const indexes = await clusterHelper.getIndexes({ cluster, logger });
		const indexStatusMap = indexes.length ? await getIndexStatusMap({ connectionInfo, logger }) : new Map();

		return indexes
			.toSorted((a, b) => a.name.localeCompare(b.name))
			.map(index => {
				const isDefaultCollectionIndex = !index.bucket_id;
				const bucketName = isDefaultCollectionIndex ? index.keyspace_id : index.bucket_id;
				const scopeName = isDefaultCollectionIndex ? DEFAULT_NAME : index.scope_id;
				const collectionName = isDefaultCollectionIndex ? DEFAULT_NAME : index.keyspace_id;

				const indexStatus = indexStatusMap.get(
					getIndexKey({ bucketName, scopeName, collectionName, indexName: index.name }),
				);

				return {
					index: handleIndex({ index, indexStatus }),
					bucketName,
					scopeName,
					collectionName,
				};
			});
	} catch (error) {
		try {
			logger.error(error);

			const indexData = await restApiHelper.getIndexes({ connectionInfo, logger });
			const statements = indexData.map(indx => indx.definition).join(';\n');

			if (!statements) {
				return [];
			}

			const { indexes } = parserHelper.parseN1qlStatements({ statements });

			return indexes;
		} catch (err) {
			logger.error(err);
			return [];
		}
	}
};

const getIndexesByCollectionMap = ({ indexes }) => {
	return indexes.reduce((result, indexData) => {
		const { bucketName, scopeName, collectionName, index } = indexData;
		const namePath = [bucketName, scopeName, collectionName];
		const collectionIndexes = get(result, namePath, []);

		return set(result, namePath, [...collectionIndexes, index]);
	}, {});
};

module.exports = {
	getIndexes,
	getIndexesByCollectionMap,
};
