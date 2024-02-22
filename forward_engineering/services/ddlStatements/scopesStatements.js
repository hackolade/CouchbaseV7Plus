const { wrapWithBackticks, getFullBucketPath } = require('./commonDdlStatements');

/**
 *
 * @param {{ namespace: string, bucketName: string, name: string, ifNotExists: boolean }} scope
 * @returns {string}
 */
const getScopeScript = ({ namespace, bucketName, name, ifNotExists }) => {
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
