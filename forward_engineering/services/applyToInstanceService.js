const _ = require('lodash');
const couchbase = require('couchbase');
const { createRestApiService } = require('../../reverse_engineering/helpers/restApiHelper');
const { eachAsync } = require('../utils/arrayHelper');

const createNewBucket = async ({ containerData, bucketName, logger, cluster }) => {
	const bucketOptions = getBucketOptions(containerData);
	logger.log('info', { message: 'Creating a bucket', bucketOptions }, 'Couchbase apply to instance');
	logger.progress(null, { message: 'Creating a bucket' });

	await cluster.buckets().createBucket({ name: bucketName, ...bucketOptions });

	logger.log(
		'info',
		{ message: 'Bucket successfully created on cluster', bucketOptions },
		'Couchbase apply to instance',
	);

	return cluster.bucket(bucketName);
};

const getBucketOptions = containerData => {
	const bucketType = containerData.bucketType.toLowerCase();

	return {
		bucketType: bucketType === 'couchbase' ? null : bucketType,
		ramQuotaMB: containerData.ramQuota || 0,
		replicaNumber: containerData.replicaNumber || 1,
		replicaIndex: containerData.replicasViewIndex || 0,
		flushEnabled: containerData.flushEnable || 0,
		autoCompactionDefined: containerData.overrideDefault || false,
		conflictResolutionType: getConflictResolutionType(containerData.conflictResolution),
		evictionPolicy: getEvictionPolicy(containerData.cacheMetadata),
		threadsNumber: getThreadsNumber(containerData.bucketIOPriority),
	};
};

const getConflictResolutionType = type => {
	if (type === 'Timestamp') {
		return 'lww';
	}

	return 'seqno';
};

const getEvictionPolicy = type => {
	if (type === 'Value ejection') {
		return 'valueOnly';
	} else if (type === 'Full ejection') {
		return 'full';
	}

	return 'noEviction';
};

const getThreadsNumber = type => {
	if (type === 'High') {
		return 8;
	}

	return 3;
};

const handleError = ({ err, logger, callback, message }) => {
	logger.log('error', err, message);
	logger.progress(err, { message });
	return callback(err);
};

const indexAlreadyCreatedError = err => {
	const INDEX_ALREADY_CREATED_ERROR_CODE = 4300;

	const cause = err.cause || {};

	return (
		cause.first_error_code === INDEX_ALREADY_CREATED_ERROR_CODE ||
		cause.first_error_message.includes('already exist')
	);
};

const duplicateDocumentKeyError = err => {
	const DUPLICATE_DOCUMENT_KEY_ERROR_CODE = 12009;

	const cause = err.cause || {};

	return (
		cause.first_error_code === DUPLICATE_DOCUMENT_KEY_ERROR_CODE &&
		cause.first_error_message.includes('Duplicate Key')
	);
};

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
					logger.progress(null, { message: `Applying script: ${applyingProgress}%` });
				}
			} catch (err) {
				if (indexAlreadyCreatedError(err)) {
					logger.log('info', { error: err }, 'Couchbase apply to instance skipped error');
				} else if (duplicateDocumentKeyError(err)) {
					logger.log('info', { error: err }, 'Couchbase apply to instance error');
					logger.progress(err, { message: `Applying script: ${script}%` });
				} else {
					throw err;
				}
			}
		});
		logger.log('info', { message: 'Script successfully applied' }, 'Couchbase apply to instance');
		logger.progress(null, { message: 'Successfully applied' });
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

const connectToCluster = async ({ connectionInfo, app, logger }) => {
	const DEFAULT_KV_CONNECTION_PORT = 11210;
	const currentAddress = `couchbase://${connectionInfo.host}:${connectionInfo.kv_port || DEFAULT_KV_CONNECTION_PORT}`;
	const cluster = await couchbase.connect(currentAddress, {
		username: connectionInfo.couchbase_username,
		password: connectionInfo.couchbase_password,
	});
	logger.log('info', { message: 'Connected successfully' }, 'Couchbase apply to instance');

	getCouchbaseVersionByAPI({
		connectionInfo,
		app,
		cb: (err, res) => {
			if (!err) {
				logger.log('info', { version: res.fullVersion }, 'Couchbase version');
			}
		},
	});

	return cluster;
};

const getCouchbaseVersionByAPI = ({ connectionInfo, app, cb }) => {
	const apiService = createRestApiService({ connectionInfo, app });

	apiService
		.getVersion()
		.then(fullVersion => {
			const version = fullVersion[0] === '3' ? '3.1' : fullVersion.substring(0, 3);
			cb(null, { fullVersion, version });
		})
		.catch(err => {
			cb(err, null);
		});
};

const logApplyScriptAttempt = ({ attemptNumber, bucketName, logger }) => {
	const attemptNumberMessage = attemptNumber ? ` Retry: attempt ${attemptNumber + 1}` : '';
	logger.log(
		'info',
		{ message: `Applying script to ${bucketName} bucket.${attemptNumberMessage}` },
		'Couchbase apply to instance',
	);
	logger.progress(null, { message: 'Applying script' + attemptNumberMessage });

	return true;
};

module.exports = {
	applyScript,
	createNewBucket,
	handleError,
	connectToCluster,
	logApplyScriptAttempt,
};
