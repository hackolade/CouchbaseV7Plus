/**
 * @param {{ bucketName: string; documentKind: string; }} param0
 * @returns {string}
 */
const getSelectBucketDocumentKindQuery = ({ bucketName, documentKind }) => {
	return `SELECT ${documentKind} FROM \`${bucketName}\` WHERE ${documentKind} IS NOT MISSING GROUP BY ${documentKind}`;
};

/**
 * @param {{ bucketName: string; limit: number; }} param0
 * @returns {string}
 */
const getInferBucketDocumentsQuery = ({ bucketName, limit }) => {
	return `INFER \`${bucketName}\` WITH {"sample_size": ${limit},"num_sample_values":3};`;
};

/**
 * @param {{ bucketName: string; scopeName: string; collectionName: string; limit: number }} param0
 * @returns
 */
const getInferCollectionDocumentsQuery = ({ bucketName, scopeName, collectionName, limit }) => {
	return `INFER \`${bucketName}\`.\`${scopeName}\`.\`${collectionName}\` WITH {"sample_size":${limit}, "num_sample_values":3};`;
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

const getSelectBucketDocumentsByDocumentKindQuery = ({ bucketName, documentKind, collectionName, limit, offset }) => {
	const query = `SELECT *, META().id as docid FROM \`${bucketName}\` WHERE \`${documentKind}\` = "${collectionName}"`;
	return getQueryOptions({ query, limit, offset });
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
	getInferBucketDocumentsQuery,
	getInferCollectionDocumentsQuery,
	getSelectBucketDocumentKindQuery,
	getSelectBucketDocumentsByDocumentKindQuery,
	getSelectBucketDocumentsQuery,
	getSelectCollectionDocumentsQuery,
	getQueryOptions,
};
