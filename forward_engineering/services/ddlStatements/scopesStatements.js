const { wrapWithBackticks, getFullBucketPath } = require('./commonDdlStatements');

/**
 *
 * @param {object} scope
 * @returns {string}
 */
const getScopeScript = scope => {
	const { namespace, bucketName, name, ifNotExists } = scope;

	if (!bucketName || !name) {
		return '';
	}

	const fullBucketPath = getFullBucketPath({ namespace, bucketName });
	const scopeName = wrapWithBackticks(name);
	const ifNotExistsClause = ifNotExists ? ' IF NOT EXISTS' : '';

	return `CREATE SCOPE ${fullBucketPath}.${scopeName}${ifNotExistsClause};`;
};

module.exports = {
	getScopeScript,
};
