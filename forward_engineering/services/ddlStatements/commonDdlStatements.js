/*
 * Copyright © 2016-2024 by IntegrIT S.A. dba Hackolade.  All rights reserved.
 *
 * The copyright to the computer software herein is the property of IntegrIT S.A.
 * The software may be used and/or copied only with the written permission of
 * IntegrIT S.A. or in accordance with the terms and conditions stipulated in
 * the agreement/contract under which the software has been supplied.
 */

/**
 *
 * @param {string} str
 * @returns {string}
 */
const wrapWithBackticks = str => `\`${str}\``;

/**
 *
 * @param {{namespace: string, bucket: string}} param
 * @returns {string}
 */
const getFullBucketPath = ({ namespace, bucket }) =>
	namespace ? `${namespace}:${wrapWithBackticks(bucket)}` : wrapWithBackticks(bucket);

/**
 *
 * @param {{namespace: string, bucket: string, scope: string, collectionName: string}} param
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
