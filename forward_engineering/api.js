const applyToInstanceHelper = require('./helpers/applyToInstanceHelper');

module.exports = {
	generateContainerScript(data, logger, callback, app) {},
	generateScript(data, logger, callback, app) {},
	applyToInstance: applyToInstanceHelper.applyToInstance,

	testConnection: applyToInstanceHelper.testConnection,
};
