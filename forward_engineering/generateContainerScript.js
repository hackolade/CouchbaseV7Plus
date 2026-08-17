const { get } = require('lodash');
const logHelper = require('../shared/helpers/logHelper');
const ForwardEngineeringScriptBuilder = require('./services/forwardEngineeringScriptBuilder');
const { buildAlterScript } = require('./services/alterScriptBuilder');
const { GENERATING_CONTAINER_SCRIPT } = require('../shared/enums/staticMessages');
const { includeSamples } = require('./utils/includeSamples');

/**
 * @param {ConnectionInfo} connectionInfo
 * @param {AppLogger} appLogger
 * @param {Callback} callback
 * @param {App} _app
 */
const generateContainerScript = async (connectionInfo, appLogger, callback, _app) => {
	const logger = logHelper.createLogger({
		title: GENERATING_CONTAINER_SCRIPT,
		hiddenKeys: connectionInfo.hiddenKeys,
		logger: appLogger,
	});

	try {
		if (connectionInfo.isUpdateScript) {
			return callback(null, buildAlterScript({ connectionInfo }));
		}

		const scriptBuilder = new ForwardEngineeringScriptBuilder();

		const { jsonData, collections, options } = connectionInfo;
		const { origin, additionalOptions } = options;
		const rawScope = get(connectionInfo.containerData, '[0]', {});
		const scope = {
			...rawScope,
			bucketName: rawScope?.bucket ?? '',
		};

		const getCollectionData = ({ schema, scope }) => ({
			...JSON.parse(schema),
			namespace: scope?.namespace,
			bucketName: scope?.bucketName,
			scopeName: scope?.name,
		});

		const collectionsData = collections.map(schema => getCollectionData({ schema, scope }));

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

module.exports = {
	generateContainerScript,
};
