const { describe, test, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { getSelectCollectionDocumentsQuery } = require('../../reverse_engineering/helpers/queryHelper');
const { getIndexes } = require('../../reverse_engineering/helpers/indexHelper');
const restApiHelper = require('../../reverse_engineering/helpers/restApiHelper');

const KEYSPACE = { bucketName: 'travel-sample', scopeName: 'scope_hobe', collectionName: 'New_collection' };

const secondaryIndex = (...keyNames) => ({
	indxType: 'Secondary',
	indxKey: keyNames.map(name => ({ name, type: 'ascending' })),
});

const getWherePart = collectionIndexes => {
	const query = getSelectCollectionDocumentsQuery({ ...KEYSPACE, collectionIndexes });

	return query.split('AS `travel-sample` ')[1];
};

afterEach(() => mock.restoreAll());

describe('getSelectCollectionDocumentsQuery', () => {
	test('has no WHERE clause when the collection has a primary index', () => {
		assert.equal(getWherePart([{ indxType: 'Primary' }, secondaryIndex('New field1')]), '');
	});

	test('has no WHERE clause when the collection has no index', () => {
		assert.equal(getWherePart([]), '');
		assert.ok(!getSelectCollectionDocumentsQuery(KEYSPACE).includes('WHERE'));
	});

	test('escapes a key name with a space', () => {
		assert.equal(getWherePart([secondaryIndex('New field1')]), "WHERE `New field1` LIKE '%'");
	});

	test('escapes a key name with a hyphen', () => {
		assert.equal(getWherePart([secondaryIndex('first-name')]), "WHERE `first-name` LIKE '%'");
	});

	test('escapes each part of a nested key', () => {
		assert.equal(getWherePart([secondaryIndex('address.zip code')]), "WHERE `address`.`zip code` LIKE '%'");
	});

	test('uses the leading key of the index', () => {
		assert.equal(getWherePart([secondaryIndex('name', 'city')]), "WHERE `name` LIKE '%'");
	});

	test('skips indexes without a simple key', () => {
		const collectionIndexes = [
			{ indxType: 'Array', arrayExpr: 'DISTINCT ARRAY t FOR t IN tags END' },
			{ indxType: 'Secondary', indxKey: [], functionExpr: 'LOWER(name)' },
			secondaryIndex('New field1'),
		];

		assert.equal(getWherePart(collectionIndexes), "WHERE `New field1` LIKE '%'");
	});

	test('has no WHERE clause when no index has a simple key', () => {
		const collectionIndexes = [
			{ indxType: 'Array', arrayExpr: 'DISTINCT ARRAY t FOR t IN tags END' },
			{ indxType: 'Metadata', metadataExpr: 'META().id' },
		];

		assert.equal(getWherePart(collectionIndexes), '');
	});

	test('escapes the key of an index read from the instance', async () => {
		mock.method(restApiHelper, 'getIndexes', async () => []);
		const systemIndex = {
			name: 'idx_new_field',
			bucket_id: KEYSPACE.bucketName,
			scope_id: KEYSPACE.scopeName,
			keyspace_id: KEYSPACE.collectionName,
			index_key: ['`New field1`'],
			using: 'gsi',
		};
		const cluster = { query: async () => ({ rows: [{ indexes: systemIndex }] }) };
		const indexes = await getIndexes({ cluster, connectionInfo: {}, logger: { error() {} } });

		assert.equal(getWherePart(indexes.map(({ index }) => index)), "WHERE `New field1` LIKE '%'");
	});
});
