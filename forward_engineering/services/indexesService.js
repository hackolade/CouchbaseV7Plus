const injectKeysNamesIntoIndexKeys = ({ index, keyIdToName = {} }) => ({
	...index,
	...(index.indxKey && { indxKey: index.indxKey.map(key => ({ ...key, name: keyIdToName[key.keyId] })) }),
	...(index.partitionByHashKeys && {
		partitionByHashKeys: index.partitionByHashKeys.map(key => ({ ...key, name: keyIdToName[key.keyId] })),
	}),
});

const getIndexKeyIdToKeyNameMap = collectionProperties =>
	Object.entries(collectionProperties).reduce((keyIdToNameMap, [propertyName, propertyData]) => {
		return {
			...keyIdToNameMap,
			[propertyData.GUID]: propertyName,
		};
	}, {});

module.exports = {
	injectKeysNamesIntoIndexKeys,
	getIndexKeyIdToKeyNameMap,
};
