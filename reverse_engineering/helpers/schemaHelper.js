/**
 * @typedef {import('../../shared/types').DbCollectionData} DbCollectionData
 * @typedef {import('../../shared/types').Document} Document
 */
const _ = require('lodash');

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
			KEY: item.docid,
			...item[bucketName],
		}));

	if (!includeEmptyCollection && _.isEmpty(jsonDocuments)) {
		return null;
	}

	return {
		dbName: scopeName,
		collectionName: collectionName,
		documentKind: '',
		collectionDocs: {},
		standardDoc: _.first(jsonDocuments),
		bucketInfo: {
			bucket: bucketName,
		},
		emptyBucket: false,
		documents: jsonDocuments,
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

module.exports = {
	getDbCollectionData,
	convertInferSchemaToDocuments,
};
