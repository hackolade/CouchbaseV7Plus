/**
 *
 * @param {string} str
 * @returns {string}
 */
const wrapWithBackticks = str => `\`${str}\``;

/**
 *
 * @param {{statements: string[], separator: string}} param
 * @returns {string}
 */
const joinStatements = ({ statements, separator = '\n\t' }) => `${statements.filter(Boolean).join(separator)}`;

/**
 *
 * @param {{namespace: string, bucketName: string}} param
 * @returns {string}
 */
const getFullBucketPath = ({ namespace, bucketName }) =>
	namespace ? `${namespace}:${wrapWithBackticks(bucketName)}` : wrapWithBackticks(bucketName);

/**
 *
 * @param {{namespace: string, bucketName: string, scopeName: string, collectionName: string}} param
 * @returns {string}
 */
const getKeySpaceReference = ({ namespace, bucketName, scopeName, collectionName }) => {
	if (!bucketName) {
		return wrapWithBackticks(collectionName);
	}

	const fullBucketPath = getFullBucketPath({ namespace, bucketName });

	if (!collectionName || !scopeName) {
		return fullBucketPath;
	}

	const collectionPath = `.${wrapWithBackticks(scopeName)}.${wrapWithBackticks(collectionName)}`;

	return `${fullBucketPath}${collectionPath}`;
};

module.exports = {
	wrapWithBackticks,
	getFullBucketPath,
	getKeySpaceReference,
	joinStatements,
};
