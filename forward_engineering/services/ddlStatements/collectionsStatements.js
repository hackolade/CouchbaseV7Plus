const { wrapWithBackticks, getFullBucketPath } = require('./commonDdlStatements');

/**
 *
 * @param {object} collection
 * @returns {string}
 */
const getCollectionScript = collection => {
	const { namespace, bucketName: scopeName, bucket: couchbaseBucketName, collectionName } = collection;

	if (!collectionName) {
		return '';
	}

	const fullBucketPath = getFullBucketPath({ namespace, bucket: couchbaseBucketName });
	const bucketAndScope = couchbaseBucketName && scopeName ? `${fullBucketPath}.${wrapWithBackticks(scopeName)}.` : '';
	const ifNotExistsClause = collection.ifNotExists ? ' IF NOT EXISTS' : '';

	return `CREATE COLLECTION ${bucketAndScope}${wrapWithBackticks(collectionName)}${ifNotExistsClause};\n\n`;
};

module.exports = {
	getCollectionScript,
};
