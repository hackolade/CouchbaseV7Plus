const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const connectionHelper = require('../../shared/helpers/connectionHelper');
const clusterHelper = require('../../shared/helpers/clusterHelper');
const { applyToInstance } = require('../../forward_engineering/api');
const { getKeyspaceWithoutBucket } = require('../../forward_engineering/services/applyToInstanceService');
const {
	getScopeScript,
	getDropScopeScript,
} = require('../../forward_engineering/services/statements/scopesStatements');
const {
	getCollectionScript,
	getDropCollectionScript,
} = require('../../forward_engineering/services/statements/collectionsStatements');
const {
	getIndexScript,
	getDropIndexScript,
	getAlterIndexScript,
} = require('../../forward_engineering/services/statements/indexesStatements');
const { getInsertScriptForCollection } = require('../../forward_engineering/services/statements/insertStatements');

const KEYSPACE = { bucketName: 'travel-sample', scopeName: 'scope_hobe', collectionName: 'New_collection' };
const KEYSPACE_WITHOUT_BUCKET = { ...KEYSPACE, bucketName: '' };

const getStatements = keyspace => ({
	'CREATE SCOPE': getScopeScript({ bucketName: keyspace.bucketName, name: keyspace.scopeName }),
	'DROP SCOPE': getDropScopeScript({ bucketName: keyspace.bucketName, name: keyspace.scopeName }),
	'CREATE COLLECTION': getCollectionScript(keyspace),
	'DROP COLLECTION': getDropCollectionScript(keyspace),
	'CREATE PRIMARY INDEX': getIndexScript({ ...keyspace, indxType: 'Primary', isActivated: true }),
	'CREATE INDEX': getIndexScript({
		...keyspace,
		indxType: 'Secondary',
		indxName: 'idx_name',
		indxKey: [{ name: 'name', type: 'ascending' }],
		isActivated: true,
	}),
	'DROP INDEX': getDropIndexScript({ ...keyspace, indxName: 'idx_name' }),
	'ALTER INDEX': getAlterIndexScript({
		...keyspace,
		indxName: 'idx_name',
		action: 'replica_count',
		num_replica: 1,
	}),
	'UPSERT INTO': getInsertScriptForCollection({
		jsonData: '{"name":"sample"}',
		collection: { ...keyspace, properties: {} },
	}),
});

describe('getKeyspaceWithoutBucket', () => {
	for (const [statementType, statement] of Object.entries(getStatements(KEYSPACE))) {
		test(`accepts ${statementType} with its bucket and scope`, () => {
			assert.ok(statement, 'the generator should return a statement');
			assert.equal(getKeyspaceWithoutBucket({ script: statement }), undefined);
		});
	}

	for (const [statementType, statement] of Object.entries(getStatements(KEYSPACE_WITHOUT_BUCKET))) {
		if (!statement) {
			continue;
		}

		test(`rejects ${statementType} without a bucket`, () => {
			assert.equal(getKeyspaceWithoutBucket({ script: statement }), '`New_collection`');
		});
	}

	test('rejects the script of a collection whose container has no bucket', () => {
		const script =
			'CREATE COLLECTION `New_collection` IF NOT EXISTS;\n\nCREATE PRIMARY INDEX `qsdf`\n\tON `New_collection`;';

		assert.equal(getKeyspaceWithoutBucket({ script }), '`New_collection`');
	});

	test('accepts a keyspace with a namespace', () => {
		const script = 'CREATE PRIMARY INDEX ON default:`travel-sample`.`scope_hobe`.`New_collection`;';

		assert.equal(getKeyspaceWithoutBucket({ script }), undefined);
	});

	test('ignores deactivated statements in comments', () => {
		const script = [
			'/* CREATE PRIMARY INDEX ON `New_collection`; */',
			'CREATE PRIMARY INDEX ON `travel-sample`.`scope_hobe`.`New_collection`;',
		].join('\n');

		assert.equal(getKeyspaceWithoutBucket({ script }), undefined);
	});

	test('accepts an empty script', () => {
		assert.equal(getKeyspaceWithoutBucket({ script: '' }), undefined);
		assert.equal(getKeyspaceWithoutBucket({}), undefined);
	});
});

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
	let connected;
	let queries;
	let createdBuckets;
	let existingBuckets;

	beforeEach(() => {
		connected = false;
		queries = [];
		createdBuckets = [];
		existingBuckets = [];
		originals.connect = connectionHelper.connect;
		originals.getAllBuckets = clusterHelper.getAllBuckets;
		originals.createNewBucket = clusterHelper.createNewBucket;

		connectionHelper.connect = async () => {
			connected = true;
			return { query: async statement => queries.push(statement) };
		};
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

	test('stops before connecting when a statement has no bucket and there is no container data', async () => {
		const error = await runApplyToInstance({ script: 'CREATE COLLECTION `New_collection` IF NOT EXISTS;' });

		assert.match(error.message, /refers to `New_collection` without its bucket and scope/u);
		assert.equal(connected, false);
		assert.deepEqual(queries, []);
	});

	test('stops before connecting when the container has no bucket', async () => {
		const error = await runApplyToInstance({
			script: 'CREATE COLLECTION `New_collection` IF NOT EXISTS;',
			containerData: [{ name: 'scope_hobe', bucket: '' }],
		});

		assert.match(error.message, /refers to `New_collection` without its bucket and scope/u);
		assert.equal(connected, false);
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
