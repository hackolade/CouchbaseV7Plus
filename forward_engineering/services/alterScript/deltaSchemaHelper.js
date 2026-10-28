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
		.flatMap(item => Object.values(item.properties || {}))
		.filter(Boolean);

/**
 * @param {{ properties: object | object[] }} params
 * @returns {object}
 */
const normalizeProperties = ({ properties } = {}) => {
	if (!Array.isArray(properties)) {
		return properties || {};
	}

	return Object.fromEntries(
		properties.map(property => [property?.code || property?.name, property]).filter(([name]) => name),
	);
};

/**
 * @param {{ connectionInfo: object }} params
 * @returns {boolean}
 */
const shouldApplyDropStatements = ({ connectionInfo = {} } = {}) =>
	Boolean(connectionInfo.options?.additionalOptions?.find(option => option.id === 'applyDropStatements')?.value);

module.exports = {
	getDeltaSchema,
	getDeltaItems,
	normalizeProperties,
	shouldApplyDropStatements,
};
