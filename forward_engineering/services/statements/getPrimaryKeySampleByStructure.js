/**
 * @typedef {import('../../../shared/types').PkSegment} PkSegment
 * @typedef {import('../../../shared/types').UUID} UUID
 */
const RandExp = require('randexp');
const { get, isEmpty, isPlainObject } = require('lodash');
const { PK_SEGMENT_TYPE } = require('../../../shared/constants');

/**
 * @param {{ collection: object, jsonData: object }}
 * @returns {string}
 */
const getPrimaryKeySampleByStructure = ({ collection, jsonData }) => {
	const keyField = Object.values(collection.properties || {}).find(
		field => field.primaryKey && !isEmpty(field.primaryKeyStructure),
	);
	const primaryKeyStructure = keyField?.primaryKeyStructure;

	if (!Array.isArray(primaryKeyStructure)) {
		return '';
	}

	return primaryKeyStructure.reduce((result, segment) => {
		switch (segment.segmentType) {
			case PK_SEGMENT_TYPE.field: {
				const segmentValue = getPrimaryKeyStructureFieldValue({ segment, collection, jsonData });
				return result + segmentValue;
			}
			case PK_SEGMENT_TYPE.pattern: {
				const segmentValue = getPrimaryKeyStructurePatternValue({ segment });
				return result + segmentValue;
			}
			case PK_SEGMENT_TYPE.constant:
			case PK_SEGMENT_TYPE.separator: {
				return result + (segment.segmentValue ?? '');
			}
			default:
				return result;
		}
	}, '');
};

/**
 * @param {{ segment: PkSegment, collection: object, jsonData: object }}
 * @returns {string}
 */
const getPrimaryKeyStructureFieldValue = ({ segment, collection, jsonData }) => {
	const fieldNamePaths = (segment.segmentKey || []).map(({ keyId }) => {
		return getFieldNamePath({ collection, keyId });
	});

	return fieldNamePaths.map(fieldNamePath => get(jsonData, fieldNamePath)).join('');
};

/**
 * @param {{ segment: PkSegment }}
 * @returns {string}
 */
const getPrimaryKeyStructurePatternValue = ({ segment }) => {
	try {
		const randExpInstance = new RandExp(segment.segmentRegex);

		return randExpInstance.gen();
	} catch (e) {
		return segment.segmentSample ?? '';
	}
};

/**
 * @param {{ collection: object, keyId: UUID }}
 * @returns {string[]}
 */
const getFieldNamePath = ({ collection, keyId }) => {
	const properties = getCollectionProperties({ collection });

	return Object.entries(properties).reduce((result, [fieldName, field]) => {
		if (field.GUID === keyId) {
			return [...result, fieldName];
		}

		const namePath = getFieldNamePath({ collection: field, keyId });

		return namePath.length ? [...result, fieldName, ...namePath] : result;
	}, []);
};

/**
 * @param {{ collection: object }}
 * @returns {object}
 */
const getCollectionProperties = ({ collection }) => {
	if (collection.properties) {
		return collection.properties;
	}

	if (Array.isArray(collection.items)) {
		return collection.items.reduce((result, item, index) => ({ ...result, [index]: item }), {});
	}

	if (isPlainObject(collection.items)) {
		return collection.items;
	}

	return {};
};

module.exports = {
	getPrimaryKeySampleByStructure,
};
