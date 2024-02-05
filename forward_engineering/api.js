const { getValidBucketName } = require('./helpers/objectConformance');
const { getIndexesScript } = require('./helpers/getIndexesScripts');
const { getInsertScripts, getInsertScriptForCollection } = require('./helpers/getInsertScripts')

const applyToInstanceHelper = require("./helpers/applyToInstanceHelper");
const scriptHelper = require("./helpers/scriptHelper");

module.exports = {
	async generateContainerScript(data, logger, callback, app) {
		try {
			logger.clear()
			const {fakeDataService} = app.require('@hackolade/json-utils')

			const { model, jsonData, collections, views,  options } = data
			const { origin, fakerLocalization, additionalOptions } = options;
			const [bucket] = data.containerData
		
			const indexes = Object.values(data.entityData).reduce((indexes, entityData) => [...indexes, ...entityData[1].Indxs], [])
			const indexesScript = getIndexesScript({bucket, model, indexes});
			const finalScript = `${wrapWithCommentAboutNotExistingBucket(getValidBucketName(bucket))}${indexesScript}`;
			const includeSamples = (additionalOptions || []).find(option => option.id === 'INCLUDE_SAMPLES' && option.value);
			if (!includeSamples) {
				return callback(null, finalScript)
			}

			const insertScripts = await getInsertScripts({fakeDataService})({model, bucket, collections, jsonData, fakerLocalization});
			if (origin !== 'ui') {
				return callback(null, `${finalScript}\n\n${insertScripts}`);
			}
		
			callback(null, [
				{ title: 'Couchbase script', script: finalScript },
				{
					title: 'Sample data',
					script: insertScripts,
				},
			])
		} catch (error) {
			logger.log(
				'error',
				{ message: error.message, stack: error.stack },
				'Couchbase Forward-Engineering Error',
			);

			callback({ message: error.message, stack: error.stack });
		}
	},
	async generateScript(data, logger, callback, app) {
		try {
			const { fakeDataService } = app.require('@hackolade/json-utils')
			const { model, jsonData, jsonSchema, options } = data
			const { fakerLocalization } = options;
			const [bucket] = data.containerData
			const [keyPropertyId] = bucket?.documentKey?.[0].path.slice(-1)
			const collection = JSON.parse(jsonSchema)
		
			const bucketName = getValidBucketName(bucket);
			const insertScripts = await getInsertScriptForCollection({fakeDataService})({model, bucketName, fakerLocalization, jsonData, keyPropertyId})(collection);
		
			callback(null, `${wrapWithCommentAboutNotExistingBucket(bucketName)}${insertScripts}`);
		} catch (error) {
			logger.log(
				'error',
				{ message: error.message, stack: error.stack },
				'Couchbase Forward-Engineering Error',
			);

			callback({ message: error.message, stack: error.stack });
		}
	},
	applyToInstance: () => {},

	testConnection: () => {},
};

const wrapWithCommentAboutNotExistingBucket = bucketName => {
	return `/*\n * If bucket '${bucketName}' does not exists it will be created automatically by Hackolade\n */\n\n`;
};