module.exports = {
	getCreatingBucketMessage: bucketName => `Creating a bucket: ${bucketName}`,
	getSuccessfullyCreatedBucketMessage: bucketName => `Bucket ${bucketName} successfully created on cluster`,
	getApplyingScriptPercentMessage: applyingProgress => `Applying script: ${applyingProgress}%`,
	getRetryAttemptNumberMessage: attemptNumber => ` Retry: attempt ${attemptNumber}`,
	getApplyingScriptToBucketWithAttemptNumberMessage: (bucketName, attemptNumberMessage) =>
		`Applying script to ${bucketName} bucket.${attemptNumberMessage}`,
	getApplyingScriptMessage: attemptNumberMessage => `Applying script ${attemptNumberMessage}`,
	getCheckBucketExistsMessage: bucketName => `Check bucket ${bucketName} exists`,
};
