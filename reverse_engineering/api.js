'use strict';

const connectionHelper = require('./helpers/connectionHelper');
const { createLogger } = require('./helpers/logHelper');

module.exports = {
	disconnect: function (connectionInfo, logger, cb) {
		connectionHelper.close();
		cb();
	},

	async testConnection(connectionInfo, logger, cb) {
		const log = createLogger({
			title: 'Test connection',
			hiddenKeys: connectionInfo.hiddenKeys,
			logger,
		});
	},

	async getDbCollectionsNames(connectionInfo, logger, cb, app) {
		const log = createLogger({
			title: 'Retrieving databases and collections information',
			hiddenKeys: connectionInfo.hiddenKeys,
			logger,
		});
	},

	async getDbCollectionsData(data, logger, cb, app) {
		const log = createLogger({
			title: 'Retrieving data for inferring schema',
			hiddenKeys: data.hiddenKeys,
			logger,
		});
	},
};
