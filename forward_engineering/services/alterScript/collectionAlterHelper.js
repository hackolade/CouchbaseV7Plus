const { getCollectionScript, getDropCollectionScript } = require('../statements/collectionsStatements');
const { AlterScriptDto } = require('./AlterScriptDto');
const { getDeltaItems } = require('./deltaSchemaHelper');

/**
 * @param {{ entity: object }} params
 * @returns {object}
 */
const getCompMod = ({ entity = {} } = {}) => entity.role?.compMod || entity.compMod || {};

/**
 * @param {{ entity: object }} params
 * @returns {object}
 */
const getEntityRole = ({ entity = {} } = {}) => entity.role || entity;

/**
 * @param {{ entity: object, nameType?: 'old' | 'new' | 'current' }} params
 * @returns {string}
 */
const getCollectionName = ({ entity = {}, nameType = 'current' } = {}) => {
	const role = getEntityRole({ entity });
	const compMod = getCompMod({ entity });

	if (nameType === 'old') {
		return compMod.code?.old || compMod.collectionName?.old || role.code || role.collectionName || '';
	}

	if (nameType === 'new') {
		return compMod.code?.new || compMod.collectionName?.new || role.code || role.collectionName || '';
	}

	return role.code || role.collectionName || entity.title || role.name || '';
};

/**
 * @param {{ entity: object }} params
 * @returns {{ namespace: string, bucketName: string, scopeName: string, ifNotExists: boolean }}
 */
const getCollectionContext = ({ entity = {} } = {}) => {
	const role = getEntityRole({ entity });
	const compMod = getCompMod({ entity });
	const bucketProperties = compMod.bucketProperties || {};

	return {
		namespace: bucketProperties.namespace,
		bucketName: bucketProperties.bucket,
		scopeName: compMod.keyspaceName || bucketProperties.code || bucketProperties.name,
		ifNotExists: Boolean(role.ifNotExists),
	};
};

/**
 * @param {{ entity: object, collectionName: string }} params
 * @returns {AlterScriptDto | undefined}
 */
const getCreateCollectionDto = ({ entity, collectionName } = {}) => {
	const context = getCollectionContext({ entity });
	const script = getCollectionScript({
		...context,
		collectionName,
	});

	return AlterScriptDto.getInstance({ script, isDropScript: false, modelLevel: 'collection', scriptPurpose: 'add' });
};

/**
 * @param {{ entity: object, collectionName: string }} params
 * @returns {AlterScriptDto | undefined}
 */
const getDropCollectionDto = ({ entity, collectionName } = {}) => {
	const context = getCollectionContext({ entity });
	const script = getDropCollectionScript({
		...context,
		collectionName,
		ifExists: true,
	});

	return AlterScriptDto.getInstance({
		script,
		isDropScript: true,
		modelLevel: 'collection',
		scriptPurpose: 'deletion',
	});
};

/**
 * @param {{ entity: object }} params
 * @returns {boolean}
 */
const isCollectionRenamed = ({ entity } = {}) => {
	const compMod = getCompMod({ entity });
	const oldName = compMod.code?.old || compMod.collectionName?.old;
	const newName = compMod.code?.new || compMod.collectionName?.new;

	return Boolean(oldName && newName && oldName !== newName);
};

/**
 * @param {{ entity: object }} params
 * @returns {AlterScriptDto[]}
 */
const getAddedCollectionDtos = ({ entity } = {}) => {
	const collectionName = getCollectionName({ entity, nameType: 'new' }) || getCollectionName({ entity });
	return [getCreateCollectionDto({ entity, collectionName })].filter(Boolean);
};

/**
 * @param {{ entity: object }} params
 * @returns {AlterScriptDto[]}
 */
const getDeletedCollectionDtos = ({ entity } = {}) => {
	const collectionName = getCollectionName({ entity, nameType: 'old' }) || getCollectionName({ entity });
	return [getDropCollectionDto({ entity, collectionName })].filter(Boolean);
};

/**
 * @param {{ entity: object }} params
 * @returns {AlterScriptDto[]}
 */
const getModifiedCollectionDtos = ({ entity } = {}) => {
	if (!isCollectionRenamed({ entity })) {
		return [];
	}

	const oldName = getCollectionName({ entity, nameType: 'old' });
	const newName = getCollectionName({ entity, nameType: 'new' });

	return [
		getDropCollectionDto({ entity, collectionName: oldName }),
		getCreateCollectionDto({ entity, collectionName: newName }),
	].filter(Boolean);
};

/**
 * @param {{ schema: object }} params
 * @returns {AlterScriptDto[]}
 */
const getCollectionAlterScriptDtos = ({ schema } = {}) => {
	const addedEntities = getDeltaItems({ schema, nameProperty: 'entities', modify: 'added' });
	const modifiedEntities = getDeltaItems({ schema, nameProperty: 'entities', modify: 'modified' });
	const deletedEntities = getDeltaItems({ schema, nameProperty: 'entities', modify: 'deleted' });

	const addedDtos = addedEntities.flatMap(entity => getAddedCollectionDtos({ entity }));
	const modifiedDtos = modifiedEntities.flatMap(entity => getModifiedCollectionDtos({ entity }));
	const deletedDtos = deletedEntities.flatMap(entity => getDeletedCollectionDtos({ entity }));

	return [...deletedDtos, ...modifiedDtos, ...addedDtos].filter(Boolean);
};

module.exports = {
	getCollectionAlterScriptDtos,
	getCollectionContext,
	getCollectionName,
	getCompMod,
};
