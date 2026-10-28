const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { parseN1qlStatements } = require('../../reverse_engineering/helpers/parserHelper');
const { getIndexes } = require('../../reverse_engineering/helpers/indexHelper');

const parseIndex = statement => parseN1qlStatements({ statements: `${statement};` }).indexes[0].index;

const getInstanceIndex = async systemIndex => {
	const cluster = { query: async () => ({ rows: [{ indexes: systemIndex }] }) };
	const [indexData] = await getIndexes({ cluster, connectionInfo: {}, logger: { error() {} } });

	return indexData.index;
};

describe('DDL reverse-engineering of indexes', () => {
	test('unnamed Primary index gets an empty name', () => {
		assert.equal(parseIndex('CREATE PRIMARY INDEX ON `b`.`s`.`c`').indxName, '');
	});

	test('Primary, Array and Metadata indexes without partition have no partition properties', () => {
		const indexes = [
			parseIndex('CREATE PRIMARY INDEX `p` ON `b`.`s`.`c` USING GSI'),
			parseIndex('CREATE INDEX `a` ON `b`.`s`.`c`(DISTINCT ARRAY t FOR t IN tags END)'),
			parseIndex('CREATE INDEX `m` ON `b`.`s`.`c`(META().id)'),
		];

		for (const index of indexes) {
			assert.ok(!('partitionByHash' in index), index.indxType);
			assert.ok(!('partitionByHashExpr' in index), index.indxType);
		}
	});

	test('#primary index gets an empty name', () => {
		assert.equal(parseIndex('CREATE PRIMARY INDEX `#primary` ON `b`.`s`.`c`').indxName, '');
	});

	test('Primary index keeps its partition', () => {
		const index = parseIndex('CREATE PRIMARY INDEX `p` ON `b`.`s`.`c` PARTITION BY HASH(META().id) USING GSI');

		assert.equal(index.indxName, 'p');
		assert.equal(index.partitionByHash, 'Expression');
		assert.equal(index.partitionByHashExpr, 'META().id');
		assert.equal(index.usingGSI, true);
	});

	test('Metadata index keeps partition, WHERE, USING GSI and WITH', () => {
		const index = parseIndex(
			'CREATE INDEX `m` ON `b`.`s`.`c`(META().id) PARTITION BY HASH(META().id) WHERE META().id > "a" USING GSI WITH {"defer_build":true,"num_replica":0,"nodes":["n1:8091"]}',
		);

		assert.equal(index.indxType, 'Metadata');
		assert.equal(index.partitionByHash, 'Expression');
		assert.equal(index.partitionByHashExpr, 'META().id');
		assert.ok(index.whereClause);
		assert.equal(index.usingGSI, true);
		assert.deepEqual(index.withOptions, { defer_build: true, num_replica: 0, nodes: [{ nodeName: 'n1:8091' }] });
	});

	test('Array index keeps its partition', () => {
		const index = parseIndex(
			'CREATE INDEX `a` ON `b`.`s`.`c`(DISTINCT ARRAY t FOR t IN tags END) PARTITION BY HASH(name) WITH {"num_replica":2}',
		);

		assert.equal(index.indxType, 'Array');
		assert.equal(index.partitionByHash, 'Expression');
		assert.equal(index.partitionByHashExpr, 'name');
		assert.deepEqual(index.withOptions, { num_replica: 2 });
	});
});

describe('instance reverse-engineering of indexes without partition', () => {
	const keyspace = { using: 'gsi', bucket_id: 'inventory', scope_id: 'inventory', keyspace_id: 'route' };

	test('Primary index has no partition properties', async () => {
		const index = await getInstanceIndex({ ...keyspace, name: 'def_inventory_route_primary', is_primary: true });

		assert.deepEqual(index, { indxName: 'def_inventory_route_primary', indxType: 'Primary', usingGSI: true });
	});

	test('Array index has no partition properties', async () => {
		const index = await getInstanceIndex({
			...keyspace,
			name: 'def_inventory_route_schedule_utc',
			index_key: ['array (`s`.`utc`) for `s` in `schedule` end'],
		});

		assert.deepEqual(index, {
			indxName: 'def_inventory_route_schedule_utc',
			indxType: 'Array',
			usingGSI: true,
			arrayExpr: 'array (`s`.`utc`) for `s` in `schedule` end',
		});
	});

	test('Metadata index has no partition properties', async () => {
		const index = await getInstanceIndex({ ...keyspace, name: 'm', index_key: ['(meta().`id`)'] });

		assert.ok(!('partitionByHash' in index));
		assert.ok(!('partitionByHashExpr' in index));
	});

	test('Secondary index keeps an empty partitionByHash', async () => {
		const index = await getInstanceIndex({
			...keyspace,
			name: 'def_inventory_route_sourceairport',
			index_key: ['`sourceairport`'],
		});

		assert.equal(index.partitionByHash, '');
	});
});

describe('instance reverse-engineering of indexes', () => {
	test('#primary index gets an empty name and keeps its partition', async () => {
		const index = await getInstanceIndex({
			name: '#primary',
			is_primary: true,
			using: 'gsi',
			bucket_id: 'b',
			scope_id: 's',
			keyspace_id: 'c',
			partition: 'HASH(META().id)',
		});

		assert.equal(index.indxName, '');
		assert.equal(index.partitionByHash, 'Expression');
		assert.equal(index.partitionByHashExpr, 'META().id');
	});

	test('Metadata index keeps partition, WHERE and USING GSI', async () => {
		const index = await getInstanceIndex({
			name: 'm',
			using: 'gsi',
			bucket_id: 'b',
			scope_id: 's',
			keyspace_id: 'c',
			index_key: ['(meta().`id`)'],
			condition: '(meta().`id` > "a")',
			partition: 'HASH((meta().`id`))',
		});

		assert.equal(index.indxType, 'Metadata');
		assert.equal(index.usingGSI, true);
		assert.equal(index.whereClause, '(meta().`id` > "a")');
		assert.equal(index.partitionByHash, 'Expression');
	});

	test('Array index keeps its partition', async () => {
		const index = await getInstanceIndex({
			name: 'a',
			using: 'gsi',
			bucket_id: 'b',
			scope_id: 's',
			keyspace_id: 'c',
			index_key: ['(distinct (array `t` for `t` in `tags` end))'],
			partition: 'HASH(`name`)',
		});

		assert.equal(index.indxType, 'Array');
		assert.equal(index.partitionByHash, 'Expression');
		assert.equal(index.partitionByHashExpr, '`name`');
	});
});
