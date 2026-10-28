const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
	getIndexScript,
	getAlterIndexScript,
	getDropIndexScript,
	getIndexIdentifier,
	isReplicaCountSet,
} = require('../../forward_engineering/services/statements/indexesStatements');

const KEYSPACE = { bucketName: 'bucket', scopeName: 'scope', collectionName: 'collection' };

const BASE_INDEXES = {
	Primary: { indxType: 'Primary' },
	Secondary: { indxType: 'Secondary', indxKey: [{ name: 'name', type: 'ascending' }] },
	Array: { indxType: 'Array', arrayExpr: 'DISTINCT ARRAY t FOR t IN tags END' },
	Metadata: { indxType: 'Metadata', metadataExpr: 'META().id' },
};

const NODES = [{ nodeName: 'node1:8091' }, { nodeName: 'node2:8091' }];

const buildIndex = ({ type, withOptions, ...rest }) => ({
	...KEYSPACE,
	...BASE_INDEXES[type],
	indxName: `idx_${type.toLowerCase()}`,
	isActivated: true,
	withOptions,
	...rest,
});

const getWithPart = script => script.match(/WITH\{.*\}/u)?.[0];

describe('getIndexScript WITH clause', () => {
	for (const type of Object.keys(BASE_INDEXES)) {
		describe(`${type} index`, () => {
			for (const emptyValue of [undefined, null, '']) {
				test(`omits num_replica when it is ${JSON.stringify(emptyValue)}`, () => {
					const script = getIndexScript(buildIndex({ type, withOptions: { num_replica: emptyValue } }));

					assert.ok(!script.includes('num_replica'));
					assert.ok(!script.includes('WITH'));
				});
			}

			test('writes num_replica 0', () => {
				const script = getIndexScript(buildIndex({ type, withOptions: { num_replica: 0 } }));

				assert.equal(getWithPart(script), 'WITH{"num_replica":0}');
			});

			test('writes num_replica 1', () => {
				const script = getIndexScript(buildIndex({ type, withOptions: { num_replica: 1 } }));

				assert.equal(getWithPart(script), 'WITH{"num_replica":1}');
			});

			test('combines num_replica with defer_build', () => {
				const script = getIndexScript(buildIndex({ type, withOptions: { defer_build: true, num_replica: 1 } }));

				assert.equal(getWithPart(script), 'WITH{"defer_build":true,"num_replica":1}');
			});

			test('combines num_replica with nodes', () => {
				const script = getIndexScript(buildIndex({ type, withOptions: { num_replica: 1, nodes: NODES } }));

				assert.equal(getWithPart(script), 'WITH{"num_replica":1,"nodes":["node1:8091","node2:8091"]}');
			});

			test('combines defer_build, num_replica and nodes', () => {
				const script = getIndexScript(
					buildIndex({ type, withOptions: { defer_build: true, num_replica: 0, nodes: NODES } }),
				);

				assert.equal(
					getWithPart(script),
					'WITH{"defer_build":true,"num_replica":0,"nodes":["node1:8091","node2:8091"]}',
				);
			});

			for (const invalidValue of [-1, 1.5, 'abc', true]) {
				test(`skips invalid num_replica ${JSON.stringify(invalidValue)}`, () => {
					const script = getIndexScript(buildIndex({ type, withOptions: { num_replica: invalidValue } }));

					assert.ok(!script.includes('num_replica'));
				});
			}

			test('writes a numeric string from a legacy model as a number', () => {
				const script = getIndexScript(buildIndex({ type, withOptions: { num_replica: '2' } }));

				assert.equal(getWithPart(script), 'WITH{"num_replica":2}');
			});
		});
	}
});

