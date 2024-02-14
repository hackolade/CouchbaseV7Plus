/**
 *
 * @param {string} str
 * @returns {string}
 */
const wrapWithBackticks = str => `\`${str}\``;

/**
 *
 * @param {{namespace: string | undefined, bucket: string}} param0
 * @returns {string}
 */
const getFullBucketPath = ({ namespace, bucket }) =>
	namespace ? `${namespace}:${wrapWithBackticks(bucket)}` : wrapWithBackticks(bucket);

/**
 *
 * @param {{namespace: string | undefined, bucket: string | undefined, scope: string | undefined, collectionName: string | undefined}} param0
 * @returns {string}
 */
const getKeySpaceReference = ({ namespace, bucket, scope, collectionName }) => {
	if (!bucket) {
		return wrapWithBackticks(collectionName);
	}

	const fullBucketPath = getFullBucketPath({ namespace, bucket });

	if (!collectionName || !scope) {
		return fullBucketPath;
	}

	const collectionPath = `.${wrapWithBackticks(scope)}.${wrapWithBackticks(collectionName)}`;

	return `${fullBucketPath}${collectionPath}`;
};

module.exports = {
	wrapWithBackticks,
	getFullBucketPath,
	getKeySpaceReference,
};
