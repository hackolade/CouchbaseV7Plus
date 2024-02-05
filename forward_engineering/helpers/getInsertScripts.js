const uuid = require('uuid')
const { getValidBucketName } = require('./objectConformance');
const { mapEachAsync } = require('./arrayHelper')

const getInsertScripts = ({fakeDataService}) => async ({model, bucket, fakerLocalization, jsonData, collections = []}) => {
    collections = collections.map(JSON.parse)
    const [keyPropertyId] = bucket?.documentKey?.[0].path.slice(-1)
	const bucketName = getValidBucketName(bucket);
	const collectionsScripts = (
		await mapEachAsync(collections, getInsertScriptForCollection({fakeDataService})({model, bucketName, jsonData, fakerLocalization, keyPropertyId}))
	).join('\n\n');

	return collectionsScripts;
};

const getInsertScriptForCollection = ({fakeDataService}) => ({model, bucketName, fakerLocalization, jsonData, keyPropertyId}) => async collection => {
	if (collection.isActivated === false) {
		return '';
	}

    const collectionJsonData = typeof jsonData === 'object' ? jsonData[collection.GUID] : jsonData
	const key = await getKeyFieldSample({fakeDataService})({collection, fakerLocalization, keyPropertyId});

	return `INSERT INTO \`${bucketName}\` (KEY, VALUE)\n\tVALUES("${key}",${collectionJsonData ?? ''});`;
};

const getKeyFieldSample = ({fakeDataService}) => async ({collection, fakerLocalization, keyPropertyId}) => {
	const keyField = Object.values(collection.properties).find(field => field.GUID === keyPropertyId);
	const fakerValue =
		keyField?.fakerFunction && (await getFakeValue({fakeDataService})(keyField, fakerLocalization));

	return fakerValue || uuid.v4();
};

const getFakeValue = ({fakeDataService}) => async (item, fakerLocalization) => {
    if (!item.fakerFunction) {
        return;
    }

    try {
        let { value } = await fakeDataService.getFakeValue({ fakerFunction: item.fakerFunction, fakerLocalization });
        
        if (item.type === 'numeric' && !isNaN(value)) {
            return Number(value)
        }

        const removeQuotes = new RegExp('\x22+', 'g');
        return value.replace(removeQuotes, "'");
    } catch (error) {
        return;
    }
};

module.exports = {
    getInsertScripts,
    getInsertScriptForCollection,
}