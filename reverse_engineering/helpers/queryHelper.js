const { NUM_SAMPLE_VALUES } = require('../../shared/constants');
const { INDEX_TYPE } = require('../../shared/enums/indexType');
const { getKeysAndExpression } = require('./indexHelper');

/**
 * @param {{ bucketName: string; scopeName: string; collectionName: string; limit: number }} param0
 * @returns {string}
 */
const getInferCollectionDocumentsQuery = ({ bucketName, scopeName, collectionName, limit }) => {
	return `INFER \`${bucketName}\`.\`${scopeName}\`.\`${collectionName}\` WITH {"sample_size":${limit}, "num_sample_values":${NUM_SAMPLE_VALUES}};`;
};

/**
 * @param {{ bucketName: string; limit?: number; offset: number; }} param0
 * @returns {string}
 */
const getSelectBucketDocumentsQuery = ({ bucketName, limit, offset }) => {
	const query = `SELECT * FROM \`${bucketName}\``;
	return getQueryOptions({ query, limit, offset });
};

const getWhereClauseFromMetaIndexes = ({ collectionIndexes }) => {
	const metadataIndexes = collectionIndexes.filter(index => index.indxType === INDEX_TYPE.metadata);
	const expressions = metadataIndexes.map(getKeysAndExpression);
	return expressions;
};

/**
 * @param {{ bucketName: string; scopeName: string; collectionName: string; limit: number; offset: number }} param0
 * @returns {string}
 */
const getSelectCollectionDocumentsQuery = ({
	bucketName,
	scopeName,
	collectionName,
	collectionIndexes,
	limit,
	offset,
}) => {
	const whereClause = getWhereClauseFromMetaIndexes({ collectionIndexes });
	const query = `SELECT *, META().id AS docid FROM \`${bucketName}\`.\`${scopeName}\`.\`${collectionName}\` AS \`${bucketName}\`${whereClause}`;
	return getQueryOptions({ query, limit, offset });
};

/**
 * @param {{ bucketName: string; scopeName: string; collectionName: string; }} param0
 * @returns {string}
 */
const getCountCollectionDocumentsQuery = ({ bucketName, scopeName, collectionName }) => {
	return `SELECT COUNT(*) AS size FROM \`${bucketName}\`.\`${scopeName}\`.\`${collectionName}\``;
};

/**
 * @returns {string}
 */
const getSelectIndexesQuery = () => {
	return `SELECT * FROM system:indexes`;
};

/**
 * @param {{ query: string; limit: number; offset: number; }} param0
 * @returns {string}
 */
const getQueryOptions = ({ query, limit, offset }) => {
	return query + (limit ? ` LIMIT ${limit}` : '') + (offset ? ` OFFSET ${offset}` : '');
};

module.exports = {
	getCountCollectionDocumentsQuery,
	getInferCollectionDocumentsQuery,
	getSelectBucketDocumentsQuery,
	getSelectCollectionDocumentsQuery,
	getSelectIndexesQuery,
	getQueryOptions,
};
