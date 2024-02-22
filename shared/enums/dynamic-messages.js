module.exports = {
	getApplyingScriptPercentMessage: applyingProgress => `Applying script: ${applyingProgress}%`,
	getRetryAttemptNumberMessage: attemptNumber => ` Retry: attempt ${attemptNumber}`,
	getApplyingScriptToBucketWithAttemptNumberMessage: (bucketName, attemptNumberMessage) =>
		`Applying script to ${bucketName} bucket.${attemptNumberMessage}`,
	getApplyingScriptMessage: attemptNumberMessage => `Applying script ${attemptNumberMessage}`,
	getCheckBucketExistsMessage: bucketName => `Check bucket ${bucketName} exists`,
};
