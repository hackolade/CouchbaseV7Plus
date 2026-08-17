const { wrapWithBackticks, getFullBucketPath } = require('./commonStatements');

/**
 *
 * @param {{ namespace: string, scopeName: string, bucketName: string, collectionName: string }} collection
 * @returns {string}
 */
const getCollectionScript = ({ namespace, scopeName, bucketName, collectionName, ifNotExists }) => {
	if (!collectionName) {
		return '';
	}

	const fullBucketPath = getFullBucketPath({ namespace, bucketName });
	const fullPath = bucketName && scopeName ? `${fullBucketPath}.${wrapWithBackticks(scopeName)}.` : '';
	const ifNotExistsClause = ifNotExists ? ' IF NOT EXISTS' : '';

	return `CREATE COLLECTION ${fullPath}${wrapWithBackticks(collectionName)}${ifNotExistsClause};\n\n`;
};

/**
 *
 * @param {{
 *   namespace: string,
 *   scopeName: string,
 *   bucketName: string,
 *   collectionName: string,
 *   ifExists?: boolean
 * }} collection
 * @returns {string}
 */
const getDropCollectionScript = ({ namespace, scopeName, bucketName, collectionName, ifExists }) => {
	if (!collectionName) {
		return '';
	}

	const fullBucketPath = getFullBucketPath({ namespace, bucketName });
	const fullPath = bucketName && scopeName ? `${fullBucketPath}.${wrapWithBackticks(scopeName)}.` : '';
	const ifExistsClause = ifExists ? ' IF EXISTS' : '';

	return `DROP COLLECTION ${fullPath}${wrapWithBackticks(collectionName)}${ifExistsClause};`;
};

module.exports = {
	getCollectionScript,
	getDropCollectionScript,
};
