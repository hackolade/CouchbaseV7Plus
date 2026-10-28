const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const connectionHelper = require('../../shared/helpers/connectionHelper');
const clusterHelper = require('../../shared/helpers/clusterHelper');
const { applyToInstance } = require('../../forward_engineering/api');

const appLogger = { log: () => {}, progress: () => {} };

const alterScript = [
	'DROP PRIMARY INDEX IF EXISTS ON `travel-sample`.`scope_hobe`.`New_collection`;',
	'CREATE PRIMARY INDEX ON `travel-sample`.`scope_hobe`.`New_collection` USING GSI;',
].join('\n');

const runApplyToInstance = connectionInfo =>
	new Promise(resolve => {
		applyToInstance(connectionInfo, appLogger, error => resolve(error), {});
	});

describe('applyToInstance', () => {
	const originals = {};
	let queries;
	let createdBuckets;
	let existingBuckets;

	beforeEach(() => {
		queries = [];
		createdBuckets = [];
		existingBuckets = [];
		originals.connect = connectionHelper.connect;
		originals.getAllBuckets = clusterHelper.getAllBuckets;
		originals.createNewBucket = clusterHelper.createNewBucket;

		connectionHelper.connect = async () => ({ query: async statement => queries.push(statement) });
		clusterHelper.getAllBuckets = async () => existingBuckets.map(name => ({ name }));
		clusterHelper.createNewBucket = async ({ bucketName }) => createdBuckets.push(bucketName);
	});

	afterEach(() => {
		connectionHelper.connect = originals.connect;
		clusterHelper.getAllBuckets = originals.getAllBuckets;
		clusterHelper.createNewBucket = originals.createNewBucket;
	});

	test('applies an alter script from a Delta Model, which has no container data', async () => {
		const error = await runApplyToInstance({ script: alterScript });

		assert.equal(error, undefined);
		assert.equal(queries.length, 2);
		assert.match(queries[0], /^DROP PRIMARY INDEX/u);
		assert.match(queries[1], /^CREATE PRIMARY INDEX/u);
		assert.deepEqual(createdBuckets, []);
	});

	test('creates the bucket of the container data when it does not exist', async () => {
		const error = await runApplyToInstance({
			script: 'CREATE SCOPE `inventory`.`sales`;',
			containerData: [{ bucket: 'inventory' }],
		});

		assert.equal(error, undefined);
		assert.deepEqual(createdBuckets, ['inventory']);
		assert.equal(queries.length, 1);
	});

	test('does not create the bucket of the container data when it exists', async () => {
		existingBuckets = ['inventory'];

		const error = await runApplyToInstance({
			script: 'CREATE SCOPE `inventory`.`sales`;',
			containerData: [{ bucket: 'inventory' }],
		});

		assert.equal(error, undefined);
		assert.deepEqual(createdBuckets, []);
		assert.equal(queries.length, 1);
	});
});
