'use strict';

/**
 * @typedef {import('../shared/types').App} App
 * @typedef {import('../shared/types').AppLogger} AppLogger
 * @typedef {import('../shared/types').ConnectionInfo} ConnectionInfo
 * @typedef {import('../shared/types').Logger} Logger
 * @typedef {import('../shared/types').Callback} Callback
 */

const fs = require('fs');
const _ = require('lodash');
const connectionHelper = require('./helpers/connectionHelper');
const clusterHelper = require('./helpers/clusterHelper');
const indexHelper = require('./helpers/indexHelper');
const logHelper = require('./helpers/logHelper');
const parserHelper = require('./helpers/parserHelper');
const schemaHelper = require('./helpers/schemaHelper');

/**
 * @param {string} filePath
 * @returns {Promise<string>}
 */
const handleFileData = filePath => {
	return new Promise((resolve, reject) => {
		fs.readFile(filePath, 'utf-8', (err, content) => {
			if (err) {
				reject(err);
			} else {
				resolve(content);
			}
		});
	});
};

/**
 * @param {ConnectionInfo} __connectionInfo
 * @param {AppLogger} __appLogger
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
const testConnection = async (connectionInfo, appLogger, callback, app) => {
	const logger = logHelper.createLogger({
		title: 'Test database connection',
		hiddenKeys: connectionInfo.hiddenKeys,
		logger: appLogger,
	});
	try {
		await connectionHelper.disconnect();
		await connectionHelper.connect({ connectionInfo, app });
		await connectionHelper.disconnect();
		callback();
	} catch (error) {
		logger.error(error);
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
	try {
		callback(null, []);
	} catch (error) {
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
 * @param {object} data
 * @param {AppLogger} appLogger
 * @param {Callback} callback
 * @param {App} app
 */
const getDbCollectionsData = async (data, appLogger, callback, app) => {
	const logger = logHelper.createLogger({
		title: 'Retrieving databases and collections',
		hiddenKeys: data.hiddenKeys,
		logger: appLogger,
	});

	try {
		const connectionInfo = data.connectionInfo;
		const includeEmptyCollection = data.includeEmptyCollection;
		const cluster = await connectionHelper.connect({ connectionInfo, app });
		const indexes = await indexHelper.getIndexes({ cluster, connectionInfo, logger, app });
		const selectedCollections = await clusterHelper.getSelectedCollections({ cluster, data, logger, app });
		const indexesByCollectionMap = indexHelper.getIndexesByCollectionMap({ indexes });
		const dbCollectionsData = [];

		for (const bucketName in selectedCollections) {
			for (const scopeName in selectedCollections[bucketName]) {
				for (const collectionName of selectedCollections[bucketName][scopeName]) {
					const collectionIndexes = indexesByCollectionMap[bucketName]?.[scopeName]?.[collectionName];
					const dbCollectionData = await clusterHelper.getDbCollectionData({
						cluster,
						data,
						bucketName,
						scopeName,
						collectionName,
						collectionIndexes,
						includeEmptyCollection,
						logger,
						app,
					});

					dbCollectionsData.push(dbCollectionData);
				}
			}
		}

		const updatedDbCollectionsData = schemaHelper.updateDefaultDbNames({ dbCollectionsData });
		await connectionHelper.disconnect();
		callback(null, updatedDbCollectionsData);
	} catch (error) {
		await connectionHelper.disconnect();
		callback(error);
	}
};

/**
 * @param {object} data
 * @param {AppLogger} appLogger
 * @param {Callback} callback
 */
const reFromFile = async (data, appLogger, callback) => {
	const logger = logHelper.createLogger({
		title: 'Retrieving data from file',
		hiddenKeys: data.hiddenKeys,
		logger: appLogger,
	});
	try {
		const statements = await handleFileData(data.filePath);
		const { scopes, collections, indexes } = parserHelper.parseN1qlStatements({ statements });
		const indexesByCollectionMap = indexHelper.getIndexesByCollectionMap({ indexes });
		const scopeBucketNameMap = scopes.reduce(
			(result, scope) => _.set(result, [scope.bucketName, scope.scopeName], scope),
			{},
		);
		const emptyScopes = scopes.filter(scope =>
			collections.every(
				collection => collection.bucketName !== scope.bucketName || collection.scopeName !== scope.scopeName,
			),
		);
		const bucketIndexes = indexes.filter(index =>
			collections.every(
				collection =>
					collection.bucketName !== index.bucketName &&
					collection.scopeName !== index.scopeName &&
					collection.collectionName !== index.collectionName,
			),
		);
		const schemas = schemaHelper.mapParsedResultToMultipleSchema({
			entitiesData: collections,
			indexesByCollectionMap,
			scopeBucketNameMap,
		});
		const emptySchemas = schemaHelper.mapParsedResultToMultipleSchema({
			entitiesData: emptyScopes,
			indexesByCollectionMap,
			scopeBucketNameMap,
		});
		const defaultSchemas = schemaHelper.mapParsedResultToMultipleSchema({
			entitiesData: _.uniqBy(bucketIndexes, 'bucketName'),
			indexesByCollectionMap,
			scopeBucketNameMap,
		});

		return callback(null, [...schemas, ...emptySchemas, ...defaultSchemas], {}, [], 'multipleSchema');
	} catch (error) {
		logger.error(error);
		return callback(error);
	}
};

module.exports = {
	disconnect,
	getDbCollectionsNames,
	getDbCollectionsData,
	getDocumentKinds,
	testConnection,
	reFromFile,
};
