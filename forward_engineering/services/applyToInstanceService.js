const _ = require('lodash');
const async = require('async');
const clusterHelper = require('../../shared/helpers/clusterHelper');
const {
	APPLY_QUERY,
	COUCHBASE_APPLY_TO_INSTANCE_SKIPPED_ERROR,
	COUCHBASE_APPLY_TO_INSTANCE_ERROR,
	SCRIPT_SUCCESSFULLY_APPLIED,
	SUCCESSFULLY_APPLIED,
	ERROR_HAS_BEEN_THROWN_WHILE_APPLYING_SCRIPT_TO_COUCHBASE_INSTANCE,
} = require('../../shared/enums/static-messages');
const {
	getApplyingScriptPercentMessage,
	getRetryAttemptNumberMessage,
	getApplyingScriptToBucketWithAttemptNumberMessage,
	getApplyingScriptMessage,
} = require('../../shared/enums/dynamic-messages');
const { COUCHBASE_ERROR_CODE } = require('../../shared/constants');

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
			logger.info(APPLY_QUERY);
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
					logger.info(COUCHBASE_APPLY_TO_INSTANCE_SKIPPED_ERROR);
				} else if (isDuplicateDocumentKeyError(err)) {
					logger.info(COUCHBASE_APPLY_TO_INSTANCE_ERROR);
					logger.progress(getApplyingScriptPercentMessage(script));
				} else {
					throw err;
				}
			}
		});
		logger.info(SCRIPT_SUCCESSFULLY_APPLIED);
		logger.progress(SUCCESSFULLY_APPLIED);
		callback();
	} catch (err) {
		logger.error(err);
		logger.progress(ERROR_HAS_BEEN_THROWN_WHILE_APPLYING_SCRIPT_TO_COUCHBASE_INSTANCE);
		return callback(err);
	}
};

/**
 *
 * @param {object} err
 * @returns {boolean}
 */
const isIndexAlreadyCreatedError = err => {
	const errorCode = clusterHelper.getErrorCode({ error: err });
	const errorMessage = clusterHelper.getErrorMessage({ error: err });

	return errorCode === COUCHBASE_ERROR_CODE.indexAlreadyCreated || errorMessage.includes('already exist');
};

/**
 *
 * @param {object} err
 * @returns {boolean}
 */
const isDuplicateDocumentKeyError = err => {
	const errorCode = clusterHelper.getErrorCode({ error: err });
	const errorMessage = clusterHelper.getErrorMessage({ error: err });

	return errorCode === COUCHBASE_ERROR_CODE.duplicateDocumentKey && errorMessage.includes('Duplicate Key');
};

/**
 *
 * @param {{attemptNumber: number, bucketName: string, logger: object}} param
 * @returns {void}
 */
const logApplyScriptAttempt = ({ attemptNumber, bucketName, logger }) => {
	const attemptNumberMessage = attemptNumber ? getRetryAttemptNumberMessage(attemptNumber + 1) : '';
	logger.info(getApplyingScriptToBucketWithAttemptNumberMessage(bucketName, attemptNumberMessage));
	logger.progress(getApplyingScriptMessage(attemptNumberMessage));
};

module.exports = {
	applyScript,
	logApplyScriptAttempt,
};
