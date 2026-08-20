const { isEqual, omit, isEmpty } = require('lodash');
const { getIndexKeyIdToKeyNameMap, injectKeysNamesIntoIndexKeys } = require('../../utils/indexes');
const { getIndexScript, getDropIndexScript, getAlterIndexScript } = require('../statements/indexesStatements');
const { commentStatement } = require('./commentHelper');
const { AlterScriptDto } = require('./AlterScriptDto');
const { getDeltaItems, normalizeProperties } = require('./deltaSchemaHelper');
const {
	getCollectionContext,
	getCollectionName,
	getCompMod,
	getEntityRole,
	isCollectionCreated,
	isCollectionDeleted,
	isCollectionRenamed,
} = require('./collectionAlterHelper');

const NON_STRUCTURAL_INDEX_FIELDS = ['indxComments', 'indxDescription', 'id', 'GUID'];

/**
 * @param {{ entity: object }} params
 * @returns {object}
 */
const getEntityProperties = ({ entity = {} } = {}) => {
	const role = getEntityRole({ entity });

	return {
		...normalizeProperties({ properties: entity.properties }),
		...normalizeProperties({ properties: role.properties }),
	};
};

/**
 * @param {{ entity: object, nameType?: 'old' | 'new' }} params
 * @returns {object}
 */
const getKeyIdToNameMap = ({ entity, nameType = 'new' } = {}) => {
	const compMod = getCompMod({ entity });
	const hashTable = nameType === 'old' ? compMod.oldIdToNameHashTable : compMod.newIdToNameHashTable;

	if (!isEmpty(hashTable)) {
		return hashTable;
	}

	return getIndexKeyIdToKeyNameMap(getEntityProperties({ entity }));
};

/**
 * @param {{ index: object, keyIdToName: object }} params
 * @returns {object}
 */
const prepareIndex = ({ index = {}, keyIdToName = {} } = {}) => ({
	...index,
	...injectKeysNamesIntoIndexKeys({ index, keyIdToName }),
	ifNotExists: index.ifNotExists,
	isActivated: index.isActivated !== false,
});

/**
 * @param {{ keys?: object[] }} params
 * @returns {object[]}
 */
const normalizeIndexKeys = ({ keys = [] } = {}) => keys.map(key => omit(key, ['keyId', 'id', 'GUID']));

/**
 * @param {{ nodes?: Array<{ nodeName?: string } | string> }} params
 * @returns {string[]}
 */
const normalizeNodes = ({ nodes = [] } = {}) =>
	nodes.map(node => (typeof node === 'string' ? node : node?.nodeName)).filter(Boolean);

/**
 * @param {{ index: object }} params
 * @returns {object}
 */
const getComparableIndex = ({ index = {} } = {}) => {
	const comparableIndex = omit(index, NON_STRUCTURAL_INDEX_FIELDS);

	return {
		...comparableIndex,
		indxKey: normalizeIndexKeys({ keys: index.indxKey }),
		partitionByHashKeys: normalizeIndexKeys({ keys: index.partitionByHashKeys }),
		withOptions: {
			defer_build: Boolean(index.withOptions?.defer_build),
			num_replica: index.withOptions?.num_replica,
			nodes: normalizeNodes({ nodes: index.withOptions?.nodes }),
		},
	};
};

/**
 * @param {{ index: object }} params
 * @returns {object}
 */
const getComparableIndexDefinition = ({ index = {} } = {}) => omit(getComparableIndex({ index }), ['withOptions']);

/**
 * @param {{ oldIndex: object, newIndex: object }} params
 * @returns {{
 *   type: 'noop' | 'recreate' | 'alter',
 *   action?: 'move' | 'replica_count',
 *   nodes?: object[],
 *   num_replica?: number
 * }}
 */
const classifyIndexChange = ({ oldIndex, newIndex } = {}) => {
	if (isEqual(getComparableIndex({ index: oldIndex }), getComparableIndex({ index: newIndex }))) {
		return { type: 'noop' };
	}

	if (
		!isEqual(getComparableIndexDefinition({ index: oldIndex }), getComparableIndexDefinition({ index: newIndex }))
	) {
		return { type: 'recreate' };
	}

	const oldOptions = oldIndex.withOptions || {};
	const newOptions = newIndex.withOptions || {};
	const nodesChanged = !isEqual(
		normalizeNodes({ nodes: oldOptions.nodes }),
		normalizeNodes({ nodes: newOptions.nodes }),
	);
	const replicaChanged = !isEqual(oldOptions.num_replica, newOptions.num_replica);
	const deferBuildChanged = Boolean(oldOptions.defer_build) !== Boolean(newOptions.defer_build);

	if (deferBuildChanged || (nodesChanged && replicaChanged)) {
		return { type: 'recreate' };
	}

	if (nodesChanged) {
		if (normalizeNodes({ nodes: newOptions.nodes }).length === 0) {
			return { type: 'recreate' };
		}

		return { type: 'alter', action: 'move', nodes: newOptions.nodes || [] };
	}

	if (replicaChanged) {
		if (newOptions.num_replica === undefined || newOptions.num_replica === null || newOptions.num_replica === '') {
			return { type: 'recreate' };
		}

		return { type: 'alter', action: 'replica_count', num_replica: newOptions.num_replica };
	}

	return { type: 'recreate' };
};

