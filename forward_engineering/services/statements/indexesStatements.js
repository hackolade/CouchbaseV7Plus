const { filter, get, isEmpty } = require('lodash');
const { getIndexKeyIdToKeyNameMap, injectKeysNamesIntoIndexKeys } = require('../../utils/indexes');
const { wrapWithBackticks, getKeySpaceReference, joinStatements } = require('./commonStatements');
const { INDEX_TYPE } = require('../../../shared/enums/n1ql');

/**
 *
 * @param {{ namespace: string, bucketName: string, scopeName: string, collectionName: string, indexes: object[], properties: object[] }} collection
 * @returns {string[]}
 */
const getIndexesScript = ({ namespace, bucketName, scopeName, collectionName, indexes, properties }) => {
	const collectionIndexes = indexes ?? [];
	const keyIdToName = properties ? getIndexKeyIdToKeyNameMap(properties) : {};
	const indexesKeysWithCorrespondingPropertiesNames = collectionIndexes.map(index =>
		injectKeysNamesIntoIndexKeys({ index, keyIdToName }),
	);

	return joinStatements({
		statements: indexesKeysWithCorrespondingPropertiesNames.map(index => {
			const indexData = {
				...index,
				namespace,
				bucketName,
				scopeName,
				collectionName,
			};
			const indexStatement = getIndexScript(indexData);

			return indexData.isActivated ? indexStatement : commentStatement(indexStatement);
		}),
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
	switch (index.indxType) {
		case INDEX_TYPE.primary:
			return { script: '', canHaveIndex: true };
		case INDEX_TYPE.secondary:
			const keys = index.indxKey?.map(key => ({ ...key, name: wrapWithBackticks(key.name) }));

			const keysNames = joinStatements({
				statements: keys
					.map(key => joinStatements({ statements: filter([key.name, getOrder(key.type)]), separator: ' ' }))
					.concat(index.functionExpr),
				separator: ',',
			});

			return { script: `(${keysNames})`, canHaveIndex: Boolean(keysNames.length) };
		case INDEX_TYPE.array:
			return { script: `(${index.arrayExpr})`, canHaveIndex: true };
		case INDEX_TYPE.metadata:
			return { script: `(${index.metadataExpr})`, canHaveIndex: true };
		default:
			return { script: '', canHaveIndex: true };
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
		case INDEX_TYPE.metadata:
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
	const numReplica = !isEmpty(get(index, 'withOptions.num_replica'))
		? `"num_replica":${index.withOptions.num_replica}`
		: '';
	const nodes = get(index, 'withOptions.nodes', []).length
		? `"nodes":[${joinStatements({ statements: index.withOptions.nodes.map(node => `"${node.nodeName}"`), separator: ',' })}]`
		: '';
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
		case 'Keys':
			const keysNames = joinStatements({
				statements: index.partitionByHashKeys.map(key => wrapWithBackticks(key.name)),
				separator: ',',
			});

			return `PARTITION BY HASH(${keysNames})`;
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
const commentStatement = statement =>
	`/*\n${joinStatements({ statements: statement.split('\n').map(line => ` * ${line}`), separator: '\n' })}\n */`;

module.exports = {
	getIndexesScript,
};
