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

	return `CREATE COLLECTION ${fullPath}${wrapWithBackticks(collectionName)}${ifNotExistsClause};`;
};

module.exports = {
	getCollectionScript,
};
