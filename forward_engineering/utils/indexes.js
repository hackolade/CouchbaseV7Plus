/**
 *
 * @param {{index: object, keyIdToNameMap: object}} param
 * @returns {object}
 */
const injectKeysNamesIntoIndexKeys = ({ index, keyIdToName = {} }) => ({
	indxComments: index.indxComments,
	indxDescription: index.indxDescription,
	indxName: index.indxName,
	indxType: index.indxType,
	isActivated: index.isActivated,
	ifNotExists: index.ifNotExists,
	partitionByHash: index.partitionByHash,
	functionExpr: index.functionExpr,
	usingGSI: index.usingGSI,
	whereClause: index.whereClause,
	withOptions: index.withOptions,
	arrayExpr: index.arrayExpr,
	metadataExpr: index.metadataExpr,
	partitionByHashExpr: index.partitionByHashExpr,
	...(index.indxKey && { indxKey: index.indxKey.map(key => ({ ...key, name: keyIdToName[key.keyId] })) }),
	...(index.partitionByHashKeys && {
		partitionByHashKeys: index.partitionByHashKeys.map(key => ({ ...key, name: keyIdToName[key.keyId] })),
	}),
});

/**
 *
 * @param {object} collectionProperties
 * @returns {object}
 */
const getIndexKeyIdToKeyNameMap = collectionProperties =>
	Object.entries(collectionProperties).reduce((keyIdToNameMap, [propertyName, propertyData]) => {
		keyIdToNameMap[propertyData.GUID] = propertyName;
		return keyIdToNameMap;
	}, {});

module.exports = {
	injectKeysNamesIntoIndexKeys,
	getIndexKeyIdToKeyNameMap,
};
