/*
 * Copyright © 2016-2024 by IntegrIT S.A. dba Hackolade.  All rights reserved.
 *
 * The copyright to the computer software herein is the property of IntegrIT S.A.
 * The software may be used and/or copied only with the written permission of
 * IntegrIT S.A. or in accordance with the terms and conditions stipulated in
 * the agreement/contract under which the software has been supplied.
 */

const _ = require('lodash');
const { getIndexKeyIdToKeyNameMap, injectKeysNamesIntoIndexKeys } = require('../../utils/indexes');
const { wrapWithBackticks, getKeySpaceReference } = require('./commonDdlStatements');

/**
 *
 * @param {object} collection
 * @returns {string[]}
 */
const getIndexesScript = collection => {
	const { namespace, bucket, bucketName: scope, collectionName, indexes, properties } = collection;
	const collectionIndexes = indexes ?? [];
	const keyIdToName = getIndexKeyIdToKeyNameMap(properties);
	const indexesKeysWithCorrespondingPropertiesNames = collectionIndexes.map(index =>
		injectKeysNamesIntoIndexKeys({ index, keyIdToName }),
	);

	return indexesKeysWithCorrespondingPropertiesNames
		.map(index => {
			const indexData = {
				...index,
				namespace,
				bucket,
				scope,
				collectionName,
			};
			const indexStatement = getIndexScript(indexData);

			return indexData.isActivated ? indexStatement : commentStatement(indexStatement);
		})
		.join('\n\n');
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
	const isPrimary = index.indxType === 'Primary';
	const createIndexScript = isPrimary
		? `CREATE PRIMARY INDEX ${wrapWithBackticks(getValidIndexName(index.indxName))}`
		: `CREATE INDEX ${wrapWithBackticks(getValidIndexName(index.indxName))}`;
	const bucketWithKeysScript = `ON ${keySpaceRefStatement}${keysScript}`;

	return (
		[
			wrapCreateIndexStatementWithIfNotExistsClause({
				ifNotExists: index.ifNotExists,
				createStatement: createIndexScript,
			}),
			bucketWithKeysScript,
			additionalOptions,
		]
			.filter(Boolean)
			.join('\n\t') + ';'
	);
};

/**
 *
 * @param {string[]} statements
 * return {string}
 */
const joinIndexesStatements = statements => `${statements.filter(Boolean).join('\n\t')};`;

/**
 *
 * @param {{ifNotExists: boolean, createStatement: string}} param
 * @returns {string}
 */
const wrapCreateIndexStatementWithIfNotExistsClause = ({ ifNotExists, createStatement }) =>
	ifNotExists ? `${createStatement} IF NOT EXISTS` : createStatement;

/**
 *
 * @param {string} name
 * @returns {string}
 */
const getValidIndexName = name => {
	return name.replace(/^[^A-Za-z]/, 'idx_').replace(/[^A-Za-z0-9#_]/g, '_');
};

/**
 *
 * @param {object} index
 * @returns {{script: string, canHaveIndex: boolean}}
 */
const getKeys = index => {
	switch (index.indxType) {
		case 'Primary':
			return { script: '', canHaveIndex: true };
		case 'Secondary':
			const keys = index.indxKey?.map(key => ({ ...key, name: wrapWithBackticks(key.name) }));

			const keysNames = keys
				.map(key => _.filter([key.name, getOrder(key.type)]).join(' '))
				.concat(index.functionExpr)
				.filter(Boolean)
				.join(',');

			return { script: `(${keysNames})`, canHaveIndex: Boolean(keysNames.length) };
		case 'Array':
			return { script: `(${index.arrayExpr})`, canHaveIndex: true };
		case 'Metadata':
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
const getAdditionalOptions = index => {
	return getAdditionalOptionsFunctionsArray(index)
		.map(getOption => getOption(index))
		.filter(Boolean)
		.join('\n\t');
};

/**
 *
 * @param {object} index
 * @returns {function[]}
 */
const getAdditionalOptionsFunctionsArray = index => {
	switch (index.indxType) {
		case 'Primary':
			return [getUsingGSI, getWithClause];
		case 'Secondary':
			return [getPartitionByHashClause, getWhereClause, getUsingGSI, getWithClause];
		case 'Array':
			return [getWhereClause, getUsingGSI, getWithClause];
		case 'Metadata':
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
	const defer_build = _.get(index, 'withOptions.defer_build') ? `"defer_build":true` : '';
	const num_replica = !_.isEmpty(_.get(index, 'withOptions.num_replica'))
		? `"num_replica":${index.withOptions.num_replica}`
		: '';
	const nodes = _.get(index, 'withOptions.nodes', []).length
		? `"nodes":[${index.withOptions.nodes.map(node => `"${node.nodeName}"`).join(',')}]`
		: '';
	const hasWithClosure = defer_build || num_replica || nodes;
	const withClosure = [defer_build, num_replica, nodes].filter(Boolean).join(',');

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
			const keysNames = index.partitionByHashKeys.map(key => wrapWithBackticks(key.name)).join(',');

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
const commentStatement = statement => {
	return (
		'/*\n' +
		statement
			.split('\n')
			.map(line => ' * ' + line)
			.join('\n') +
		'\n */'
	);
};

module.exports = {
	getIndexesScript,
};
