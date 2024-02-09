/*
 * Copyright © 2016-2024 by IntegrIT S.A. dba Hackolade.  All rights reserved.
 *
 * The copyright to the computer software herein is the property of IntegrIT S.A.
 * The software may be used and/or copied only with the written permission of
 * IntegrIT S.A. or in accordance with the terms and conditions stipulated in
 * the agreement/contract under which the software has been supplied.
 */

const _ = require('lodash');
const { getIndexKeyIdToKeyNameMap, injectKeysNamesIntoIndexKeys } = require('./indexesService');

const getIndexesScript = collection => {
	const collectionIndexes = collection?.indexes ?? [];
	const keyIdToName = getIndexKeyIdToKeyNameMap(collection?.properties);
	const indexesKeysWithCorrespondingPropertiesNames = collectionIndexes.map(index =>
		injectKeysNamesIntoIndexKeys({ index, keyIdToName }),
	);

	return indexesKeysWithCorrespondingPropertiesNames
		.map(index => {
			const indexStatement = getIndexScript({ index, bucketName: collection.bucketName });

			return index.isActivated ? indexStatement : commentStatement(indexStatement);
		})
		.join('\n\n');
};

const getIndexScript = ({ index }) => {
	if (!index.indxName) {
		return '';
	}

	const { script: keysScript, canHaveIndex } = getKeys(index);

	if (!canHaveIndex) {
		return '';
	}

	const keySpaceRefStatement = geKeySpaceRefStatement(index);
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

const wrapCreateIndexStatementWithIfNotExistsClause = ({ ifNotExists, createStatement }) =>
	ifNotExists ? `${createStatement} IF NOT EXISTS` : createStatement;

const geKeySpaceRefStatement = index => {
	const { namespace, bucketName, scope, collectionName } = index;

	if (!collectionName) {
		return '';
	}

	const namespaceStatement = scope && namespace ? `${wrapWithBackticks(namespace)}: ` : '';
	const collectionPath = scope
		? `.${wrapWithBackticks(scope)}.${wrapWithBackticks(collectionName)}`
		: wrapWithBackticks(index.keySpaceRef.collectionName);

	return `${namespaceStatement}${bucketName}${collectionPath}`;
};

const getValidIndexName = name => {
	return name.replace(/^[^A-Za-z]/, 'idx_').replace(/[^A-Za-z0-9#_]/g, '_');
};

const getKeys = index => {
	switch (index.indxType) {
		case 'Primary':
			return { script: '', canHaveIndex: true };
		case 'Secondary':
			const [leadingKey, ...keys] = index.indxKey;
			const includeMissingStatement = index.includeMissing ? ' INCLUDE MISSING' : '';
			const leadingKeyStatement = `${leadingKey.name} ${getOrder(leadingKey.type)}${includeMissingStatement}`;

			const keysNames = [leadingKeyStatement]
				.concat(keys.map(key => _.filter([key.name, getOrder(key.type)]).join(' ')))
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

const getAdditionalOptions = index => {
	return getAdditionalOptionsFunctionsArray(index)
		.map(getOption => getOption(index))
		.filter(Boolean)
		.join('\n\t');
};

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

const getWhereClause = index => {
	return index.whereClause ? `WHERE ${index.whereClause}` : '';
};

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

const getUsingGSI = index => (index.usingGSI ? 'USING GSI' : '');

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

const getPartitionByHashClause = index => {
	switch (index.partitionByHash) {
		case 'Keys':
			const keysNames = index.partitionByHashKeys.map(key => `${key.name}`).join(',');

			return `PARTITION BY HASH(${keysNames})`;
		case 'Expression':
			return `PARTITION BY HASH(${index.partitionByHashExpr})`;
		default:
			return '';
	}
};

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

const wrapWithBackticks = str => `\`${str}\``;

module.exports = {
	getIndexesScript,
};
