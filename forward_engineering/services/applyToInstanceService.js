const _ = require('lodash');
const { eachAsync } = require('../utils/arrays');

/**
 *
 * @param {{containerData: object, bucketName: string, logger: object, cluster: object}} param0
 * @returns {object}
 */
const createNewBucket = async ({ bucketName, logger, cluster }) => {
	logger.log('info', { message: `Creating a bucket: ${bucketName}` }, 'Couchbase apply to instance');
	logger.progress({ message: 'Creating a bucket' });

	await cluster.buckets().createBucket({ name: bucketName });

	logger.log(
		'info',
		{ message: `Bucket ${bucketName} successfully created on cluster` },
		'Couchbase apply to instance',
	);

	return cluster.bucket(bucketName);
};

/**
 *
 * @param {{err: object, logger: object, callback: function, message: string}} param
 * @returns {string}
 */
const handleError = ({ err, logger, callback, message }) => {
	logger.log('error', err, message);
	logger.progress(err, { message });
	return callback(err);
};

/**
 *
 * @param {{script: string, cluster: object, logger: object, callback: function}} param
 * @returns {boolean}
 */
const applyScript = async ({ script, cluster, logger, callback }) => {
	const scripts = script.split(';\n').map(_.trim).filter(Boolean);
	const maxNumberStatements = scripts.length;
	let previousApplyingProgress = 0;

	try {
		await eachAsync(scripts, async (script, index) => {
			logger.log('info', { message: 'Apply query', query: script }, 'Couchbase apply to instance');
			try {
				await cluster.query(script);
				const appliedStatements = index + 1;
				const applyingProgress = Math.round((appliedStatements / maxNumberStatements) * 100);
				if (applyingProgress - previousApplyingProgress >= 5) {
					previousApplyingProgress = applyingProgress;
					logger.progress({ message: `Applying script: ${applyingProgress}%` });
				}
			} catch (err) {
				if (isIndexAlreadyCreatedError(err)) {
					logger.log('info', { error: err }, 'Couchbase apply to instance skipped error');
				} else if (isDuplicateDocumentKeyError(err)) {
					logger.log('info', { error: err }, 'Couchbase apply to instance error');
					logger.progress(err, { message: `Applying script: ${script}%` });
				} else {
					throw err;
				}
			}
		});
		logger.log('info', { message: 'Script successfully applied' }, 'Couchbase apply to instance');
		logger.progress({ message: 'Successfully applied' });
		callback();
	} catch (err) {
		handleError({
			err,
			logger,
			callback,
			message: 'Error has been thrown while applying script to Couchbase instance',
		});
	}
};

/**
 *
 * @param {object} err
 * @returns {boolean}
 */
const isIndexAlreadyCreatedError = err => {
	const INDEX_ALREADY_CREATED_ERROR_CODE = 4300;

	const cause = err.cause || {};

	return (
		cause.first_error_code === INDEX_ALREADY_CREATED_ERROR_CODE ||
		cause.first_error_message.includes('already exist')
	);
};

/**
 *
 * @param {object} err
 * @returns {boolean}
 */
const isDuplicateDocumentKeyError = err => {
	const DUPLICATE_DOCUMENT_KEY_ERROR_CODE = 12009;

	const cause = err.cause || {};

	return (
		cause.first_error_code === DUPLICATE_DOCUMENT_KEY_ERROR_CODE &&
		cause.first_error_message.includes('Duplicate Key')
	);
};

/**
 *
 * @param {{attemptNumber: number, bucketName: string, logger: object}} param
 * @returns {void}
 */
const logApplyScriptAttempt = ({ attemptNumber, bucketName, logger }) => {
	const attemptNumberMessage = attemptNumber ? ` Retry: attempt ${attemptNumber + 1}` : '';
	logger.log(
		'info',
		{ message: `Applying script to ${bucketName} bucket.${attemptNumberMessage}` },
		'Couchbase apply to instance',
	);
	logger.progress({ message: `Applying script ${attemptNumberMessage}` });
};

module.exports = {
	applyScript,
	createNewBucket,
	handleError,
	logApplyScriptAttempt,
};
