/**
 * @typedef {import('../../shared/types').DbCollectionData} DbCollectionData
 * @typedef {import('../../shared/types').Document} Document
 */
const _ = require('lodash');

/**
 *
 * @param {{ documents: Document[]; bucketName: string; scopeName: string; collectionName: string; collectionIndexes: object[] }} param0
 * @returns {DbCollectionData}
 */
const getDbCollectionData = ({ documents, bucketName, scopeName, collectionName, collectionIndexes }) => {
	const jsonDocuments = documents
		.filter(item => _.isPlainObject(item[bucketName]))
		.map(item => ({
			KEY: item.docid,
			...item[bucketName],
		}));

	return {
		dbName: scopeName,
		collectionName: collectionName,
		documentKind: '',
		collectionDocs: {},
		bucketInfo: {
			bucket: bucketName,
		},
		emptyBucket: !jsonDocuments.length,
		indexes: collectionIndexes,
		documents: jsonDocuments,
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
