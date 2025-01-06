/**
 * @typedef {import('../types').AppLogger} AppLogger
 * @typedef {import('../types').Logger} Logger
 */

const os = require('os');
const packageFile = require('../../package.json');
const { COUCHBASE_ERROR_CODE, ERROR_SIMPLE_TYPE } = require('../constants');

const getPluginVersion = () => packageFile.version;

const getSystemInfo = appVersion => {
	return (
		'' +
		`Date: ${new Date()}` +
		'\n' +
		`Application version: ${appVersion}` +
		'\n' +
		`Plugin version: ${getPluginVersion()}` +
		'\n\n' +
		`System information:` +
		'\n' +
		` Hostname:  ${os.hostname()}` +
		'\n' +
		` Platform:  ${os.platform()} ${os.arch()}` +
		'\n' +
		` Release:   ${os.release()}` +
		'\n' +
		` Uptime:    ${toTime(os.uptime())}` +
		'\n' +
		` Total RAM: ${(os.totalmem() / 1073741824).toFixed(2)} GB` +
		'\n' +
		` CPU Model: ${os.cpus()[0].model}` +
		'\n' +
		` CPU Clock: ${maxClock(os.cpus())} MHZ` +
		'\n' +
		` CPU Cores: ${os.cpus().length} cores` +
		'\n\n'
	);
};

const maxClock = cpus => {
	return cpus.reduce((highestClock, cpu) => Math.max(highestClock, cpu.speed), 0);
};

const prefixZero = number => (number < 10 ? '0' + number : number);

const toTime = number => {
	return Math.floor(number / 3600) + ':' + prefixZero(parseInt((number / 3600 - Math.floor(number / 3600)) * 60));
};

const prettifyMessage = ({ error = {} }) => {
	if (error.cause?.first_error_message) {
		const [reason, context] = error.cause.first_error_message.split(' - cause: ');
		if (!reason || !context) {
			return error.cause.first_error_message;
		}
		return `${reason.trim()}:\n${context.trim()}`;
	}

	return error.cause?.message || error.message;
};

/**
 * @param {{ title: string; logger: AppLogger; hiddenKeys: string[] }} param0
 * @returns {Logger}
 */
const createLogger = ({ title, logger, hiddenKeys }) => {
	return {
		info(message) {
			logger.log('info', { message }, title, hiddenKeys);
		},

		progress(message, containerName = '', entityName = '') {
			logger.progress({ message, containerName, entityName });
		},

		error(error) {
			logger.log('error', createError(error), title);
		},
	};
};

const createError = error => {
	if (error?.context?.response_body) {
		const parsedResponseBodyWithErrorMessage = JSON.parse(error.context.response_body);
		error = {
			...error,
			...parsedResponseBodyWithErrorMessage,
		};
	}

	const type = error?.cause?.code === COUCHBASE_ERROR_CODE.authorizationFailure ? ERROR_SIMPLE_TYPE : error.type;
	const message = prettifyMessage({ error });

	return { type, message };
};

const logHelper = {
	getSystemInfo,
	createLogger,
	createError,
};

module.exports = logHelper;
