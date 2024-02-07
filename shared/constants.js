/**
 * @enum {string}
 */
const AUTH_TYPE = {
	usernamePassword: 'username_password',
	securityCertificate: 'security_certificate',
};

/**
 * @enum {string}
 */
const COUCHBASE_HOST_PREFIX = {
	selfHosted: 'couchbase://',
	cloud: 'couchbases://',
};

const COUCHBASE_DEFAULT_KV_CONNECTION_PORT = 11210;

module.exports = {
	AUTH_TYPE,
	COUCHBASE_HOST_PREFIX,
	COUCHBASE_DEFAULT_KV_CONNECTION_PORT,
};
