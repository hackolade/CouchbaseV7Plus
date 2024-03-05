const { pickBy, isUndefined, get, set } = require('lodash');
const restApiHelper = require('./restApiHelper');
const clusterHelper = require('../../shared/helpers/clusterHelper');
const parserHelper = require('./parserHelper');
const { GET_META_REGEXP, GET_PARTITION_HASH_REGEXP, DEFAULT_NAME } = require('../../shared/constants');

const handleIndex = index => {
	const indexData = getHackoladeCompatibleIndex(index);
	return pickBy(indexData, value => !isUndefined(value));
};

const getHackoladeCompatibleIndex = index => {
	if (index.is_primary) {
		return {
			indxName: index.name,
			indxType: 'Primary',
			usingGSI: index.using === 'gsi',
		};
	} else if (checkArrayIndex(index)) {
		return {
			indxName: index.name,
			indxType: 'Array',
			usingGSI: index.using === 'gsi',
			arrayExpr: index.index_key.map(getExpression).join(','),
			whereClause: getWhereCondition(index),
		};
	} else if (checkMetaIndex(index)) {
		return {
			indxName: index.name,
			indxType: 'Metadata',
			metadataExpr: index.index_key.map(getExpression).join(','),
		};
	} else {
		const partitionByHash = getPartition(index);
		const { expression, keys } = getKeysAndExpression(index);

		return {
			indxName: index.name,
			indxType: 'Secondary',
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
	return /^\`.*?\`$/.test(key) || /^\(\`.*?\`\)$/.test(key);
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
		.replace(/\`/gi, '')
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

const getWhereCondition = index => {
	if (index.condition) {
		return index.condition;
	}
};

const getIndexes = async ({ cluster, connectionInfo, logger, app }) => {
	try {
		const indexData = await restApiHelper.getIndexes({ connectionInfo, logger, app });
		const statements = indexData.map(indx => indx.definition).join(';\n');

		if (!statements) {
			return [];
		}

		const { indexes } = parserHelper.parseN1qlStatements({ statements });

		return indexes;
	} catch (error) {
		try {
			logger.error(error);

			const indexes = await clusterHelper.getIndexes({ cluster, logger });

			return indexes
				.toSorted((a, b) => a.name.localeCompare(b.name))
				.map(index => {
					const isDefaultCollectionIndex = !index.bucket_id;
					const bucketName = isDefaultCollectionIndex ? index.keyspace_id : index.bucket_id;
					const scopeName = isDefaultCollectionIndex ? DEFAULT_NAME : index.scope_id;
					const collectionName = isDefaultCollectionIndex ? DEFAULT_NAME : index.keyspace_id;

					return {
						index: handleIndex(index),
						bucketName,
						scopeName,
						collectionName,
					};
				});
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
