const { filter, get, isEmpty } = require('lodash');
const { getIndexKeyIdToKeyNameMap, injectKeysNamesIntoIndexKeys } = require('../../utils/indexes');
const { wrapWithBackticks, getKeySpaceReference, joinStatements } = require('./commonStatements');
const { INDEX_TYPE } = require('../../../shared/enums/indexType');

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
	if (!index.indxName) {
		return '';
	}

	const { script: keysScript, canHaveIndex } = getKeys(index);

	if (!canHaveIndex) {
		return '';
	}

	const keySpaceRefStatement = getKeySpaceReference(index);
	const additionalOptions = getAdditionalOptions(index);
	const isPrimary = index.indxType === INDEX_TYPE.primary;
	const createIndexScript = isPrimary
		? `CREATE PRIMARY INDEX ${wrapWithBackticks(index.indxName)}`
		: `CREATE INDEX ${wrapWithBackticks(index.indxName)}`;
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
			return [getUsingGSI, getWithClause];
		case INDEX_TYPE.secondary:
			return [getPartitionByHashClause, getWhereClause, getUsingGSI, getWithClause];
		case INDEX_TYPE.array:
			return [getWhereClause, getUsingGSI, getWithClause];
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
 *
 * @param {object} index
 * @returns {string}
 */
const getWithClause = index => {
	const deferBuild = get(index, 'withOptions.defer_build') ? `"defer_build":true` : '';

	const numReplicaValue = get(index, 'withOptions.num_replica');
	const numReplica = isEmpty(numReplicaValue) ? '' : `"num_replica":${numReplicaValue}`;

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
				statements: index.partitionByHashKeys.map(key => wrapWithBackticks(key.name)),
				separator: ',',
			});

			return `PARTITION BY HASH(${keysNames})`;
		}
		case 'Expression':
			return `PARTITION BY HASH(${index.partitionByHashExpr})`;
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
 *
 * @param {{
 *   namespace: string,
 *   bucketName: string,
 *   scopeName: string,
 *   collectionName: string,
 *   indxName: string,
 *   usingGSI?: boolean,
 * }} index
 * @returns {string}
 */
const getDropIndexScript = ({ namespace, bucketName, scopeName, collectionName, indxName, usingGSI }) => {
	if (!indxName || !collectionName) {
		return '';
	}

	const keySpaceRefStatement = getKeySpaceReference({ namespace, bucketName, scopeName, collectionName });
	const usingGsiClause = usingGSI ? ' USING GSI' : '';

	return `DROP INDEX ${wrapWithBackticks(indxName)} IF EXISTS ON ${keySpaceRefStatement}${usingGsiClause};`;
};

/**
 * @param {{ num_replica?: number }} params
 * @returns {boolean}
 */
const isReplicaCountSet = ({ num_replica } = {}) =>
	num_replica !== undefined && num_replica !== null && num_replica !== '';

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
		return `{"action":"replica_count","num_replica":${num_replica}}`;
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
	usingGSI,
	action,
	nodes = [],
	num_replica,
}) => {
	if (!indxName || !collectionName || !action) {
		return '';
	}

	const keySpaceRefStatement = getKeySpaceReference({ namespace, bucketName, scopeName, collectionName });
	const usingGsiClause = usingGSI ? ' USING GSI' : '';
	const withClause = getAlterIndexWithClause({ action, nodes, num_replica });

	if (!withClause) {
		return '';
	}

	return `ALTER INDEX ${wrapWithBackticks(indxName)} ON ${keySpaceRefStatement}${usingGsiClause} WITH ${withClause};`;
};

module.exports = {
	getIndexesScript,
	getIndexScript,
	getDropIndexScript,
	getAlterIndexScript,
};
