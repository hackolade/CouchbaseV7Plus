const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { getDeltaBucketNames } = require('../../forward_engineering/services/alterScript/deltaSchemaHelper');

const buildSchema = ({ containers = {}, entities = {} }) => ({
	properties: {
		containers: {
			properties: Object.fromEntries(
				Object.entries(containers).map(([modify, items]) => [
					modify,
					{ items: [{ properties: Object.fromEntries(items.map((item, index) => [`c${index}`, item])) }] },
				]),
			),
		},
		entities: {
			properties: Object.fromEntries(
				Object.entries(entities).map(([modify, items]) => [
					modify,
					{ items: [{ properties: Object.fromEntries(items.map((item, index) => [`e${index}`, item])) }] },
				]),
			),
		},
	},
});

const collection = bucket => ({ role: { compMod: { bucketProperties: { bucket } } } });

describe('getDeltaBucketNames', () => {
	test('returns the bucket of a modified collection', () => {
		const schema = buildSchema({ entities: { modified: [collection('inventory')] } });

		assert.deepEqual(getDeltaBucketNames({ schema }), ['inventory']);
	});

	test('returns the bucket of added and deleted scopes', () => {
		const schema = buildSchema({
			containers: { added: [{ role: { bucket: 'travel' } }], deleted: [{ role: { bucket: 'archive' } }] },
		});

		assert.deepEqual(getDeltaBucketNames({ schema }).toSorted(), ['archive', 'travel']);
	});

	test('returns old and new buckets of a scope moved to another bucket', () => {
		const schema = buildSchema({
			containers: { modified: [{ role: { bucket: 'b2', compMod: { bucket: { old: 'b1', new: 'b2' } } } }] },
		});

		assert.deepEqual(getDeltaBucketNames({ schema }).toSorted(), ['b1', 'b2']);
	});

	test('returns each bucket once', () => {
		const schema = buildSchema({
			containers: { modified: [{ role: { bucket: 'inventory' } }] },
			entities: { modified: [collection('inventory'), collection('inventory')] },
		});

		assert.deepEqual(getDeltaBucketNames({ schema }), ['inventory']);
	});

	test('returns an empty list for an empty schema', () => {
		assert.deepEqual(getDeltaBucketNames({ schema: {} }), []);
		assert.deepEqual(getDeltaBucketNames(), []);
	});
});
