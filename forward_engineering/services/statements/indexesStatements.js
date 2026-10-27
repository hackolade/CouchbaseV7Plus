const { filter, get } = require('lodash');
const { getIndexKeyIdToKeyNameMap, injectKeysNamesIntoIndexKeys } = require('../../utils/indexes');
const { wrapWithBackticks, getKeySpaceReference, joinStatements } = require('./commonStatements');
const { INDEX_TYPE } = require('../../../shared/enums/indexType');
const { DEFAULT_PRIMARY_INDEX_NAME } = require('../../../shared/constants');

/**
 *
 * @param {{ namespace: string, bucketName: string, scopeName: string, collectionName: string, indexes: object[], properties: object[] }} collection
 * @returns {string[]}
 */
const getIndexesScript = ({ namespace, bucketName, scopeName, collectionName, indexes, properties = {} }) => {
	const collectionIndexes = indexes ?? [];
	const keyIdToName = getIndexKeyIdToKeyNameMap(properties);
	const indexesKeysWithCorrespondingPropertiesNames = collectionIndexes.map(index =>
		injectKeysNamesIntoIndexKeys({ index, keyIdToName }),
	);
	const statements = indexesKeysWithCorrespondingPropertiesNames.map(index => {
		const indexData = {
			...index,
			namespace,
			bucketName,
			scopeName,
			collectionName,
		};
		const indexStatement = getIndexScript(indexData);

		return indexData.isActivated ? indexStatement : commentStatement(indexStatement);
	});

	return joinStatements({
		statements,
		separator: '\n\n',
	});
};

/**
 *
 * @param {object} index
 * @returns {string}
 */
const getIndexScript = index => {
	const isPrimary = index.indxType === INDEX_TYPE.primary;

	if (!index.indxName && !isPrimary) {
		return '';
	}

	const { script: keysScript, canHaveIndex } = getKeys(index);

	if (!canHaveIndex) {
		return '';
	}

	const keySpaceRefStatement = getKeySpaceReference(index);
	const additionalOptions = getAdditionalOptions(index);
	const indexNameStatement = index.indxName ? ` ${wrapWithBackticks(index.indxName)}` : '';
	const createIndexScript = isPrimary
		? `CREATE PRIMARY INDEX${indexNameStatement}`
		: `CREATE INDEX${indexNameStatement}`;
	const bucketWithKeysScript = `ON ${keySpaceRefStatement}${keysScript}`;

	return `${joinStatements({
		statements: [
			wrapCreateIndexStatementWithIfNotExistsClause({
				ifNotExists: index.ifNotExists,
				createStatement: createIndexScript,
			}),
			bucketWithKeysScript,
			additionalOptions,
		],
	})};`;
};

/**
 *
 * @param {{ifNotExists: boolean, createStatement: string}} param
 * @returns {string}
 */
const wrapCreateIndexStatementWithIfNotExistsClause = ({ ifNotExists, createStatement }) =>
	ifNotExists ? `${createStatement} IF NOT EXISTS` : createStatement;

/**
 *
 * @param {object} index
 * @returns {{script: string, canHaveIndex: boolean}}
 */
const getKeys = index => {
	const rawIndex = { script: '', canHaveIndex: true };

	switch (index.indxType) {
		case INDEX_TYPE.primary:
			return rawIndex;
		case INDEX_TYPE.secondary: {
			const keys = index.indxKey?.map(key => ({ ...key, name: wrapWithBackticks(key.name) }));
			if (!keys) {
				return { script: '', canHaveIndex: false };
			}
			const keysNames = joinStatements({
				statements: keys
					.map(key => joinStatements({ statements: filter([key.name, getOrder(key.type)]), separator: ' ' }))
					.concat(index.functionExpr),
				separator: ',',
			});

			return { script: `(${keysNames})`, canHaveIndex: keysNames.length > 0 };
		}
		case INDEX_TYPE.array:
			return { script: `(${index.arrayExpr})`, canHaveIndex: true };
		case INDEX_TYPE.metadata:
			return { script: `(${index.metadataExpr})`, canHaveIndex: true };
		default:
			return rawIndex;
	}
};

/**
 *
 * @param {object} index
 * @returns {string}
 */
const getAdditionalOptions = index =>
	joinStatements({ statements: getAdditionalOptionsFunctions(index).map(addOption => addOption(index)) });

/**
 *
 * @param {object} index
 * @returns {function[]}
 */
const getAdditionalOptionsFunctions = index => {
	switch (index.indxType) {
		case INDEX_TYPE.primary:
			return [getPartitionByHashClause, getUsingGSI, getWithClause];
		case INDEX_TYPE.secondary:
		case INDEX_TYPE.array:
		case INDEX_TYPE.metadata:
			return [getPartitionByHashClause, getWhereClause, getUsingGSI, getWithClause];
		default:
			return [];
	}
};

/**
 *
 * @param {object} index
 * @returns {string}
 */
const getWhereClause = index => {
	return index.whereClause ? `WHERE ${index.whereClause}` : '';
};

/**
 * @param {{ num_replica?: number | string }} params
 * @returns {boolean}
 */
const isReplicaCountSet = ({ num_replica } = {}) => {
	if (typeof num_replica === 'string' && num_replica.trim() === '') {
		return false;
	}

	if (typeof num_replica !== 'number' && typeof num_replica !== 'string') {
		return false;
	}

	const value = Number(num_replica);

	return Number.isInteger(value) && value >= 0;
};

/**
 *
 * @param {object} index
 * @returns {string}
 */
