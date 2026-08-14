const { wrapWithBackticks, getFullBucketPath } = require('./commonStatements');

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

/**
 *
 * @param {{
 *   namespace: string,
 *   bucketName: string,
 *   name: string,
 *   ifExists?: boolean
 * }} scope
 * @returns {string}
 */
const getDropScopeScript = ({ namespace, bucketName, name, ifExists }) => {
	if (!bucketName || !name) {
		return '';
	}

	const fullBucketPath = getFullBucketPath({ namespace, bucketName });
	const scopeName = wrapWithBackticks(name);
	const ifExistsClause = ifExists ? ' IF EXISTS' : '';

	return `DROP SCOPE ${fullBucketPath}.${scopeName}${ifExistsClause};`;
};

module.exports = {
	getScopeScript,
	getDropScopeScript,
};
