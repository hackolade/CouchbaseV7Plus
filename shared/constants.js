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
	indexAlreadyCreated: 4300,
	duplicateDocumentKey: 12009,
	authorizationFailure: 6,
};

/**
 * @enum {string}
 */
const STATUS = {
	hasError: 'hasError',
};

/**
 * @enum {string}
 */
const HOSTING = {
	capella: 'Capella',
	selfHosted: 'Self-hosted',
};

const DEFAULT_KEY_NAME = '<key>';

const DEFAULT_LIMIT = 1000;
const DEFAULT_NAME = '_default';

const NUM_SAMPLE_VALUES = 3;

const COUCHBASE_DEFAULT_KV_CONNECTION_PORT = 11210;

const DISABLED_TOOLTIP = 'Something went wrong. Please, check logs for more details';

const GET_META_REGEXP = /\(meta\(\)\.(.*?)\)/;
const GET_NODES_REGEXP = /"nodes":(\[.*?\])/;
const GET_PARTITION_HASH_REGEXP = /(HASH|hash)\((.*?)\)$/;

/**
 * @enum {string}
 */
const PK_SEGMENT_TYPE = {
	constant: 'constant',
	field: 'field',
	pattern: 'pattern',
	separator: 'separator',
};

module.exports = {
	AUTH_TYPE,
	COUCHBASE_ERROR_CODE,
	COUCHBASE_HOST_PREFIX,
	COUCHBASE_DEFAULT_KV_CONNECTION_PORT,
	DEFAULT_KEY_NAME,
	DEFAULT_LIMIT,
	DEFAULT_NAME,
	NUM_SAMPLE_VALUES,
	DISABLED_TOOLTIP,
	GET_META_REGEXP,
	GET_NODES_REGEXP,
	GET_PARTITION_HASH_REGEXP,
	HOSTING,
	STATUS,
	PK_SEGMENT_TYPE,
};
