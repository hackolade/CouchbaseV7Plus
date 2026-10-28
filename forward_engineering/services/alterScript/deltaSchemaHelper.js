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
 * @param {{ schema: object, nameProperty: string }} params
 * @returns {object[]}
 */
const getAllDeltaItems = ({ schema, nameProperty }) =>
	['added', 'modified', 'deleted'].flatMap(modify => getDeltaItems({ schema, nameProperty, modify }));

/**
 * @param {{ schema: object }} params
 * @returns {string[]}
 */
const getDeltaBucketNames = ({ schema = {} } = {}) => {
	const scopeBuckets = getAllDeltaItems({ schema, nameProperty: 'containers' }).flatMap(container => {
		const role = container.role || container;
		const compMod = role.compMod || container.compMod || {};

		return [compMod.bucket?.new, compMod.bucket?.old, role.bucket];
	});
	const collectionBuckets = getAllDeltaItems({ schema, nameProperty: 'entities' }).map(entity => {
		const compMod = entity.role?.compMod || entity.compMod || {};

		return compMod.bucketProperties?.bucket;
	});

	return [...new Set([...scopeBuckets, ...collectionBuckets].filter(Boolean))];
};

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
	getDeltaBucketNames,
	normalizeProperties,
	shouldApplyDropStatements,
};
