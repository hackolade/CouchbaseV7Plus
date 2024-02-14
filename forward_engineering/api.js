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
		logger.log('error', { message: error.message, stack: error.stack }, 'Couchbase Forward-Engineering Error');

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

		const { jsonData, jsonSchema, options } = data;
		const { additionalOptions } = options;
		const [bucket] = data.containerData;
		const [keyPropertyId] = bucket?.documentKey?.[0].path.slice(-1);
		const collection = JSON.parse(jsonSchema);

		scriptBuilder.addCollectionScripts(collection);
		if (!includeSamples(additionalOptions)) {
			return callback(null, scriptBuilder.buildScriptWithoutSamples());
		}

		scriptBuilder.addCollectionInsertScripts({
			bucket,
			jsonData,
			keyPropertyId,
			collection,
		});

		callback(null, scriptBuilder.buildScriptConcatenatedWithInsertScripts());
	} catch (error) {
		logger.log('error', { message: error.message, stack: error.stack }, 'Couchbase Forward-Engineering Error');

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
	logger.log('info', connectionInfo, 'Couchbase apply to instance');

	logger.progress({ message: 'Connecting' });
	const cluster = await connectionHelper.connect({ connectionInfo, app });

	const containerData = _.first(connectionInfo.containerData);

	if (!containerData) {
		return handleError({
			err: new Error('Container data not found.'),
			logger,
			callback,
			message: 'Error has been thrown while connecting to bucket',
		});
	}

	const bucketName = containerData?.bucket;
	const scriptWithSamples = connectionInfo.script;

	logger.progress({ message: 'Check bucket exists' });

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
					message: 'Error has been thrown while creating a bucket in Couchbase instance',
				});
			}

			logger.log('error', err, 'Error during publishing fake data in bulk');
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
			message: 'Error has been thrown while applying script to Couchbase instance',
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
