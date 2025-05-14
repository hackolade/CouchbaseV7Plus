const { get } = require('lodash');
const logHelper = require('../shared/helpers/logHelper');
const { GENERATING_ENTITY_SCRIPT } = require('../shared/enums/staticMessages');
const ForwardEngineeringScriptBuilder = require('./services/forwardEngineeringScriptBuilder');
const { includeSamples } = require('./utils/includeSamples');

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
		const scope = get(containerData, '[0]', {});
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

module.exports = {
	generateScript,
};
