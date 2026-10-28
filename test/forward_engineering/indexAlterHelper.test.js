const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
	classifyIndexChange,
	getIndexAlterScriptDtos,
} = require('../../forward_engineering/services/alterScript/indexAlterHelper');

const buildModifiedCollectionSchema = ({ oldIndexes, newIndexes }) => ({
	properties: {
		entities: {
			properties: {
				modified: {
					items: [
						{
							properties: {
								collection: {
									role: {
										code: 'collection',
										compMod: {
											bucketProperties: { bucket: 'bucket', code: 'scope' },
											indexes: { old: oldIndexes, new: newIndexes },
										},
									},
								},
							},
						},
					],
				},
			},
		},
	},
});

const getScripts = ({ oldIndexes, newIndexes }) =>
	getIndexAlterScriptDtos({ schema: buildModifiedCollectionSchema({ oldIndexes, newIndexes }) }).map(
		dto => dto.script,
	);

const buildIndex = withOptions => ({
	indxName: 'idx',
	indxType: 'Secondary',
	indxKey: [{ name: 'name', type: 'ascending' }],
	withOptions,
});

describe('classifyIndexChange num_replica', () => {
	test('undefined to 0 alters the replica count', () => {
		const result = classifyIndexChange({ oldIndex: buildIndex({}), newIndex: buildIndex({ num_replica: 0 }) });

		assert.deepEqual(result, { type: 'alter', action: 'replica_count', num_replica: 0 });
	});

	test('1 to 2 alters the replica count', () => {
		const result = classifyIndexChange({
			oldIndex: buildIndex({ num_replica: 1 }),
			newIndex: buildIndex({ num_replica: 2 }),
		});

		assert.deepEqual(result, { type: 'alter', action: 'replica_count', num_replica: 2 });
	});

	test('1 to undefined recreates the index', () => {
		const result = classifyIndexChange({ oldIndex: buildIndex({ num_replica: 1 }), newIndex: buildIndex({}) });

		assert.deepEqual(result, { type: 'recreate' });
	});

	test('undefined to empty string is a noop', () => {
		const result = classifyIndexChange({ oldIndex: buildIndex({}), newIndex: buildIndex({ num_replica: '' }) });

		assert.deepEqual(result, { type: 'noop' });
	});

	test('null to undefined is a noop', () => {
		const result = classifyIndexChange({
			oldIndex: buildIndex({ num_replica: null }),
			newIndex: buildIndex({}),
		});

		assert.deepEqual(result, { type: 'noop' });
	});

	test('nodes and replica count changed together recreate the index', () => {
		const result = classifyIndexChange({
			oldIndex: buildIndex({ num_replica: 1, nodes: [{ nodeName: 'node1:8091' }] }),
			newIndex: buildIndex({ num_replica: 2, nodes: [{ nodeName: 'node2:8091' }] }),
		});

		assert.deepEqual(result, { type: 'recreate' });
	});

	test('defer_build change recreates the index', () => {
		const result = classifyIndexChange({
			oldIndex: buildIndex({ num_replica: 1, defer_build: false }),
			newIndex: buildIndex({ num_replica: 1, defer_build: true }),
		});

		assert.deepEqual(result, { type: 'recreate' });
	});
});

const unnamedPrimary = withOptions => ({ indxName: '', indxType: 'Primary', withOptions });

describe('getIndexAlterScriptDtos with an unnamed Primary index', () => {
	test('creates an added unnamed Primary index', () => {
		const scripts = getScripts({ oldIndexes: [], newIndexes: [unnamedPrimary({})] });

		assert.deepEqual(scripts, ['CREATE PRIMARY INDEX\n\tON `bucket`.`scope`.`collection`;']);
	});

	test('drops a deleted unnamed Primary index', () => {
		const scripts = getScripts({ oldIndexes: [unnamedPrimary({})], newIndexes: [] });

		assert.deepEqual(scripts, ['DROP PRIMARY INDEX IF EXISTS ON `bucket`.`scope`.`collection`;']);
	});

	test('alters the replica count of an unnamed Primary index', () => {
		const scripts = getScripts({
			oldIndexes: [unnamedPrimary({ num_replica: 1 })],
			newIndexes: [unnamedPrimary({ num_replica: 2 })],
		});

		assert.deepEqual(scripts, [
			'ALTER INDEX `#primary` ON `bucket`.`scope`.`collection` WITH {"action":"replica_count","num_replica":2};',
		]);
	});

	test('recreates the index when an unnamed Primary index gets a partition', () => {
		const scripts = getScripts({
			oldIndexes: [unnamedPrimary({})],
			newIndexes: [{ ...unnamedPrimary({}), partitionByHash: 'Expression', partitionByHashExpr: 'META().id' }],
		});

		assert.deepEqual(scripts, [
			'DROP PRIMARY INDEX IF EXISTS ON `bucket`.`scope`.`collection`;',
			'CREATE PRIMARY INDEX\n\tON `bucket`.`scope`.`collection`\n\tPARTITION BY HASH(META().id);',
		]);
	});
});
