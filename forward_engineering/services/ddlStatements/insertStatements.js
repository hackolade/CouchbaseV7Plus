const uuid = require('uuid');
const { getKeySpaceReference } = require('./commonDdlStatements');

/**
 *
 * @param {jsonData: object, collections: object[]} param
 * @returns {string[]}
 */
const getInsertScripts = ({ jsonData, collections = [] }) => {
	const collectionsScripts = collections
		.map(collection => {
			const collectionJsonData = jsonData[collection.GUID];
			return getInsertScriptForCollection({
				jsonData: collectionJsonData,
				collection: { ...collection, scope: collection.bucketName },
			});
		})
		.join('\n\n');

	return collectionsScripts;
};

/**
 *
 * @param {jsonData: object, collection: object} param0
 * @returns {string}
 */
const getInsertScriptForCollection = ({ jsonData, collection }) => {
	if (collection.isActivated === false) {
		return '';
	}

	const insertionPath = getKeySpaceReference(collection);
	const parseJsonData = JSON.parse(jsonData);
	const { key, ...jsonDataBody } = parseJsonData;
	const sampledKey = getKeyFieldSample(key);

	return `INSERT INTO ${insertionPath} (KEY, VALUE)\n\tVALUES("${sampledKey}",${JSON.stringify(jsonDataBody, null, '\t')});`;
};

/**
 *
 * @param {string} jsonDataKey
 * @returns {string}
 */
const getKeyFieldSample = jsonDataKey => jsonDataKey || uuid.v4();

module.exports = {
	getInsertScripts,
	getInsertScriptForCollection,
};
