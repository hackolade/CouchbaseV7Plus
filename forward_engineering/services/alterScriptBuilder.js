const { isEqual, uniqWith } = require('lodash');
const { getCollectionAlterScriptDtos } = require('./alterScript/collectionAlterHelper');
const { getIndexAlterScriptDtos } = require('./alterScript/indexAlterHelper');
const { getScopeAlterScriptDtos } = require('./alterScript/scopeAlterHelper');
const { commentStatement } = require('./alterScript/commentHelper');
const { getDeltaSchema, shouldApplyDropStatements } = require('./alterScript/deltaSchemaHelper');

const SCRIPT_ORDER = [
	['index', 'deletion'],
	['collection', 'deletion'],
	['scope', 'deletion'],
	['scope', 'add'],
	['collection', 'add'],
	['collection', 'modify'],
	['index', 'modify'],
	['index', 'add'],
];

/**
 * @param {{ alterScriptDtos: object[], applyDropStatements: boolean }} params
 * @returns {object[]}
 */
const getCommentedDropScriptDtos = ({ alterScriptDtos = [], applyDropStatements = false } = {}) => {
	if (applyDropStatements) {
		return alterScriptDtos;
	}

	return alterScriptDtos.map(dto => {
		if (!dto?.isDropScript || !dto?.script) {
			return dto;
		}

		return {
			...dto,
			script: commentStatement({ statement: dto.script }),
		};
	});
};

/**
 * @param {{ alterScriptDtos: object[] }} params
 * @returns {object[]}
 */
const sortAlterScriptDtos = ({ alterScriptDtos = [] } = {}) => {
	const ordered = SCRIPT_ORDER.reduce(
		(result, [modelLevel, scriptPurpose]) => {
			const matched = [];
			const remaining = [];

			result.remaining.forEach(dto => {
				if (dto?.modelLevel === modelLevel && dto?.scriptPurpose === scriptPurpose) {
					matched.push(dto);
					return;
				}
				remaining.push(dto);
			});

			return {
				sorted: [...result.sorted, ...matched],
				remaining,
			};
		},
		{ sorted: [], remaining: alterScriptDtos },
	);

	return [...ordered.sorted, ...ordered.remaining];
};

/**
 * @param {{ alterScriptDtos: object[] }} params
 * @returns {string}
 */
const joinAlterScriptDtos = ({ alterScriptDtos = [] } = {}) =>
	alterScriptDtos
		.map(dto => dto?.script)
		.filter(Boolean)
		.join('\n\n');

/**
 * @param {{ connectionInfo: object }} params
 * @returns {object[]}
 */
const getAlterScriptDtos = ({ connectionInfo } = {}) => {
	const schema = getDeltaSchema({ connectionInfo });
	const alterScriptDtos = uniqWith(
		[
			...getScopeAlterScriptDtos({ schema }),
			...getCollectionAlterScriptDtos({ schema }),
			...getIndexAlterScriptDtos({ schema }),
		],
		isEqual,
	);

	return sortAlterScriptDtos({ alterScriptDtos });
};

/**
 * @param {{ connectionInfo: object }} params
 * @returns {string}
 */
const buildAlterScript = ({ connectionInfo } = {}) => {
	const alterScriptDtos = getAlterScriptDtos({ connectionInfo });
	const applyDropStatements = shouldApplyDropStatements({ connectionInfo });
	const scriptDtos = getCommentedDropScriptDtos({ alterScriptDtos, applyDropStatements });

	return joinAlterScriptDtos({ alterScriptDtos: scriptDtos });
};

/**
 * @param {{ connectionInfo: object }} params
 * @returns {boolean}
 */
const hasDropStatements = ({ connectionInfo } = {}) =>
	getAlterScriptDtos({ connectionInfo }).some(dto => dto?.isActivated && dto?.isDropScript);

module.exports = {
	buildAlterScript,
	hasDropStatements,
};
