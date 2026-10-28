const { wrapWithBackticks, getFullBucketPath } = require('./commonStatements');

/**
 * maxTTL 0 means "inherit from the bucket", the same as no WITH clause.
 *
 * @param {{ maxTTL?: number | string }} param
 * @returns {string}
 */
const getMaxTTLClause = ({ maxTTL }) => {
	const value = typeof maxTTL === 'string' && maxTTL.trim() ? Number(maxTTL) : maxTTL;

	if (!Number.isInteger(value) || value === 0) {
		return '';
	}

	return ` WITH {"maxTTL": ${value}}`;
};

/**
 *
 * @param {{
 *   namespace: string,
 *   scopeName: string,
 *   bucketName: string,
 *   collectionName: string,
 *   ifNotExists?: boolean,
 *   maxTTL?: number | string
 * }} collection
 * @returns {string}
 */
const getCollectionScript = ({ namespace, scopeName, bucketName, collectionName, ifNotExists, maxTTL }) => {
	if (!collectionName) {
		return '';
	}

	const fullBucketPath = getFullBucketPath({ namespace, bucketName });
	const fullPath = bucketName && scopeName ? `${fullBucketPath}.${wrapWithBackticks(scopeName)}.` : '';
	const ifNotExistsClause = ifNotExists ? ' IF NOT EXISTS' : '';
	const maxTTLClause = getMaxTTLClause({ maxTTL });

	return `CREATE COLLECTION ${fullPath}${wrapWithBackticks(collectionName)}${ifNotExistsClause}${maxTTLClause};\n\n`;
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
