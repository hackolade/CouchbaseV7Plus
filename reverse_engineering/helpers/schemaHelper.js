/**
 * @typedef {import('../../shared/types').DbCollectionData} DbCollectionData
 * @typedef {import('../../shared/types').Document} Document
 * @typedef {import('../../shared/types').NameMap} NameMap
 * @typedef {{ active: 'field' | 'alphabetical' }} FieldInference
 */
const { isPlainObject, isEmpty, isArray } = require('lodash');
const { DEFAULT_KEY_NAME } = require('../../shared/constants');

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
 * @param {{ inference: object; bucketName: string; }} param0
 * @returns {Document[]}
 */
const convertInferSchemaToDocuments = ({ inference, bucketName }) => {
	if (isEmpty(inference?.properties)) {
		return [];
	}

	const documents = Object.keys(inference.properties).reduce((result, propertyName) => {
		const property = inference.properties[propertyName];

		if (!property) {
			return result;
		}

		const { samples = [], type } = property;

		return samples.reduce((acc, sample, index) => {
			const sampleType = isArray(type) ? type[index] : type;
			const document = acc[index] || {};

			acc[index] = {
				...document,
				[propertyName]: isArray(sample) && sampleType !== 'array' ? sample[0] : sample,
			};

			return acc;
		}, result);
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
