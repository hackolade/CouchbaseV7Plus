/**
 * @param {{ connectionInfo: object }} params
 * @returns {object}
 */
const getDeltaSchema = ({ connectionInfo = {} } = {}) => {
	const { jsonSchema, collections } = connectionInfo;

	if (typeof jsonSchema === 'string') {
		return JSON.parse(jsonSchema);
	}

	if (Array.isArray(collections) && collections.length > 0) {
		const firstCollection = collections[0];
		return typeof firstCollection === 'string' ? JSON.parse(firstCollection) : firstCollection;
	}

	if (jsonSchema && typeof jsonSchema === 'object') {
		const firstCollection = Object.values(jsonSchema)[0];
		if (!firstCollection) {
			return {};
		}

		return typeof firstCollection === 'string' ? JSON.parse(firstCollection) : firstCollection;
	}

	return {};
};

/**
 * @param {{ schema: object, nameProperty: string, modify: 'added' | 'modified' | 'deleted' }} params
 * @returns {object[]}
 */
const getDeltaItems = ({ schema = {}, nameProperty, modify } = {}) =>
	[schema.properties?.[nameProperty]?.properties?.[modify]?.items]
		.flat()
		.filter(Boolean)
		.map(item => Object.values(item.properties || {})[0])
		.filter(Boolean);

/**
 * @param {{ connectionInfo: object }} params
 * @returns {boolean}
 */
const shouldApplyDropStatements = ({ connectionInfo = {} } = {}) =>
	Boolean(connectionInfo.options?.additionalOptions?.find(option => option.id === 'applyDropStatements')?.value);

module.exports = {
	getDeltaSchema,
	getDeltaItems,
	shouldApplyDropStatements,
};
