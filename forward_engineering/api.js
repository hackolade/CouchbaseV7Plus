const _ = require('lodash');
const { backOff } = require('exponential-backoff');
const { getValidBucketName } = require('./helpers/objectConformance');
const connectionHelper = require('../reverse_engineering/helpers/connectionHelper');

const {
	applyScript,
	createNewBucket,
	handleError,
	connectToCluster,
	logApplyScriptAttempt,
} = require('./helpers/applyToInstanceHelper');
const ScriptBuilder = require('./helpers/scriptBuilder');

const MAX_APPLY_ATTEMPTS = 5;

module.exports = {
	async generateContainerScript(data, logger, callback, app) {
		try {
			logger.clear();
			const scriptBuilder = new ScriptBuilder();

			const { jsonData, collections, options, modelData } = data;
			const { origin, fakerLocalization, additionalOptions } = options;
			const dbVersion = modelData[0]?.dbVersion;
			const [bucket] = data.containerData;
			const indexes = Object.values(data.entityData).reduce(
				(indexes, entityData) => [...indexes, ...(entityData[1]?.indexes ?? [])],
				[],
			);

			scriptBuilder.addTemplateScript({ bucket });
			scriptBuilder.addIndexesScript({ bucket, dbVersion, indexes });

			const includeSamples = (additionalOptions || []).find(
				option => option.id === 'INCLUDE_SAMPLES' && option.value,
			);
			if (!includeSamples) {
				return callback(null, scriptBuilder.buildScriptWithoutSamples());
			}

			scriptBuilder.addContainerInsertScripts({ bucket, collections, jsonData, fakerLocalization });

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
	},
	async generateScript(data, logger, callback, app) {
		try {
			const scriptBuilder = new ScriptBuilder();

			const { jsonData, jsonSchema, options } = data;
			const { fakerLocalization } = options;
			const [bucket] = data.containerData;
			const [keyPropertyId] = bucket?.documentKey?.[0].path.slice(-1);
			const collection = JSON.parse(jsonSchema);

			scriptBuilder.addTemplateScript({ bucket });
			scriptBuilder.addCollectionInsertScripts({
				bucket,
				fakerLocalization,
				jsonData,
				keyPropertyId,
				collection,
			});

			callback(null, scriptBuilder.buildScriptConcatenatedWithInsertScripts());
		} catch (error) {
			logger.log('error', { message: error.message, stack: error.stack }, 'Couchbase Forward-Engineering Error');

			callback({ message: error.message, stack: error.stack });
		}
	},
	applyToInstance: async (connectionInfo, logger, callback, app) => {
		logger.clear({ appTarget: connectionInfo.appTarget, appVersion: connectionInfo.appVersion });
		logger.log('info', connectionInfo, 'Couchbase apply to instance');

		logger.progress(null, { message: 'Connecting' });
		const cluster = await connectToCluster({ connectionInfo, app, logger });

		const containerData = _.first(connectionInfo.containerData);

		if (!containerData) {
			return handleError({
				err: new Error('Container data not found.'),
				logger,
				callback,
				message: 'Error has been thrown while connecting to bucket',
			});
		}

		const bucketName = getValidBucketName(containerData);
		const scriptWithSamples = connectionInfo.script;

		logger.progress(null, { message: 'Check bucket exists' });

		const buckets = await cluster.buckets().getAllBuckets();
		const bucketExists = buckets.includes(bucketName);
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
	},

	testConnection: async (connectionInfo, logger, callback, app) => {
		try {
			await connectionHelper.disconnect();
			await connectionHelper.connect(connectionInfo);
			await connectionHelper.disconnect();
			callback();
		} catch (error) {
			logger.error(error);
			callback(error);
		}
	},
};
