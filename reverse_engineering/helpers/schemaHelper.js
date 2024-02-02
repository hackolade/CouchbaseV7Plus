/**
 * @typedef {import('../../shared/types').DbCollectionData} DbCollectionData
 * @typedef {import('../../shared/types').Document} Document
 */
const _ = require('lodash');
const { DEFAULT_KEY_NAME } = require('../../shared/constants');

/**
 *
 * @param {{ documents: Document[]; bucketName: string; scopeName: string; collectionName: string; collectionIndexes: object[]; includeEmptyCollection: boolean }} param0
 * @returns {DbCollectionData}
 */
const getDbCollectionData = ({
	documents,
	bucketName,
	scopeName,
	collectionName,
	collectionIndexes,
	includeEmptyCollection,
}) => {
	const jsonDocuments = documents
		.filter(item => _.isPlainObject(item[bucketName]))
		.map(item => ({
			[DEFAULT_KEY_NAME]: item.docid,
			...item[bucketName],
		}));
	const standardDoc = _.first(jsonDocuments);

	if (!includeEmptyCollection && _.isEmpty(jsonDocuments)) {
		return null;
	}

	return {
		dbName: scopeName,
		collectionName: collectionName,
		documentKind: '',
		collectionDocs: {},
		standardDoc: standardDoc,
		bucketInfo: {
			bucket: bucketName,
		},
		emptyBucket: false,
		documents: jsonDocuments,
		entityLevel: {
			indexes: collectionIndexes,
			keyName: DEFAULT_KEY_NAME,
			keyType: typeOf(standardDoc[DEFAULT_KEY_NAME]),
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
 * @param {any} obj
 * @returns {string}
 */
const typeOf = obj => {
	return {}.toString.call(obj).split(' ')[1].slice(0, -1).toLowerCase();
};

module.exports = {
	getDbCollectionData,
	convertInferSchemaToDocuments,
};
