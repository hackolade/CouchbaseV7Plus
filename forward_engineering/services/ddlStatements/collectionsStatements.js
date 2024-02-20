/*
 * Copyright © 2016-2024 by IntegrIT S.A. dba Hackolade.  All rights reserved.
 *
 * The copyright to the computer software herein is the property of IntegrIT S.A.
 * The software may be used and/or copied only with the written permission of
 * IntegrIT S.A. or in accordance with the terms and conditions stipulated in
 * the agreement/contract under which the software has been supplied.
 */

const { wrapWithBackticks, getFullBucketPath } = require('./commonDdlStatements');

/**
 *
 * @param {{ namespace: string, scope: string, bucket: string, collectionName: string }} collection
 * @returns {string}
 */
const getCollectionScript = ({ namespace, scope, bucket, collectionName, ifNotExists }) => {
	if (!collectionName) {
		return '';
	}

	const fullBucketPath = getFullBucketPath({ namespace, bucket });
	const fullPath = bucket && scope ? `${fullBucketPath}.${wrapWithBackticks(scope)}.` : '';
	const ifNotExistsClause = ifNotExists ? ' IF NOT EXISTS' : '';

	return `CREATE COLLECTION ${fullPath}${wrapWithBackticks(collectionName)}${ifNotExistsClause};\n\n`;
};

module.exports = {
	getCollectionScript,
};
