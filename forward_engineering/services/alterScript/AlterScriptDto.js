/**
 * @param {{
 *   script: string,
 *   isDropScript?: boolean,
 *   isActivated?: boolean,
 *   modelLevel?: 'collection' | 'index' | 'scope',
 *   scriptPurpose?: 'deletion' | 'add' | 'modify',
 * }} params
 * @returns {{
 *   script: string,
 *   isDropScript: boolean,
 *   isActivated: boolean,
 *   modelLevel: 'collection' | 'index' | 'scope',
 *   scriptPurpose: 'deletion' | 'add' | 'modify',
 * } | undefined}
 */
const getAlterScriptDto = ({
	script,
	isDropScript = false,
	isActivated = true,
	modelLevel = 'collection',
	scriptPurpose = 'add',
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
	};
};

const AlterScriptDto = {
	getInstance: getAlterScriptDto,
};

module.exports = {
	AlterScriptDto,
};