describe('getIndexScript regression', () => {
	test('Primary index full statement', () => {
		const script = getIndexScript(
			buildIndex({ type: 'Primary', usingGSI: true, withOptions: { defer_build: true, num_replica: 1 } }),
		);

		assert.equal(
			script,
			'CREATE PRIMARY INDEX `idx_primary`\n\tON `bucket`.`scope`.`collection`\n\tUSING GSI\n\tWITH{"defer_build":true,"num_replica":1};',
		);
	});

	test('Secondary index keeps clause order', () => {
		const script = getIndexScript(
			buildIndex({
				type: 'Secondary',
				partitionByHash: 'Expression',
				partitionByHashExpr: 'name',
				whereClause: 'age > 18',
				usingGSI: true,
				withOptions: { num_replica: 2, nodes: NODES },
			}),
		);

		assert.equal(
			script,
			'CREATE INDEX `idx_secondary`\n\tON `bucket`.`scope`.`collection`(`name` ASC)\n\tPARTITION BY HASH(name)\n\tWHERE age > 18\n\tUSING GSI\n\tWITH{"num_replica":2,"nodes":["node1:8091","node2:8091"]};',
		);
	});

	test('Array index with defer_build only is unchanged', () => {
		const script = getIndexScript(buildIndex({ type: 'Array', withOptions: { defer_build: true } }));

		assert.equal(getWithPart(script), 'WITH{"defer_build":true}');
	});

	test('Primary index with nodes only is unchanged', () => {
		const script = getIndexScript(buildIndex({ type: 'Primary', withOptions: { nodes: NODES } }));

		assert.equal(getWithPart(script), 'WITH{"nodes":["node1:8091","node2:8091"]}');
	});

	test('Metadata index without options has no WITH clause', () => {
		const script = getIndexScript(buildIndex({ type: 'Metadata', withOptions: { defer_build: false } }));

		assert.equal(script, 'CREATE INDEX `idx_metadata`\n\tON `bucket`.`scope`.`collection`(META().id);');
	});
});

describe('getIndexScript clauses shared by index types', () => {
	for (const type of Object.keys(BASE_INDEXES)) {
		test(`${type} index writes PARTITION BY HASH with an expression`, () => {
			const script = getIndexScript(
				buildIndex({ type, partitionByHash: 'Expression', partitionByHashExpr: 'META().id' }),
			);

			assert.ok(script.includes('\n\tPARTITION BY HASH(META().id)'));
		});

		test(`${type} index writes PARTITION BY HASH with keys`, () => {
			const script = getIndexScript(
				buildIndex({ type, partitionByHash: 'Keys', partitionByHashKeys: [{ name: 'country' }] }),
			);

			assert.ok(script.includes('\n\tPARTITION BY HASH(`country`)'));
		});

		test(`${type} index skips PARTITION BY HASH without keys or expression`, () => {
			const withoutKeys = getIndexScript(buildIndex({ type, partitionByHash: 'Keys' }));
			const withoutExpression = getIndexScript(buildIndex({ type, partitionByHash: 'Expression' }));

			assert.ok(!withoutKeys.includes('PARTITION'));
			assert.ok(!withoutExpression.includes('PARTITION'));
		});

		test(`${type} index writes USING GSI`, () => {
			const script = getIndexScript(buildIndex({ type, usingGSI: true }));

			assert.ok(script.includes('\n\tUSING GSI'));
		});
	}

	for (const type of ['Secondary', 'Array', 'Metadata']) {
		test(`${type} index writes the WHERE clause`, () => {
			const script = getIndexScript(buildIndex({ type, whereClause: 'age > 18' }));

			assert.ok(script.includes('\n\tWHERE age > 18'));
		});
	}

	test('Primary index ignores the WHERE clause', () => {
		const script = getIndexScript(buildIndex({ type: 'Primary', whereClause: 'age > 18' }));

		assert.ok(!script.includes('WHERE'));
	});

	test('Metadata index full statement keeps clause order', () => {
		const script = getIndexScript(
			buildIndex({
				type: 'Metadata',
				partitionByHash: 'Expression',
				partitionByHashExpr: 'META().id',
				whereClause: 'META().id > "a"',
				usingGSI: true,
				withOptions: { defer_build: true, num_replica: 1 },
			}),
		);

		assert.equal(
			script,
			'CREATE INDEX `idx_metadata`\n\tON `bucket`.`scope`.`collection`(META().id)\n\tPARTITION BY HASH(META().id)\n\tWHERE META().id > "a"\n\tUSING GSI\n\tWITH{"defer_build":true,"num_replica":1};',
		);
	});
});

