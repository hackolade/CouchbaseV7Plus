const uuid = require('uuid');
const { getKeySpaceReference } = require('./commonStatements');
const { getPrimaryKeySampleByStructure } = require('./getPrimaryKeySampleByStructure');

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
 * @param {{ jsonData: object, collection: object }} params
 * @returns {string}
 */
const getInsertScriptForCollection = ({ jsonData, collection, useUpsert = true }) => {
	if (collection.isActivated === false) {
		return '';
	}

	const keyPropertyName = Object.keys(collection?.properties ?? {}).find(propertyName =>
		Boolean(collection?.properties?.[propertyName]?.primaryKey),
	);

	const insertionPath = getKeySpaceReference(collection);
	const isKeyGeneratedWithFakerFunction = collection?.properties?.[keyPropertyName]?.fakerFunction;
	const parseJsonData = JSON.parse(jsonData);
	const sampleValue = collection?.properties?.[keyPropertyName]?.sample;
	const keySample = isKeyGeneratedWithFakerFunction ? parseJsonData[keyPropertyName] : sampleValue;
	const { [keyPropertyName]: _keyProperty, ...jsonDataBody } = parseJsonData;
	const pkSample = getPrimaryKeySampleByStructure({ collection, jsonData: parseJsonData });
	const sampledKey = pkSample || keySample || uuid.v4();
	const values = JSON.stringify(jsonDataBody, null, '\t');
	const mutationClause = useUpsert ? 'UPSERT' : 'INSERT';

	return `${mutationClause} INTO ${insertionPath} (KEY, VALUE)\n\tVALUES("${sampledKey}",${values});`;
};

module.exports = {
	getInsertScripts,
	getInsertScriptForCollection,
};
