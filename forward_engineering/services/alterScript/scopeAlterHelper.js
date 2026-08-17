const { getScopeScript, getDropScopeScript } = require('../statements/scopesStatements');
const { AlterScriptDto } = require('./AlterScriptDto');
const { getDeltaItems } = require('./deltaSchemaHelper');

/**
 * @param {{ container: object }} params
 * @returns {object}
 */
const getCompMod = ({ container = {} } = {}) => container.role?.compMod || container.compMod || {};

/**
 * @param {{ container: object }} params
 * @returns {object}
 */
const getContainerRole = ({ container = {} } = {}) => container.role || container;

/**
 * @param {{
 *   container: object,
 *   nameType?: 'old' | 'new' | 'current'
 * }} params
 * @returns {string}
 */
const getScopeName = ({ container = {}, nameType = 'current' } = {}) => {
	const role = getContainerRole({ container });
	const compMod = getCompMod({ container });

	if (nameType === 'old') {
		return compMod.code?.old || compMod.name?.old || role.code || role.name || '';
	}

	if (nameType === 'new') {
		return compMod.code?.new || compMod.name?.new || role.code || role.name || '';
	}

	return role.code || role.name || container.title || container.name || '';
};

/**
 * @param {{
 *   container: object,
 *   nameType?: 'old' | 'new' | 'current'
 * }} params
 * @returns {{
 *   namespace: string,
 *   bucketName: string,
 *   name: string,
 *   ifNotExists: boolean
 * }}
 */
const getScopeContext = ({ container = {}, nameType = 'current' } = {}) => {
	const role = getContainerRole({ container });
	const compMod = getCompMod({ container });

	const getTypedValue = ({ propertyName }) => {
		if (nameType === 'old') {
			return compMod[propertyName]?.old ?? role[propertyName];
		}

		if (nameType === 'new') {
			return compMod[propertyName]?.new ?? role[propertyName];
		}

		return role[propertyName];
	};

	return {
		namespace: getTypedValue({ propertyName: 'namespace' }),
		bucketName: getTypedValue({ propertyName: 'bucket' }),
		name: getScopeName({ container, nameType }),
		ifNotExists: Boolean(role.ifNotExists),
	};
};

/**
 * @param {{ container: object }} params
 * @returns {boolean}
 */
const isScopeRecreated = ({ container } = {}) => {
	const compMod = getCompMod({ container });
	const oldName = compMod.code?.old || compMod.name?.old;
	const newName = compMod.code?.new || compMod.name?.new;
	const nameChanged = Boolean(oldName && newName && oldName !== newName);
	const bucketChanged = Boolean(
		compMod.bucket?.old && compMod.bucket?.new && compMod.bucket.old !== compMod.bucket.new,
	);
	const namespaceChanged = Boolean(
		compMod.namespace?.old && compMod.namespace?.new && compMod.namespace.old !== compMod.namespace.new,
	);

	return nameChanged || bucketChanged || namespaceChanged;
};

/**
 * @param {{
 *   container: object,
 *   nameType?: 'old' | 'new' | 'current'
 * }} params
 * @returns {AlterScriptDto | undefined}
 */
const getCreateScopeDto = ({ container, nameType = 'new' } = {}) => {
	const script = getScopeScript(getScopeContext({ container, nameType }));

	return AlterScriptDto.getInstance({
		script,
		isDropScript: false,
		modelLevel: 'scope',
		scriptPurpose: 'add',
	});
};

/**
 * @param {{
 *   container: object,
 *   nameType?: 'old' | 'new' | 'current'
 * }} params
 * @returns {AlterScriptDto | undefined}
 */
const getDropScopeDto = ({ container, nameType = 'old' } = {}) => {
	const script = getDropScopeScript({
		...getScopeContext({ container, nameType }),
		ifExists: true,
	});

	return AlterScriptDto.getInstance({
		script,
		isDropScript: true,
		modelLevel: 'scope',
		scriptPurpose: 'deletion',
	});
};

/**
 * @param {{ container: object }} params
 * @returns {AlterScriptDto[]}
 */
const getAddedScopeDtos = ({ container } = {}) => [getCreateScopeDto({ container, nameType: 'new' })].filter(Boolean);

/**
 * @param {{ container: object }} params
 * @returns {AlterScriptDto[]}
 */
const getDeletedScopeDtos = ({ container } = {}) => [getDropScopeDto({ container, nameType: 'old' })].filter(Boolean);

/**
 * @param {{ container: object }} params
 * @returns {AlterScriptDto[]}
 */
const getModifiedScopeDtos = ({ container } = {}) => {
	if (!isScopeRecreated({ container })) {
		return [];
	}

	return [getDropScopeDto({ container, nameType: 'old' }), getCreateScopeDto({ container, nameType: 'new' })].filter(
		Boolean,
	);
};

/**
 * @param {{ schema: object }} params
 * @returns {AlterScriptDto[]}
 */
const getScopeAlterScriptDtos = ({ schema } = {}) => {
	const addedContainers = getDeltaItems({ schema, nameProperty: 'containers', modify: 'added' });
	const modifiedContainers = getDeltaItems({ schema, nameProperty: 'containers', modify: 'modified' });
	const deletedContainers = getDeltaItems({ schema, nameProperty: 'containers', modify: 'deleted' });

	return [
		...deletedContainers.flatMap(container => getDeletedScopeDtos({ container })),
		...modifiedContainers.flatMap(container => getModifiedScopeDtos({ container })),
		...addedContainers.flatMap(container => getAddedScopeDtos({ container })),
	].filter(Boolean);
};

module.exports = {
	getScopeAlterScriptDtos,
};
