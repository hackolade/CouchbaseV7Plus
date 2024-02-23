/**
 * @typedef {import('../shared/types').App} App
 * @typedef {import('../shared/types').AppLogger} AppLogger
 * @typedef {import('../shared/types').ConnectionInfo} ConnectionInfo
 * @typedef {import('../shared/types').Logger} Logger
 * @typedef {import('../shared/types').Callback} Callback
 */

const _ = require('lodash');
const { backOff } = require('exponential-backoff');
const connectionHelper = require('../shared/helpers/connectionHelper');
const clusterHelper = require('../shared/helpers/clusterHelper');
const logHelper = require('../shared/helpers/logHelper');
const {
	COUCHBASE_APPLY_TO_INSTANCE,
	CONTAINER_DATA_NOT_FOUND,
	CONNECTING,
	ERROR_HAS_BEEN_THROWN_WHILE_CONNECTING_TO_BUCKET,
	ERROR_HAS_BEEN_THROWN_WHILE_CREATING_BUCKET_IN_COUCHBASE_INSTANCE,
	ERROR_HAS_BEEN_THROWN_WHILE_APPLYING_SCRIPT_TO_COUCHBASE_INSTANCE,
	GENERATING_CONTAINER_SCRIPT,
	GENERATING_ENTITY_SCRIPT,
	CREATING_A_BUCKET,
} = require('../shared/enums/static-messages');
const {
	getCheckBucketExistsMessage,
	getCreatingBucketMessage,
	getSuccessfullyCreatedBucketMessage,
} = require('../shared/enums/dynamic-messages');
const { HTTP_ERROR_CODES } = require('../shared/enums/http');

const { applyScript, logApplyScriptAttempt } = require('./services/applyToInstanceService');
const ForwardEngineeringScriptBuilder = require('./services/forwardEngineeringScriptBuilder');

const MAX_APPLY_ATTEMPTS = 5;
const DEFAULT_START_DELAY = 1000;

const includeSamples = (additionalOptions = []) =>
	Boolean(additionalOptions.find(option => option.id === 'INCLUDE_SAMPLES' && option.value));

/**
 * @param {ConnectionInfo} connectionInfo
 * @param {AppLogger} appLogger
 * @param {Callback} callback
 * @param {App} app
 */
const generateContainerScript = async (connectionInfo, appLogger, callback, app) => {
	const logger = logHelper.createLogger({
		title: GENERATING_CONTAINER_SCRIPT,
		hiddenKeys: connectionInfo.hiddenKeys,
		logger: appLogger,
	});

	try {
		const scriptBuilder = new ForwardEngineeringScriptBuilder();

		const { jsonData, collections, options } = connectionInfo;
		const { origin, additionalOptions } = options;
		const [rawScope] = connectionInfo.containerData;
		const scope = {
			...rawScope,
			bucketName: rawScope.bucket,
		};
		const collectionsData = collections.map(schema => ({
			...JSON.parse(schema),
			namespace: scope.namespace,
			bucketName: scope.bucketName,
			scopeName: scope.name,
		}));

		scriptBuilder.addScopeScript(scope);
		collectionsData.forEach(collection => scriptBuilder.addCollectionScripts(collection));

		if (!includeSamples(additionalOptions)) {
			const { script } = scriptBuilder.buildScriptSeparateFromInsertScripts();
			return callback(null, script);
		}

		scriptBuilder.addContainerInsertScripts({ collections: collectionsData, jsonData });

		if (origin !== 'ui') {
			return callback(null, scriptBuilder.buildScriptConcatenatedWithInsertScripts('\n\n'));
		}

		const { script, insertScripts } = scriptBuilder.buildScriptSeparateFromInsertScripts();
		callback(null, [
			{ title: 'Couchbase script', script },
			{
				title: 'Sample data',
				script: insertScripts,
			},
		]);
	} catch (error) {
		logger.error(error);

		callback({ message: error.message, stack: error.stack });
	}
};

/**
 * @param {ConnectionInfo} connectionInfo
 * @param {AppLogger} appLogger
 * @param {Callback} callback
 * @param {App} app
 */
const generateScript = async (connectionInfo, appLogger, callback, app) => {
	const logger = logHelper.createLogger({
		title: GENERATING_ENTITY_SCRIPT,
		hiddenKeys: connectionInfo.hiddenKeys,
		logger: appLogger,
	});

	try {
		const scriptBuilder = new ForwardEngineeringScriptBuilder();

		const { jsonData, jsonSchema, containerData, options } = connectionInfo;
		const { additionalOptions } = options;
		const scope = _.get(containerData, '[0]', {});
		const rawCollectionData = JSON.parse(jsonSchema);
		const collectionData = {
			...rawCollectionData,
			namespace: scope?.namespace,
			bucketName: scope?.bucket,
			scopeName: scope?.name,
			collectionName: rawCollectionData.title,
		};

		scriptBuilder.addCollectionScripts(collectionData);
		if (!includeSamples(additionalOptions)) {
			const { script } = scriptBuilder.buildScriptSeparateFromInsertScripts();
			return callback(null, script);
		}

		scriptBuilder.addCollectionInsertScripts({
			jsonData,
			collection: collectionData,
		});

		callback(null, scriptBuilder.buildScriptConcatenatedWithInsertScripts('\n\n'));
	} catch (error) {
		logger.error(error);

		callback({ message: error.message, stack: error.stack });
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
	const cluster = await connectionHelper.connect({ connectionInfo, app });

	const containerData = _.first(connectionInfo.containerData);

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
				return callback(err);
			}

			logger.error(err);
		}
	}

	logApplyScriptAttempt({ bucketName, logger });
	try {
		await backOff(
			() =>
				applyScript({
					script: scriptWithSamples,
					logger,
					callback,
					cluster,
				}),
			{
				numOfAttempts: MAX_APPLY_ATTEMPTS,
				retry: (err, attemptNumber) => {
					logApplyScriptAttempt({ attemptNumber, bucketName, logger });
				},
				startingDelay: DEFAULT_START_DELAY,
			},
		);
	} catch (err) {
		logger.error(err);
		logger.progress(ERROR_HAS_BEEN_THROWN_WHILE_APPLYING_SCRIPT_TO_COUCHBASE_INSTANCE);
		return callback(err);
	}
};

/**
 * @param {ConnectionInfo} connectionInfo
 * @param {AppLogger} logger
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
	applyToInstance,
	testConnection,
};
