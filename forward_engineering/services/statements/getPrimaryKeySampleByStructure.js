/**
 * @typedef {import('../../../shared/types').PkSegment} PkSegment
 * @typedef {import('../../../shared/types').UUID} UUID
 */
const RandExp = require('randexp');
const { PK_SEGMENT_TYPE } = require('../../../shared/constants');

/**
 * @param {{ collection: object, jsonData: object }}
 * @returns {string}
 */
const getPrimaryKeySampleByStructure = ({ collection, jsonData }) => {
	const keyField = Object.values(collection.properties || {}).find(field => field.primaryKeyStructure);
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
	const fieldNames = (segment.segmentKey || []).map(({ keyId }) => {
		return findFieldNameById({ collection, id: keyId });
	});

	return fieldNames
		.filter(Boolean)
		.map(fieldName => jsonData[fieldName])
		.join('');
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
 * @param {{ collection: object, id: UUID }}
 * @returns {string}
 */
const findFieldNameById = ({ collection, id }) => {
	return Object.entries(collection.properties || {}).reduce((result, [fieldName, field]) => {
		if (result) {
			return result;
		}

		if (field.GUID === id) {
			return fieldName;
		}

		return findFieldNameById({ collection: field, id });
	}, '');
};

module.exports = {
	getPrimaryKeySampleByStructure,
};