const getWithClause = index => {
	const deferBuild = get(index, 'withOptions.defer_build') ? `"defer_build":true` : '';

	const numReplicaValue = get(index, 'withOptions.num_replica');
	const numReplica = isReplicaCountSet({ num_replica: numReplicaValue })
		? `"num_replica":${Number(numReplicaValue)}`
		: '';

	const nodeStatement = joinStatements({
		statements: index.withOptions?.nodes?.map(node => `"${node.nodeName}"`),
		separator: ',',
	});
	const nodes = get(index, 'withOptions.nodes', []).length > 0 ? `"nodes":[${nodeStatement}]` : '';

	const hasWithClosure = deferBuild || numReplica || nodes;

	const withClosure = joinStatements({ statements: [deferBuild, numReplica, nodes], separator: ',' });

	return hasWithClosure ? `WITH{${withClosure}}` : '';
};

/**
 *
 * @param {{usingGSI: boolean}} param
 * @returns {string}
 */
const getUsingGSI = ({ usingGSI }) => (usingGSI ? 'USING GSI' : '');

/**
 *
 * @param {string} order
 * @returns {string}
 */
const getOrder = order => {
	switch (order) {
		case 'ascending':
			return 'ASC';
		case 'descending':
			return 'DESC';
		default:
			return '';
	}
};

/**
 *
 * @param {object} index
 * @returns {string}
 */
const getPartitionByHashClause = index => {
	switch (index.partitionByHash) {
		case 'Keys': {
			const keysNames = joinStatements({
				statements: (index.partitionByHashKeys ?? [])
					.filter(key => key.name)
					.map(key => wrapWithBackticks(key.name)),
				separator: ',',
			});

			return keysNames ? `PARTITION BY HASH(${keysNames})` : '';
		}
		case 'Expression':
			return index.partitionByHashExpr ? `PARTITION BY HASH(${index.partitionByHashExpr})` : '';
		default:
			return '';
	}
};

/**
 *
 * @param {string} statement
 * @returns {string}
 */
const commentStatement = statement => {
	const joinedStatement = joinStatements({
		statements: statement.split('\n').map(line => ` * ${line}`),
		separator: '\n',
	});
	return `/*\n${joinedStatement}\n */`;
};

/**
 * @param {{ indxName?: string, indxType?: string }} index
 * @returns {string}
 */
const getIndexIdentifier = ({ indxName, indxType } = {}) =>
	indxName || (indxType === INDEX_TYPE.primary ? DEFAULT_PRIMARY_INDEX_NAME : '');

/**
 *
 * @param {{
 *   namespace: string,
 *   bucketName: string,
 *   scopeName: string,
 *   collectionName: string,
 *   indxName: string,
 *   indxType?: string,
 *   usingGSI?: boolean,
 * }} index
 * @returns {string}
 */
const getDropIndexScript = ({ namespace, bucketName, scopeName, collectionName, indxName, indxType, usingGSI }) => {
	if (!getIndexIdentifier({ indxName, indxType }) || !collectionName) {
		return '';
	}

	const keySpaceRefStatement = getKeySpaceReference({ namespace, bucketName, scopeName, collectionName });
	const usingGsiClause = usingGSI ? ' USING GSI' : '';

	if (!indxName) {
		return `DROP PRIMARY INDEX IF EXISTS ON ${keySpaceRefStatement}${usingGsiClause};`;
	}

	return `DROP INDEX ${wrapWithBackticks(indxName)} IF EXISTS ON ${keySpaceRefStatement}${usingGsiClause};`;
};

/**
 *
 * @param {{
 *   action: 'move' | 'replica_count',
 *   nodes?: Array<{ nodeName?: string } | string>,
 *   num_replica?: number
 * }} params
 * @returns {string}
 */
const getAlterIndexWithClause = ({ action, nodes = [], num_replica } = {}) => {
	if (action === 'move') {
		const nodeStatement = joinStatements({
			statements: nodes.map(node => `"${typeof node === 'string' ? node : node.nodeName}"`),
			separator: ',',
		});

		if (!nodeStatement) {
			return '';
		}

		return `{"action":"move","nodes":[${nodeStatement}]}`;
	}

	if (action === 'replica_count' && isReplicaCountSet({ num_replica })) {
		return `{"action":"replica_count","num_replica":${Number(num_replica)}}`;
	}

	return '';
};

/**
 *
 * @param {{
 *   namespace: string,
 *   bucketName: string,
 *   scopeName: string,
 *   collectionName: string,
 *   indxName: string,
 *   indxType?: string,
 *   usingGSI?: boolean,
 *   action: 'move' | 'replica_count',
 *   nodes?: Array<{ nodeName?: string } | string>,
 *   num_replica?: number,
 * }} index
 * @returns {string}
 */
const getAlterIndexScript = ({
	namespace,
	bucketName,
	scopeName,
	collectionName,
	indxName,
	indxType,
	usingGSI,
	action,
	nodes = [],
	num_replica,
}) => {
	const indexIdentifier = getIndexIdentifier({ indxName, indxType });

	if (!indexIdentifier || !collectionName || !action) {
		return '';
	}

	const keySpaceRefStatement = getKeySpaceReference({ namespace, bucketName, scopeName, collectionName });
	const usingGsiClause = usingGSI ? ' USING GSI' : '';
	const withClause = getAlterIndexWithClause({ action, nodes, num_replica });

	if (!withClause) {
		return '';
	}

	return `ALTER INDEX ${wrapWithBackticks(indexIdentifier)} ON ${keySpaceRefStatement}${usingGsiClause} WITH ${withClause};`;
};

module.exports = {
	getIndexesScript,
	getIndexScript,
	getDropIndexScript,
	getAlterIndexScript,
	getIndexIdentifier,
	isReplicaCountSet,
};
