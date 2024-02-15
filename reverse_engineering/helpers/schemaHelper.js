/**
 * @typedef {import('../../shared/types').DbCollectionData} DbCollectionData
 * @typedef {import('../../shared/types').Document} Document
 * @typedef {import('../../shared/types').NameMap} NameMap
 * @typedef {{ active: 'field' | 'alphabetical' }} FieldInference
 */
const _ = require('lodash');
const { DEFAULT_KEY_NAME, DEFAULT_NAME } = require('../../shared/constants');

/**
 * @param {{
 * documents: Document[];
 * bucketName: string;
 * scopeName: string;
 * collectionName: string;
 * documentKind: string;
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
	documentKind,
	collectionIndexes,
	includeEmptyCollection,
	standardDocument,
	fieldInference,
}) => {
	const jsonDocuments = documents
		.filter(item => _.isPlainObject(item[bucketName]))
		.map(item => ({
			[DEFAULT_KEY_NAME]: item.docid,
			...item[bucketName],
		}));
	const standardDoc = fieldInference.active === 'field' ? standardDocument : null;
	const emptyBucket = !includeEmptyCollection && _.isEmpty(jsonDocuments);

	return {
		dbName: scopeName,
		collectionName,
		documentKind,
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
	if (_.isEmpty(inference?.properties)) {
		return [];
	}

	const documents = Object.keys(inference.properties).reduce((result, propertyName) => {
		const samples = inference.properties[propertyName]?.samples || [];

		return samples.reduce((acc, sample, index) => {
			const document = acc[index] || {};
			acc[index] = { ...document, [propertyName]: sample };
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
 * @param {{ dbCollectionsData: DbCollectionData[] }} param0
 * @returns {DbCollectionData[]}
 */
const updateDefaultDbNames = ({ dbCollectionsData }) => {
	const bucketNames = dbCollectionsData
		.filter(data => data.dbName === DEFAULT_NAME)
		.map(data => data.bucketInfo.bucket);
	const uniqueBucketNames = _.uniq(bucketNames);
	const shouldUpdateDefaultNames = _.uniq(bucketNames).length > 1;

	if (!shouldUpdateDefaultNames) {
		return dbCollectionsData;
	}

	return dbCollectionsData.map(data => {
		if (data.dbName !== DEFAULT_NAME) {
			return data;
		}

		const bucketIndex = uniqueBucketNames.indexOf(data.bucketInfo.bucket);

		if (bucketIndex < 1) {
			return data;
		}

		return {
			...data,
			dbName: data.dbName + `(${bucketIndex})`,
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
	updateDefaultDbNames,
};