describe('index name', () => {
	test('Primary index without name is created as the default primary index', () => {
		const script = getIndexScript(buildIndex({ type: 'Primary', indxName: '', usingGSI: true }));

		assert.equal(script, 'CREATE PRIMARY INDEX\n\tON `bucket`.`scope`.`collection`\n\tUSING GSI;');
	});

	test('Primary index without name keeps IF NOT EXISTS', () => {
		const script = getIndexScript(buildIndex({ type: 'Primary', indxName: '', ifNotExists: true }));

		assert.equal(script, 'CREATE PRIMARY INDEX IF NOT EXISTS\n\tON `bucket`.`scope`.`collection`;');
	});

	for (const type of ['Secondary', 'Array', 'Metadata']) {
		test(`${type} index without name is not generated`, () => {
			assert.equal(getIndexScript(buildIndex({ type, indxName: '' })), '');
		});
	}

	test('getIndexIdentifier uses #primary only for an unnamed Primary index', () => {
		assert.equal(getIndexIdentifier({ indxName: '', indxType: 'Primary' }), '#primary');
		assert.equal(getIndexIdentifier({ indxName: 'idx', indxType: 'Primary' }), 'idx');
		assert.equal(getIndexIdentifier({ indxName: '', indxType: 'Secondary' }), '');
	});

	test('drops an unnamed Primary index with DROP PRIMARY INDEX', () => {
		const script = getDropIndexScript({ ...KEYSPACE, indxName: '', indxType: 'Primary', usingGSI: true });

		assert.equal(script, 'DROP PRIMARY INDEX IF EXISTS ON `bucket`.`scope`.`collection` USING GSI;');
	});

	test('drops a named Primary index with DROP INDEX', () => {
		const script = getDropIndexScript({ ...KEYSPACE, indxName: 'idx', indxType: 'Primary' });

		assert.equal(script, 'DROP INDEX `idx` IF EXISTS ON `bucket`.`scope`.`collection`;');
	});

	test('alters an unnamed Primary index through #primary', () => {
		const script = getAlterIndexScript({
			...KEYSPACE,
			indxName: '',
			indxType: 'Primary',
			action: 'replica_count',
			num_replica: 1,
		});

		assert.equal(
			script,
			'ALTER INDEX `#primary` ON `bucket`.`scope`.`collection` WITH {"action":"replica_count","num_replica":1};',
		);
	});
});

describe('getAlterIndexScript replica_count', () => {
	test('writes num_replica 0', () => {
		const script = getAlterIndexScript({
			...KEYSPACE,
			indxName: 'idx',
			action: 'replica_count',
			num_replica: 0,
		});

		assert.equal(
			script,
			'ALTER INDEX `idx` ON `bucket`.`scope`.`collection` WITH {"action":"replica_count","num_replica":0};',
		);
	});

	test('returns an empty script for an invalid num_replica', () => {
		const script = getAlterIndexScript({
			...KEYSPACE,
			indxName: 'idx',
			action: 'replica_count',
			num_replica: -1,
		});

		assert.equal(script, '');
	});
});

describe('isReplicaCountSet', () => {
	test('accepts non-negative integers', () => {
		for (const value of [0, 1, 5, '0', '3']) {
			assert.equal(isReplicaCountSet({ num_replica: value }), true, `value ${JSON.stringify(value)}`);
		}
	});

	test('rejects empty and invalid values', () => {
		for (const value of [undefined, null, '', ' ', -1, 1.5, 'abc', true, NaN]) {
			assert.equal(isReplicaCountSet({ num_replica: value }), false, `value ${JSON.stringify(value)}`);
		}
	});
});
