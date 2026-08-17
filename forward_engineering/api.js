/**
 * @typedef {import('../shared/types').App} App
 * @typedef {import('../shared/types').AppLogger} AppLogger
 * @typedef {import('../shared/types').ConnectionInfo} ConnectionInfo
 * @typedef {import('../shared/types').Logger} Logger
 * @typedef {import('../shared/types').Callback} Callback
 */

const { first } = require('lodash');
const connectionHelper = require('../shared/helpers/connectionHelper');
const clusterHelper = require('../shared/helpers/clusterHelper');
const logHelper = require('../shared/helpers/logHelper');
const {
	COUCHBASE_APPLY_TO_INSTANCE,
	CONTAINER_DATA_NOT_FOUND,
	CONNECTING,
	THERE_IS_AN_ISSUE_WHILE_CONNECTING_TO_THE_INSTANCE,
	ERROR_HAS_BEEN_THROWN_WHILE_CONNECTING_TO_BUCKET,
	ERROR_HAS_BEEN_THROWN_WHILE_CREATING_BUCKET_IN_COUCHBASE_INSTANCE,
	ERROR_HAS_BEEN_THROWN_WHILE_APPLYING_SCRIPT_TO_COUCHBASE_INSTANCE,
	CREATING_A_BUCKET,
} = require('../shared/enums/staticMessages');
const {
	getCheckBucketExistsMessage,
	getCreatingBucketMessage,
	getSuccessfullyCreatedBucketMessage,
} = require('../shared/enums/dynamicMessages');
const { HTTP_ERROR_CODES } = require('../shared/enums/httpCodes');
const { applyScript, logApplyScriptAttempt } = require('./services/applyToInstanceService');
const { hasDropStatements } = require('./services/alterScriptBuilder');
const { generateContainerScript } = require('./generateContainerScript');
const { generateScript } = require('./generateScript');

/**
 * @param {ConnectionInfo} connectionInfo
 * @param {AppLogger} _logger
 * @param {Callback} callback
 */
const isDropInStatements = (connectionInfo, _logger, callback) => {
	callback(null, hasDropStatements({ connectionInfo }));
};

/**
 * @param {ConnectionInfo} connectionInfo
 * @param {AppLogger} appLogger
 * @param {Callback} callback
 * @param {App} app
 */
const applyToInstance = async (connectionInfo, appLogger, callback, app) => {
	const logger = logHelper.createLogger({
		title: COUCHBASE_APPLY_TO_INSTANCE,
		hiddenKeys: connectionInfo.hiddenKeys,
		logger: appLogger,
	});

	logger.info(COUCHBASE_APPLY_TO_INSTANCE);
	logger.progress(CONNECTING);

	let cluster;
	try {
		cluster = await connectionHelper.connect({ connectionInfo, app });
	} catch (err) {
		logger.error(err);
		logger.progress(THERE_IS_AN_ISSUE_WHILE_CONNECTING_TO_THE_INSTANCE);
		return callback(logHelper.createError(err));
	}

	const containerData = first(connectionInfo.containerData);

	if (!containerData) {
		const err = new Error(CONTAINER_DATA_NOT_FOUND);
		logger.error(err);
		logger.progress(ERROR_HAS_BEEN_THROWN_WHILE_CONNECTING_TO_BUCKET);
		return callback(err);
	}

	const bucketName = containerData?.bucket;
	const scriptWithSamples = connectionInfo.script;

	logger.progress(getCheckBucketExistsMessage(bucketName));

	const buckets = await clusterHelper.getAllBuckets({ cluster });
	const bucketExists = buckets.find(bucket => bucket.name === bucketName);
	if (!bucketExists) {
		try {
			logger.info(getCreatingBucketMessage(bucketName));
			logger.progress(CREATING_A_BUCKET);
			await clusterHelper.createNewBucket({ bucketName, cluster });
			logger.info(getSuccessfullyCreatedBucketMessage(bucketName));
		} catch (err) {
			if (err.context?.response_code !== HTTP_ERROR_CODES.badRequest) {
				logger.error(err);
				logger.progress(ERROR_HAS_BEEN_THROWN_WHILE_CREATING_BUCKET_IN_COUCHBASE_INSTANCE);
				return callback(logHelper.createError(err));
			}

			logger.error(err);
		}
	}

	logApplyScriptAttempt({ bucketName, logger });
	try {
		applyScript({
			bucketName,
			script: scriptWithSamples,
			logger,
			callback,
			cluster,
		});
	} catch (err) {
		logger.error(err);
		logger.progress(ERROR_HAS_BEEN_THROWN_WHILE_APPLYING_SCRIPT_TO_COUCHBASE_INSTANCE);
		return callback(logHelper.createError(err));
	}
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

module.exports = {
	generateContainerScript,
	generateScript,
	isDropInStatements,
	applyToInstance,
	testConnection,
};
