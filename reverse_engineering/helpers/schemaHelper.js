/**
 * @typedef {import('../../shared/types').DbCollectionData} DbCollectionData
 * @typedef {import('../../shared/types').Document} Document
 * @typedef {import('../../shared/types').NameMap} NameMap
 * @typedef {import('../../shared/types').InferenceProperty} InferenceProperty
 * @typedef {{ active: 'field' | 'alphabetical' }} FieldInference
 */
const { isPlainObject, isEmpty, isArray } = require('lodash');
const { DEFAULT_KEY_NAME, NUM_SAMPLE_VALUES } = require('../../shared/constants');

/**
 * @param {{
 * documents: Document[];
 * bucketName: string;
 * scopeName: string;
 * collectionName: string;
 * collectionIndexes: object[];
 * includeEmptyCollection: boolean;
 * standardDocument: Document | null;
 * fieldInference: FieldInference
 *  }} param0
 * @returns {DbCollectionData}
 */
const getDbCollectionData = ({
	documents,
	bucketName,
	scopeName,
	collectionName,
	collectionIndexes,
	includeEmptyCollection,
	standardDocument,
	fieldInference,
}) => {
	const jsonDocuments = documents
		.filter(item => isPlainObject(item[bucketName]))
		.map(item => ({
			[DEFAULT_KEY_NAME]: item.docid,
			...item[bucketName],
		}));
	const standardDoc = fieldInference.active === 'field' ? standardDocument : null;
	const emptyBucket = !includeEmptyCollection && isEmpty(jsonDocuments);

	return {
		dbName: scopeName,
		collectionName,
		collectionDocs: {},
		standardDoc,
		bucketInfo: {
			bucket: bucketName,
		},
		emptyBucket,
		documents: jsonDocuments,
		containerLevelKeys: {
			key: DEFAULT_KEY_NAME,
		},
		entityLevel: {
			indexes: collectionIndexes,
		},
	};
};

/**
 * @param {Array<TValue>} values
 * @param {number} index
 * @returns {TValue}
 */
const getSafeValueByIndex = (values, index) => {
	return values.length > index ? values[index] : values[0];
};

/**
 * @param {{ property: InferenceProperty; propertyName: string; amountOfSamples: number, result: Document[] }} param0
 * @returns {Document[]}
 */
const reduceSamples = ({ property, propertyName, amountOfSamples, result }) => {
	const { samples = [], type } = property;

	return [...Array(amountOfSamples).keys()].reduce((acc, index) => {
		const sample = getSafeValueByIndex(samples, index);
		const sampleType = isArray(type) ? getSafeValueByIndex(type, index) : type;
		const document = acc[index] || {};

		acc[index] = {
			...document,
			[propertyName]: isArray(sample) && sampleType !== 'array' ? sample[0] : sample,
		};

		return acc;
	}, result);
};

/**
 * @param {{ inference: object; bucketName: string; }} param0
 * @returns {Document[]}
 */
const convertInferSchemaToDocuments = ({ inference, bucketName }) => {
	if (isEmpty(inference?.properties)) {
		return [];
	}

	const amountOfSamples = Math.min(NUM_SAMPLE_VALUES, inference['#docs'] ?? 0);

	const documents = Object.keys(inference.properties).reduce((result, propertyName) => {
		const property = inference.properties[propertyName];
		return property ? reduceSamples({ property, propertyName, amountOfSamples, result }) : result;
	}, []);

	return documents.map(document => ({
		docid: '',
		[bucketName]: document,
	}));
};

/**
 * @param {{ entitiesData: object[]; indexesByCollectionMap: NameMap; scopeBucketNameMap: NameMap }} param0
 * @returns {DbCollectionData[]}
 */
const mapParsedResultToMultipleSchema = ({ entitiesData, indexesByCollectionMap, scopeBucketNameMap }) => {
	return entitiesData.map(({ bucketName, scopeName, collectionName, ifNotExists }) => {
		return {
			doc: {
				bucketInfo: {
					bucket: bucketName,
					ifNotExists: scopeBucketNameMap[bucketName]?.[scopeName]?.ifNotExists,
				},
				emptyBucket: !collectionName,
				dbName: scopeName,
				collectionName: collectionName,
				entityLevel: {
					ifNotExists,
					indexes: indexesByCollectionMap?.[bucketName]?.[scopeName]?.[collectionName],
				},
			},
			objectNames: {
				collectionName,
			},
			collectionDocs: {},
			jsonSchema: {
				type: 'object',
			},
		};
	});
};

/**
 * @param {any} obj
 * @returns {string}
 */
const typeOf = obj => {
	return {}.toString.call(obj).split(' ')[1].slice(0, -1).toLowerCase();
};

module.exports = {
	getDbCollectionData,
	convertInferSchemaToDocuments,
	mapParsedResultToMultipleSchema,
	typeOf,
};
