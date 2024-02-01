'use strict';

/**
 * @typedef {import('../shared/types').App} App
 * @typedef {import('../shared/types').AppLogger} AppLogger
 * @typedef {import('../shared/types').ConnectionInfo} ConnectionInfo
 * @typedef {import('../shared/types').Logger} Logger
 * @typedef {import('../shared/types').Callback} Callback
 */

const connectionHelper = require('./helpers/connectionHelper');
const clusterHelper = require('./helpers/clusterHelper');
const documentKindHelper = require('./helpers/documentKindHelper');
const logHelper = require('./helpers/logHelper');
const { DEFAULT_LIMIT } = require('../shared/constants');

/**
 * @param {ConnectionInfo} connectionInfo
 * @param {AppLogger} appLogger
 * @param {Callback} callback
 */
const disconnect = async (__connectionInfo, __appLogger, callback) => {
	await connectionHelper.disconnect();
	callback();
};

/**
 * @param {ConnectionInfo} connectionInfo
 * @param {AppLogger} appLogger
 * @param {Callback} callback
 * @param {App} app
 */
const testConnection = async (connectionInfo, __appLogger, callback, app) => {
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
 * @param {AppLogger} appLogger
 * @param {Callback} callback
 * @param {App} app
 */
const getDocumentKinds = async (connectionInfo, appLogger, callback, app) => {
	const logger = logHelper.createLogger({
		title: 'Retrieving bucket default collection document kinds',
		hiddenKeys: connectionInfo.hiddenKeys,
		logger: appLogger,
	});
	try {
		const cluster = await connectionHelper.connect({ connectionInfo, app });
		const bucketsDocumentKindList = await documentKindHelper.getBucketsDocumentKindList({
			cluster,
			connectionInfo,
			logger,
			app,
		});
		callback(null, bucketsDocumentKindList);
	} catch (error) {
		logger.error(error);
		await connectionHelper.disconnect();
		callback(error, []);
	}
};

/**
 * @param {ConnectionInfo} connectionInfo
 * @param {AppLogger} appLogger
 * @param {Callback} callback
 * @param {App} app
 */
const getDbCollectionsNames = async (connectionInfo, appLogger, callback, app) => {
	const logger = logHelper.createLogger({
		title: 'Retrieving databases and collections information',
		hiddenKeys: connectionInfo.hiddenKeys,
		logger: appLogger,
	});

	try {
		const cluster = await connectionHelper.connect({ connectionInfo, app });
		const documents = await clusterHelper.getDbCollectionsNames({ connectionInfo, cluster, logger, app });

		callback(null, documents);
	} catch (error) {
		logger.error(error);
		await connectionHelper.disconnect();
		callback(error);
	}
};

/**
 * @param {any} data
 * @param {AppLogger} appLogger
 * @param {Callback} callback
 * @param {App} app
 */
const getDbCollectionsData = async (data, appLogger, callback, app) => {
	const logger = logHelper.createLogger({
		title: 'Retrieving data for inferring schema',
		hiddenKeys: data.hiddenKeys,
		logger: appLogger,
	});

	try {
		const cluster = await connectionHelper.connect({ connectionInfo: data.connectionInfo, app });
		const collectionVersion = data.collectionData.collectionVersion;

		const dbCollectionsData = [];

		for (const bucketName in collectionVersion) {
			for (const scopeName in collectionVersion[bucketName]) {
				for (const collectionName of collectionVersion[bucketName][scopeName]) {
					const dbCollectionData = await clusterHelper.getDbCollectionData({
						cluster,
						data,
						bucketName,
						scopeName,
						collectionName,
						logger,
						app,
					});

					dbCollectionsData.push(dbCollectionData);
				}
			}
		}

		callback(null, dbCollectionsData);
	} catch (error) {
		callback(error);
	} finally {
		await connectionHelper.disconnect();
	}
};

module.exports = {
	disconnect,
	getDbCollectionsNames,
	getDbCollectionsData,
	getDocumentKinds,
	testConnection,
};
