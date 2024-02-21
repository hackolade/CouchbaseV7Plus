const _ = require('lodash');
const async = require('async');
const {
	APPLY_QUERY,
	COUCHBASE_APPLY_TO_INSTANCE,
	CREATING_A_BUCKET,
	COUCHBASE_APPLY_TO_INSTANCE_SKIPPED_ERROR,
	COUCHBASE_APPLY_TO_INSTANCE_ERROR,
	SCRIPT_SUCCESSFULLY_APPLIED,
	SUCCESSFULLY_APPLIED,
	ERROR_HAS_BEEN_THROWN_WHILE_APPLYING_SCRIPT_TO_COUCHBASE_INSTANCE,
} = require('../../shared/enums/static-messages');
const {
	getCreatingBucketMessage,
	getSuccessfullyCreatedBucketMessage,
	getApplyingScriptPercentMessage,
	getRetryAttemptNumberMessage,
	getApplyingScriptToBucketWithAttemptNumberMessage,
	getApplyingScriptMessage,
} = require('../../shared/enums/dynamic-messages');

/**
 *
 * @param {{containerData: object, bucketName: string, logger: object, cluster: object}} param0
 * @returns {object}
 */
const createNewBucket = async ({ bucketName, logger, cluster }) => {
	logger.log('info', { message: getCreatingBucketMessage(bucketName) }, COUCHBASE_APPLY_TO_INSTANCE);
	logger.progress({ message: CREATING_A_BUCKET });

	await cluster.buckets().createBucket({ name: bucketName });

	logger.log('info', { message: getSuccessfullyCreatedBucketMessage(bucketName) }, COUCHBASE_APPLY_TO_INSTANCE);

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
		async.eachSeries(scripts, async (script, index) => {
			logger.log('info', { message: APPLY_QUERY, query: script }, COUCHBASE_APPLY_TO_INSTANCE);
			try {
				await cluster.query(script);
				const appliedStatements = index + 1;
				const applyingProgress = Math.round((appliedStatements / maxNumberStatements) * 100);
				if (applyingProgress - previousApplyingProgress >= 5) {
					previousApplyingProgress = applyingProgress;
					logger.progress({ message: getApplyingScriptPercentMessage(applyingProgress) });
				}
			} catch (err) {
				if (isIndexAlreadyCreatedError(err)) {
					logger.log('info', { error: err }, COUCHBASE_APPLY_TO_INSTANCE_SKIPPED_ERROR);
				} else if (isDuplicateDocumentKeyError(err)) {
					logger.log('info', { error: err }, COUCHBASE_APPLY_TO_INSTANCE_ERROR);
					logger.progress(err, { message: getApplyingScriptPercentMessage(script) });
				} else {
					throw err;
				}
			}
		});
		logger.log('info', { message: SCRIPT_SUCCESSFULLY_APPLIED }, COUCHBASE_APPLY_TO_INSTANCE);
		logger.progress({ message: SUCCESSFULLY_APPLIED });
		callback();
	} catch (err) {
		handleError({
			err,
			logger,
			callback,
			message: ERROR_HAS_BEEN_THROWN_WHILE_APPLYING_SCRIPT_TO_COUCHBASE_INSTANCE,
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
	const attemptNumberMessage = attemptNumber ? getRetryAttemptNumberMessage(attemptNumber + 1) : '';
	logger.log(
		'info',
		{ message: getApplyingScriptToBucketWithAttemptNumberMessage(bucketName, attemptNumberMessage) },
		COUCHBASE_APPLY_TO_INSTANCE,
	);
	logger.progress({ message: getApplyingScriptMessage(attemptNumberMessage) });
};

module.exports = {
	applyScript,
	createNewBucket,
	handleError,
	logApplyScriptAttempt,
};
