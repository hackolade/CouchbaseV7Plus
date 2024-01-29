'use strict';

/**
 * @typedef {import('../shared/types').App} App
 * @typedef {import('../shared/types').ConnectionInfo} ConnectionInfo
 * @typedef {import('../shared/types').Logger} Logger
 * @typedef {import('../shared/types').Callback} Callback
 */

const connectionHelper = require('./helpers/connectionHelper');
const clusterHelper = require('./helpers/clusterHelper');
const documentKindHelper = require('./helpers/documentKindHelper');
const logHelper = require('./helpers/logHelper');

/**
 * @param {ConnectionInfo} connectionInfo
 * @param {Logger} logger
 * @param {Callback} callback
 */
const disconnect = async (__connectionInfo, __logger, callback) => {
	await connectionHelper.disconnect();
	callback();
};

/**
 * @param {ConnectionInfo} connectionInfo
 * @param {Logger} logger
 * @param {Callback} callback
 * @param {App} app
 */
const testConnection = async (connectionInfo, __logger, callback, app) => {
	try {
		await connectionHelper.disconnect();
		await connectionHelper.connect({ connectionInfo, app });
		await connectionHelper.disconnect();
		callback();
	} catch (error) {
		callback(error);
	}
};

/**
 * @param {ConnectionInfo} connectionInfo
 * @param {Logger} logger
 * @param {Callback} callback
 * @param {App} app
 */
const getDocumentKinds = async (connectionInfo, logger, callback, app) => {
	const log = logHelper.createLogger({
		title: 'Retrieving bucket default collection document kinds',
		hiddenKeys: connectionInfo.hiddenKeys,
		logger,
	});
	try {
		const cluster = await connectionHelper.connect({ connectionInfo, app });
		const bucketsDocumentKindList = await documentKindHelper.getBucketsDocumentKindList({
			cluster,
			connectionInfo,
			log,
		});
		callback(null, bucketsDocumentKindList);
	} catch (error) {
		log.error(error);
		await connectionHelper.disconnect();
		callback(error, []);
	}
};

/**
 * @param {ConnectionInfo} connectionInfo
 * @param {Logger} logger
 * @param {Callback} callback
 * @param {App} app
 */
const getDbCollectionsNames = async (connectionInfo, logger, callback, app) => {
	const log = logHelper.createLogger({
		title: 'Retrieving databases and collections information',
		hiddenKeys: connectionInfo.hiddenKeys,
		logger,
	});

	try {
		const cluster = await connectionHelper.connect({ connectionInfo, app });
		const documents = await clusterHelper.getDbCollectionsNames({ connectionInfo, cluster, log });

		callback(null, documents);
	} catch (error) {
		log.error(error);
		connectionHelper.disconnect();
		callback(error);
	}
};

/**
 * @param {any} data
 * @param {Logger} logger
 * @param {Callback} callback
 * @param {App} app
 */
const getDbCollectionsData = async (data, logger, callback, app) => {
	const log = logHelper.createLogger({
		title: 'Retrieving data for inferring schema',
		hiddenKeys: data.hiddenKeys,
		logger,
	});

	callback(null, []);
};

module.exports = {
	disconnect,
	getDbCollectionsNames,
	getDbCollectionsData,
	getDocumentKinds,
	testConnection,
};
