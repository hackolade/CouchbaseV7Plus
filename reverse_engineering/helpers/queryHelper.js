/**
 * @param {{
 * bucketName: string;
 * documentKind: string;
 * }} param0
 * @returns {string}
 */
const getSelectBucketDocumentKindQuery = ({ bucketName, documentKind }) => {
	return `SELECT ${documentKind} FROM \`${bucketName}\` WHERE ${documentKind} IS NOT MISSING GROUP BY ${documentKind}`;
};

const getInferBucketDocumentsQuery = ({ bucketName }) => {
	return `INFER \`${bucketName}\` WITH {"sample_size": 1000,"num_sample_values":3};`;
};

const getSelectBucketDocumentsQuery = ({ bucketName, limit }) => {
	return `SELECT * FROM \`${bucketName}\`` + (limit ? `LIMIT ${limit}` : '');
};

module.exports = {
	getInferBucketDocumentsQuery,
	getSelectBucketDocumentKindQuery,
	getSelectBucketDocumentsQuery,
};
