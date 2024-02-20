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
 * @param {object} scope
 * @returns {string}
 */
const getScopeScript = scope => {
	const { namespace, bucket, name, ifNotExists } = scope;

	if (!bucket || !name) {
		return '';
	}

	const fullBucketPath = getFullBucketPath({ namespace, bucket });
	const scopeName = wrapWithBackticks(name);
	const ifNotExistsClause = ifNotExists ? ' IF NOT EXISTS' : '';

	return `CREATE SCOPE ${fullBucketPath}.${scopeName}${ifNotExistsClause};`;
};

module.exports = {
	getScopeScript,
};
