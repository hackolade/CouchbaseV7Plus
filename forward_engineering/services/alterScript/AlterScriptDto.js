const { SCRIPT_TYPE } = require('../../../shared/enums/scriptType');

const SCRIPT_TYPE_BY_LEVEL_AND_PURPOSE = {
	scope: {
		add: SCRIPT_TYPE.createContainer,
		deletion: SCRIPT_TYPE.dropContainer,
	},
	collection: {
		add: SCRIPT_TYPE.createEntity,
		deletion: SCRIPT_TYPE.dropEntity,
		modify: SCRIPT_TYPE.alterEntity,
	},
	index: {
		add: SCRIPT_TYPE.createEntityIndex,
		deletion: SCRIPT_TYPE.dropEntityIndex,
		modify: SCRIPT_TYPE.alterEntityIndex,
	},
};

/**
 * @param {{ modelLevel?: string, scriptPurpose?: string }} params
 * @returns {string | null}
 */
const getScriptType = ({ modelLevel, scriptPurpose } = {}) =>
	SCRIPT_TYPE_BY_LEVEL_AND_PURPOSE[modelLevel]?.[scriptPurpose] ?? null;

/**
 * @param {{ entity?: object }} params
 * @returns {string | null}
 */
const getEntityId = ({ entity } = {}) => entity?.GUID || entity?.id || entity?.role?.GUID || entity?.role?.id || null;

/**
 * @param {{
 *   script: string,
 *   isDropScript?: boolean,
 *   isActivated?: boolean,
 *   modelLevel?: 'collection' | 'index' | 'scope',
 *   scriptPurpose?: 'deletion' | 'add' | 'modify',
 *   entityId?: string | null,
 * }} params
 * @returns {{
 *   script: string,
 *   isDropScript: boolean,
 *   isActivated: boolean,
 *   modelLevel: 'collection' | 'index' | 'scope',
 *   scriptPurpose: 'deletion' | 'add' | 'modify',
 *   scriptType: string | null,
 *   entityId: string | null,
 * } | undefined}
 */
const getAlterScriptDto = ({
	script,
	isDropScript = false,
	isActivated = true,
	modelLevel = 'collection',
	scriptPurpose = 'add',
	entityId = null,
} = {}) => {
	const cleanScript = script?.trim();
	if (!cleanScript) {
		return;
	}

	return {
		script: cleanScript,
		isDropScript,
		isActivated,
		modelLevel,
		scriptPurpose,
		scriptType: getScriptType({ modelLevel, scriptPurpose }),
		entityId,
	};
};

const AlterScriptDto = {
	getInstance: getAlterScriptDto,
};

module.exports = {
	AlterScriptDto,
	getEntityId,
};
