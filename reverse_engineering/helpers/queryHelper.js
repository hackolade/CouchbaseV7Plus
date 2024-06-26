const { NUM_SAMPLE_VALUES } = require('../../shared/constants');

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

/**
 * @param {{ bucketName: string; scopeName: string; collectionName: string; limit: number; offset: number }} param0
 * @returns {string}
 */
const getSelectCollectionDocumentsQuery = ({ bucketName, scopeName, collectionName, limit, offset }) => {
	const query = `SELECT *, META().id AS docid FROM \`${bucketName}\`.\`${scopeName}\`.\`${collectionName}\` AS \`${bucketName}\``;
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
