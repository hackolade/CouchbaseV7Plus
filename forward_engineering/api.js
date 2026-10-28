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
const { getDeltaBucketNames, getDeltaSchema } = require('./services/alterScript/deltaSchemaHelper');
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
 * An alter script generated from a Delta Model has no container data:
 * its buckets come from the delta schema.
 *
 * @param {{ connectionInfo: ConnectionInfo }} params
 * @returns {string[]}
 */
const getTargetBucketNames = ({ connectionInfo }) => {
	const containerBucket = first(connectionInfo.containerData)?.bucket;

	if (containerBucket) {
		return [containerBucket];
	}

	return getDeltaBucketNames({ schema: getDeltaSchema({ connectionInfo }) });
};

/**
 * @param {{ bucketName: string, buckets: object[], cluster: object, logger: Logger }} params
 * @returns {Promise<Error | undefined>}
 */
const ensureBucketExists = async ({ bucketName, buckets, cluster, logger }) => {
	logger.progress(getCheckBucketExistsMessage(bucketName));

	if (buckets.some(bucket => bucket.name === bucketName)) {
		return;
	}

	try {
		logger.info(getCreatingBucketMessage(bucketName));
		logger.progress(CREATING_A_BUCKET);
		await clusterHelper.createNewBucket({ bucketName, cluster });
		logger.info(getSuccessfullyCreatedBucketMessage(bucketName));
	} catch (err) {
		logger.error(err);

		if (err.context?.response_code !== HTTP_ERROR_CODES.badRequest) {
			logger.progress(ERROR_HAS_BEEN_THROWN_WHILE_CREATING_BUCKET_IN_COUCHBASE_INSTANCE);
			return err;
		}
	}
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

	const bucketNames = getTargetBucketNames({ connectionInfo });

	if (bucketNames.length === 0) {
		const err = new Error(CONTAINER_DATA_NOT_FOUND);
		logger.error(err);
		logger.progress(ERROR_HAS_BEEN_THROWN_WHILE_CONNECTING_TO_BUCKET);
		return callback(err);
	}

	const scriptWithSamples = connectionInfo.script;
	const buckets = await clusterHelper.getAllBuckets({ cluster });

	const bucketErrors = await Promise.all(
		bucketNames.map(bucketName => ensureBucketExists({ bucketName, buckets, cluster, logger })),
	);
	const bucketError = bucketErrors.find(Boolean);

	if (bucketError) {
		return callback(logHelper.createError(bucketError));
	}

	const bucketName = bucketNames.join(', ');
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
