/**
 * @typedef {import('../types').App} App
 * @typedef {import('../types').Cluster} Cluster
 * @typedef {import('../types').ConnectionInfo} ConnectionInfo
 * @typedef {import('../types').ConnectionParams} ConnectionParams
 */

const clusterHelper = require('./clusterHelper');
const { AUTH_TYPE, COUCHBASE_HOST_PREFIX, COUCHBASE_DEFAULT_KV_CONNECTION_PORT } = require('../constants');

let cluster = null;

/**
 * @param {{ connectionInfo: ConnectionInfo }} param0
 * @returns {boolean}
 */
const isCloudStorage = ({ connectionInfo }) => {
	return connectionInfo.host.startsWith(COUCHBASE_HOST_PREFIX.cloud);
};

/**
 * @param {{ connectionInfo: ConnectionInfo }} param0
 * @returns {string}
 */
const generateUrl = ({ connectionInfo }) => {
	if (isCloudStorage({ connectionInfo })) {
		return connectionInfo.host;
	}

	const keyValuePort = connectionInfo.kv_port || COUCHBASE_DEFAULT_KV_CONNECTION_PORT;

	return `${COUCHBASE_HOST_PREFIX.selfHosted}${connectionInfo.host}:${keyValuePort}`;
};

/**
 * @param {{ connectionInfo: ConnectionInfo }}
 * @returns {ConnectionParams}
 */
const generateConnectionParams = ({ connectionInfo }) => {
	if (connectionInfo.authType === AUTH_TYPE.securityCertificate) {
		return {
			url: generateUrl({ connectionInfo }),
			options: {
				authenticator: {
					certificatePath: connectionInfo.security_certificate,
					keyPath: connectionInfo.security_certificate_key,
				},
			},
		};
	}

	return {
		url: generateUrl({ connectionInfo }),
		options: {
			username: connectionInfo.couchbase_username,
			password: connectionInfo.couchbase_password,
		},
	};
};

/**
 * @param {{ connectionInfo: ConnectionInfo, app: App }} param0
 * @throws {Error}
 * @returns {Promise<Cluster>}
 */
const connect = async ({ connectionInfo, app }) => {
	if (cluster) {
		return cluster;
	}
	const couchbase = app.require('couchbase');
	const { url, options } = generateConnectionParams({ connectionInfo });
	cluster = await couchbase.connect(url, options);
	const buckets = await clusterHelper.getAllBuckets({ cluster });
	const selectedBucket = connectionInfo.couchbase_bucket;

	if (selectedBucket && !buckets.includes(selectedBucket)) {
		throw new Error(`Bucket ${selectedBucket} doesn't exist`);
	}

	return cluster;
};

/**
 * @returns {Promise<void>}
 */
const disconnect = async () => {
	await cluster?.close();
	cluster = null;
};

module.exports = {
	connect,
	disconnect,
};
