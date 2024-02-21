/**
 * @typedef {import('../shared/types').App} App
 * @typedef {import('../shared/types').AppLogger} AppLogger
 * @typedef {import('../shared/types').ConnectionInfo} ConnectionInfo
 * @typedef {import('../shared/types').Logger} Logger
 * @typedef {import('../shared/types').Callback} Callback
 */

const _ = require('lodash');
const { backOff } = require('exponential-backoff');
const connectionHelper = require('../shared/connection/connectionHelper');
const {
	COUCHBASE_APPLY_TO_INSTANCE,
	COUCHBASE_FORWARD_ENGINEERING_ERROR,
	CONTAINER_DATA_NOT_FOUND,
	CONNECTING,
	CHECK_BUCKET_EXISTS,
	ERROR_HAS_BEEN_THROWN_WHILE_CONNECTING_TO_BUCKET,
	ERROR_HAS_BEEN_THROWN_WHILE_CREATING_BUCKET_IN_COUCHBASE_INSTANCE,
	ERROR_DURING_PUBLISHING_SAMPLE_DATA_IN_BULK,
	ERROR_HAS_BEEN_THROWN_WHILE_APPLYING_SCRIPT_TO_COUCHBASE_INSTANCE,
} = require('../shared/enums/static-messages');

const {
	applyScript,
	createNewBucket,
	handleError,
	logApplyScriptAttempt,
} = require('./services/applyToInstanceService');
const ForwardEngineeringScriptBuilder = require('./services/forwardEngineeringScriptBuilder');

const MAX_APPLY_ATTEMPTS = 5;

const includeSamples = (additionalOptions = []) =>
	Boolean(additionalOptions.find(option => option.id === 'INCLUDE_SAMPLES' && option.value));

/**
 * @param {ConnectionInfo} connectionInfo
 * @param {AppLogger} logger
 * @param {Callback} callback
 * @param {App} app
 */
const generateContainerScript = async (data, logger, callback, app) => {
	try {
		logger.clear();
		const scriptBuilder = new ForwardEngineeringScriptBuilder();

		const { jsonData, collections, options } = data;
		const { origin, additionalOptions } = options;
		const [scope] = data.containerData;
		const collectionsData = collections.map(schema => ({
			...JSON.parse(schema),
			namespace: scope.namespace,
			bucket: scope.bucket,
			scope: scope.name,
		}));

		scriptBuilder.addScopeScript(scope);
		collectionsData.forEach(collection => scriptBuilder.addCollectionScripts(collection));

		if (!includeSamples(additionalOptions)) {
			return callback(null, scriptBuilder.buildScriptWithoutSamples());
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
		logger.log('error', { message: error.message, stack: error.stack }, COUCHBASE_FORWARD_ENGINEERING_ERROR);

		callback({ message: error.message, stack: error.stack });
	}
};

/**
 * @param {ConnectionInfo} connectionInfo
 * @param {AppLogger} logger
 * @param {Callback} callback
 * @param {App} app
 */
const generateScript = async (data, logger, callback, app) => {
	try {
		const scriptBuilder = new ForwardEngineeringScriptBuilder();

		const { jsonData, jsonSchema, containerData, options } = data;
		const { additionalOptions } = options;
		const [scope] = _.isEmpty(containerData) ? [{}] : containerData;
		const rawCollectionData = JSON.parse(jsonSchema);
		const collectionData = {
			...rawCollectionData,
			namespace: scope?.namespace,
			bucket: scope?.bucket,
			scope: scope?.name,
			collectionName: rawCollectionData.title,
		};

		scriptBuilder.addCollectionScripts(collectionData);
		if (!includeSamples(additionalOptions)) {
			return callback(null, scriptBuilder.buildScriptWithoutSamples());
		}

		scriptBuilder.addCollectionInsertScripts({
			jsonData,
			collection: collectionData,
		});

		callback(null, scriptBuilder.buildScriptConcatenatedWithInsertScripts('\n\n'));
	} catch (error) {
		logger.log('error', { message: error.message, stack: error.stack }, COUCHBASE_FORWARD_ENGINEERING_ERROR);

		callback({ message: error.message, stack: error.stack });
	}
};

/**
 * @param {ConnectionInfo} connectionInfo
 * @param {AppLogger} logger
 * @param {Callback} callback
 * @param {App} app
 */
const applyToInstance = async (connectionInfo, logger, callback, app) => {
	logger.clear({ appTarget: connectionInfo.appTarget, appVersion: connectionInfo.appVersion });
	logger.log('info', connectionInfo, COUCHBASE_APPLY_TO_INSTANCE);

	logger.progress({ message: CONNECTING });
	const cluster = await connectionHelper.connect({ connectionInfo, app });

	const containerData = _.first(connectionInfo.containerData);

	if (!containerData) {
		return handleError({
			err: new Error(CONTAINER_DATA_NOT_FOUND),
			logger,
			callback,
			message: ERROR_HAS_BEEN_THROWN_WHILE_CONNECTING_TO_BUCKET,
		});
	}

	const bucketName = containerData?.bucket;
	const scriptWithSamples = connectionInfo.script;

	logger.progress({ message: CHECK_BUCKET_EXISTS });

	const buckets = await cluster.buckets().getAllBuckets();
	const bucketExists = buckets.find(bucket => bucket.name === bucketName);
	if (!bucketExists) {
		try {
			await createNewBucket({ bucketName, containerData, logger, cluster });
		} catch (err) {
			if (err.context?.response_code !== 400) {
				return handleError({
					err,
					logger,
					callback,
					message: ERROR_HAS_BEEN_THROWN_WHILE_CREATING_BUCKET_IN_COUCHBASE_INSTANCE,
				});
			}

			logger.log('error', err, ERROR_DURING_PUBLISHING_SAMPLE_DATA_IN_BULK);
		}
	}

	logApplyScriptAttempt({ bucketName, logger });
	try {
		await backOff(
			() =>
				applyScript({
					script: scriptWithSamples,
					bucketName,
					logger,
					callback,
					cluster,
				}),
			{
				numOfAttempts: MAX_APPLY_ATTEMPTS,
				retry: (err, attemptNumber) => {
					logApplyScriptAttempt({ attemptNumber, bucketName, logger });
				},
				startingDelay: 1000,
			},
		);
	} catch (err) {
		return handleError({
			err,
			logger,
			callback,
			message: ERROR_HAS_BEEN_THROWN_WHILE_APPLYING_SCRIPT_TO_COUCHBASE_INSTANCE,
		});
	}
};

/**
 * @param {ConnectionInfo} connectionInfo
 * @param {AppLogger} logger
 * @param {Callback} callback
 * @param {App} app
 */
const testConnection = async (connectionInfo, logger, callback, app) => {
	try {
		await connectionHelper.disconnect();
		await connectionHelper.connect({ connectionInfo });
		await connectionHelper.disconnect();
		callback();
	} catch (error) {
		callback(error);
	}
};

module.exports = {
	generateContainerScript,
	generateScript,
	applyToInstance,
	testConnection,
};