/**
 * @param {{ entity: object, collectionName: string, index: object }} params
 * @returns {AlterScriptDto | undefined}
 */
const getCreateIndexDto = ({ entity, collectionName, index } = {}) => {
	const { namespace, bucketName, scopeName } = getCollectionContext({ entity });
	const script = getIndexScript({
		...index,
		namespace,
		bucketName,
		scopeName,
		collectionName,
	});

	if (!script) {
		return;
	}

	const preparedScript = index.isActivated === false ? commentStatement({ statement: script }) : script;

	return AlterScriptDto.getInstance({
		script: preparedScript,
		isDropScript: false,
		modelLevel: 'index',
		scriptPurpose: 'add',
	});
};

/**
 * @param {{ entity: object, collectionName: string, index: object }} params
 * @returns {AlterScriptDto | undefined}
 */
const getDropIndexDto = ({ entity, collectionName, index } = {}) => {
	const { namespace, bucketName, scopeName } = getCollectionContext({ entity });
	const script = getDropIndexScript({
		...index,
		namespace,
		bucketName,
		scopeName,
		collectionName,
	});

	return AlterScriptDto.getInstance({
		script,
		isDropScript: true,
		modelLevel: 'index',
		scriptPurpose: 'deletion',
	});
};

/**
 * @param {{
 *   entity: object,
 *   collectionName: string,
 *   index: object,
 *   action: 'move' | 'replica_count',
 *   nodes?: object[],
 *   num_replica?: number
 * }} params
 * @returns {AlterScriptDto | undefined}
 */
const getAlterIndexDto = ({ entity, collectionName, index, action, nodes, num_replica } = {}) => {
	const { namespace, bucketName, scopeName } = getCollectionContext({ entity });
	const script = getAlterIndexScript({
		...index,
		namespace,
		bucketName,
		scopeName,
		collectionName,
		action,
		nodes,
		num_replica,
	});

	return AlterScriptDto.getInstance({
		script,
		isDropScript: false,
		modelLevel: 'index',
		scriptPurpose: 'modify',
	});
};

/**
 * @param {{
 *   entity: object,
 *   collectionName: string,
 *   indexes?: object[],
 *   nameType?: 'old' | 'new'
 * }} params
 * @returns {object[]}
 */
const getPreparedIndexes = ({ entity, indexes = [], nameType = 'new' } = {}) => {
	const keyIdToName = getKeyIdToNameMap({ entity, nameType });
	return indexes.map(index => prepareIndex({ index, keyIdToName })).filter(index => index.indxName);
};

/**
 * @param {{
 *   entity: object,
 *   collectionName: string,
 *   indexes?: object[],
 *   nameType?: 'old' | 'new'
 * }} params
 * @returns {AlterScriptDto[]}
 */
const getCreateIndexDtos = ({ entity, collectionName, indexes = [], nameType = 'new' } = {}) =>
	getPreparedIndexes({ entity, indexes, nameType }).flatMap(index => {
		const dto = getCreateIndexDto({ entity, collectionName, index });
		return dto ? [dto] : [];
	});

/**
 * @param {{
 *   entity: object,
 *   collectionName: string,
 *   indexes?: object[],
 *   nameType?: 'old' | 'new'
 * }} params
 * @returns {AlterScriptDto[]}
 */
const getDropIndexDtos = ({ entity, collectionName, indexes = [], nameType = 'old' } = {}) =>
	getPreparedIndexes({ entity, indexes, nameType }).flatMap(index => {
		const dto = getDropIndexDto({ entity, collectionName, index });
		return dto ? [dto] : [];
	});

/**
 * @param {{ indexes?: object[] }} params
 * @returns {Map<string, object>}
 */
const getIndexesByName = ({ indexes = [] } = {}) =>
	new Map(indexes.filter(index => index.indxName).map(index => [index.indxName, index]));

/**
 * @param {{
 *   entity: object,
 *   collectionName: string,
 *   oldIndexes?: object[],
 *   newIndexes?: object[]
 * }} params
 * @returns {AlterScriptDto[]}
 */
