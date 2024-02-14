const { wrapWithBackticks, getFullBucketPath } = require('./commonDdlStatements');

/**
 *
 * @param {object} scope
 * @returns {string}
 */
const getScopeScript = scope => {
	const { namespace, bucket, name, ifNotExists } = scope;

	if (!name) {
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
