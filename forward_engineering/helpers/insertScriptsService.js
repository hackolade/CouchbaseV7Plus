const uuid = require('uuid');
const { getValidBucketName } = require('./objectConformance');

const getInsertScripts = ({ bucket, jsonData, collections = [] }) => {
	collections = collections.map(JSON.parse);
	const bucketName = getValidBucketName(bucket);
	const collectionsScripts = collections
		.map(collection => {
			const collectionJsonData = jsonData[collection.GUID];
			return getInsertScriptForCollection({ bucketName, jsonData: collectionJsonData, collection });
		})
		.join('\n\n');

	return collectionsScripts;
};

const getInsertScriptForCollection = ({ bucketName, jsonData, collection }) => {
	if (collection.isActivated === false) {
		return '';
	}

	const parseJsonData = JSON.parse(jsonData);
	const { key, ...jsonDataBody } = parseJsonData;
	const sampledKey = getKeyFieldSample(key);

	return `INSERT INTO \`${bucketName}\` (KEY, VALUE)\n\tVALUES("${sampledKey}",${JSON.stringify(jsonDataBody, null, '\t')});`;
};

const getKeyFieldSample = jsonDataKey => jsonDataKey || uuid.v4();

module.exports = {
	getInsertScripts,
	getInsertScriptForCollection,
};