const getIndexChangeDtos = ({ entity, collectionName, oldIndexes = [], newIndexes = [] } = {}) => {
	const preparedOldIndexes = getPreparedIndexes({ entity, indexes: oldIndexes, nameType: 'old' });
	const preparedNewIndexes = getPreparedIndexes({ entity, indexes: newIndexes, nameType: 'new' });
	const oldIndexesByName = getIndexesByName({ indexes: preparedOldIndexes });
	const newIndexesByName = getIndexesByName({ indexes: preparedNewIndexes });
	const indexNames = new Set([...oldIndexesByName.keys(), ...newIndexesByName.keys()]);

	return [...indexNames].reduce((scriptDtos, indexName) => {
		const oldIndex = oldIndexesByName.get(indexName);
		const newIndex = newIndexesByName.get(indexName);

		if (!oldIndex) {
			scriptDtos.push(...getCreateIndexDtos({ entity, collectionName, indexes: [newIndex], nameType: 'new' }));
			return scriptDtos;
		}

		if (!newIndex) {
			scriptDtos.push(...getDropIndexDtos({ entity, collectionName, indexes: [oldIndex], nameType: 'old' }));
			return scriptDtos;
		}

		const classification = classifyIndexChange({ oldIndex, newIndex });

		if (classification.type === 'alter') {
			const dto = getAlterIndexDto({
				entity,
				collectionName,
				index: newIndex,
				action: classification.action,
				nodes: classification.nodes,
				num_replica: classification.num_replica,
			});
			if (dto) {
				scriptDtos.push(dto);
			}
			return scriptDtos;
		}

		if (classification.type === 'recreate') {
			scriptDtos.push(
				...getDropIndexDtos({ entity, collectionName, indexes: [oldIndex], nameType: 'old' }),
				...getCreateIndexDtos({ entity, collectionName, indexes: [newIndex], nameType: 'new' }),
			);
		}

		return scriptDtos;
	}, []);
};

/**
 * @param {{ entity: object }} params
 * @returns {AlterScriptDto[]}
 */
const getCreatedCollectionIndexDtos = ({ entity } = {}) => {
	const role = getEntityRole({ entity });
	const collectionName = getCollectionName({ entity, nameType: 'new' }) || getCollectionName({ entity });

	return getCreateIndexDtos({
		entity,
		collectionName,
		indexes: role.indexes || [],
		nameType: 'new',
	});
};

/**
 * @param {{ entity: object }} params
 * @returns {AlterScriptDto[]}
 */
const getDeletedCollectionIndexDtos = ({ entity } = {}) => {
	const role = getEntityRole({ entity });
	const collectionName = getCollectionName({ entity, nameType: 'old' }) || getCollectionName({ entity });

	return getDropIndexDtos({
		entity,
		collectionName,
		indexes: role.indexes || [],
		nameType: 'old',
	});
};

/**
 * @param {{ entity: object }} params
 * @returns {AlterScriptDto[]}
 */
const getRenamedCollectionIndexDtos = ({ entity } = {}) => {
	const role = getEntityRole({ entity });
	const compMod = getCompMod({ entity });
	const oldCollectionName = getCollectionName({ entity, nameType: 'old' }) || getCollectionName({ entity });
	const newCollectionName = getCollectionName({ entity, nameType: 'new' }) || getCollectionName({ entity });

	return [
		...getDropIndexDtos({
			entity,
			collectionName: oldCollectionName,
			indexes: compMod.indexes?.old || role.indexes || [],
			nameType: 'old',
		}),
		...getCreateIndexDtos({
			entity,
			collectionName: newCollectionName,
			indexes: compMod.indexes?.new || role.indexes || [],
			nameType: 'new',
		}),
	];
};

/**
 * @param {{ entity: object }} params
 * @returns {AlterScriptDto[]}
 */
const getEntityIndexDtos = ({ entity } = {}) => {
	if (isCollectionCreated({ entity })) {
		return getCreatedCollectionIndexDtos({ entity });
	}

	if (isCollectionDeleted({ entity })) {
		return getDeletedCollectionIndexDtos({ entity });
	}

	if (isCollectionRenamed({ entity })) {
		return getRenamedCollectionIndexDtos({ entity });
	}

	const compMod = getCompMod({ entity });

	if (!compMod.indexes) {
		return [];
	}

	return getIndexChangeDtos({
		entity,
		collectionName: getCollectionName({ entity, nameType: 'new' }) || getCollectionName({ entity }),
		oldIndexes: compMod.indexes.old || [],
		newIndexes: compMod.indexes.new || [],
	});
};

/**
 * @param {{ schema: object }} params
 * @returns {AlterScriptDto[]}
 */
const getIndexAlterScriptDtos = ({ schema } = {}) => {
	const addedEntities = getDeltaItems({ schema, nameProperty: 'entities', modify: 'added' });
	const modifiedEntities = getDeltaItems({ schema, nameProperty: 'entities', modify: 'modified' });
	const deletedEntities = getDeltaItems({ schema, nameProperty: 'entities', modify: 'deleted' });

	return [...deletedEntities, ...modifiedEntities, ...addedEntities]
		.flatMap(entity => getEntityIndexDtos({ entity }))
		.filter(Boolean);
};

module.exports = {
	getIndexAlterScriptDtos,
	classifyIndexChange,
};
