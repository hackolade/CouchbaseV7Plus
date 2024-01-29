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
 * @param {{ bucketName: string; limit?: number; }} param0
 * @returns {string}
 */
const getSelectBucketDocumentsQuery = ({ bucketName, limit }) => {
	return `SELECT * FROM \`${bucketName}\`` + (limit ? `LIMIT ${limit}` : '');
};

module.exports = {
	getInferBucketDocumentsQuery,
	getSelectBucketDocumentKindQuery,
	getSelectBucketDocumentsQuery,
};
