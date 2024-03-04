const uuid = require('uuid');
const { getKeySpaceReference } = require('./commonStatements');

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
				collection,
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

	const keyPropertyName = Object.keys(collection?.properties ?? {}).find(propertyName =>
		Boolean(collection?.properties?.[propertyName]['<key>']),
	);

	const insertionPath = getKeySpaceReference(collection);
	const isKeyGeneratedWithFakerFunction = collection?.properties?.[keyPropertyName]?.fakerFunction;
	const parseJsonData = JSON.parse(jsonData);
	const keyFakedValue = isKeyGeneratedWithFakerFunction ? parseJsonData[keyPropertyName] : '';
	const { [keyPropertyName]: keyProperty, ...jsonDataBody } = parseJsonData;
	const sampledKey = getKeyFieldSample(keyFakedValue);

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
