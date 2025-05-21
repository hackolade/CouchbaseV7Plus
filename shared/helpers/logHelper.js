/**
 * @typedef {import('../types').AppLogger} AppLogger
 * @typedef {import('../types').Logger} Logger
 */

const { COUCHBASE_ERROR_CODE, ERROR_SIMPLE_TYPE } = require('../constants');

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
	createLogger,
	createError,
};

module.exports = logHelper;
