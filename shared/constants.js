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

/**
 * @enum {number}
 */
const COUCHBASE_ERROR_CODE = {
	bucketIsEmpty: 0,
	primaryIndexDoesNotExist: 4000,
	n1qlMethodsAreNotSupported: 19,
	userDoesNotHaveAccessToPrivilegeCluster: 13014,
	parseSyntaxError: 3000,
	inferMethodIsNotSupport: 16003,
	collectionDoesNotExist: 12003,
};

/**
 * @enum {string}
 */
const STATUS = {
	hasError: 'hasError',
};

const DEFAULT_DOCUMENT_KIND = '*';
const COUCHBASE_DEFAULT_KV_CONNECTION_PORT = 11210;
const DISABLED_TOOLTIP = 'Something went wrong. Please, check logs for more details';
const DEFAULT_NAME = '_default';
const FLAVOR_REGEX = /([\s\S]*?) \= "?([\s\S]*?)"?$/;
const DEFAULT_LIMIT = 1000;

module.exports = {
	AUTH_TYPE,
	COUCHBASE_ERROR_CODE,
	COUCHBASE_HOST_PREFIX,
	COUCHBASE_DEFAULT_KV_CONNECTION_PORT,
	DEFAULT_DOCUMENT_KIND,
	DEFAULT_LIMIT,
	DEFAULT_NAME,
	DISABLED_TOOLTIP,
	FLAVOR_REGEX,
	STATUS,
};
