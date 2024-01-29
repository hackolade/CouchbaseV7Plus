/**
 * @typedef {import('../../shared/types').Cluster} Cluster
 * @typedef {import('../../shared/types').Bucket} Bucket
 * @typedef {import('../../shared/types').Scope} Scope
 * @typedef {import('../../shared/types').NameMap} NameMap
 * @typedef {import('../../shared/types').ConnectionDataItem} ConnectionDataItem
 * @typedef {import('../../shared/types').ConnectionInfo} ConnectionInfo
 * @typedef {import('../../shared/types').Logger} Logger
 */
const _ = require('lodash');
const {
	COUCHBASE_ERROR_CODE,
	DEFAULT_DOCUMENT_KIND,
	DEFAULT_NAME,
	DISABLED_TOOLTIP,
	STATUS,
} = require('../../shared/constants');
const queryHelper = require('./queryHelper');

/**
 * @param {{ cluster: Cluster }} param0
 * @returns {Promise<Bucket[]>}
 */
const getAllBuckets = async ({ cluster }) => {
	return await cluster.buckets().getAllBuckets();
};

/**
 * @param {{ cluster: Cluster; selectedBucket: string }} selectedBucket
 * @returns {Promise<Bucket[]>}
 */
const getBucketsForReverse = async ({ cluster, selectedBucket }) => {
	if (selectedBucket) {
		return [{ name: selectedBucket }];
	}

	return getAllBuckets({ cluster });
};

/**
 * @param {{ cluster: Cluster; bucketName: string }} param0
 * @returns {Promise<Scope[]>}
 */
const getBucketScopes = async ({ cluster, bucketName }) => {
	const bucketInstance = await cluster.bucket(bucketName);
	const collectionManager = await bucketInstance.collections();
	const bucketScopes = await collectionManager.getAllScopes();

	return bucketScopes;
};

/**
 * @param {{cluster: Cluster; selectedBucket: string; }} param0
 * @returns {Promise<NameMap>}
 */
const getBucketScopeNameMap = async ({ cluster, selectedBucket }) => {
	const buckets = await getBucketsForReverse({ cluster, selectedBucket });
	const bucketScopeMap = {};

	for (const bucket of buckets) {
		const scopes = await getBucketScopes({ cluster, bucketName: bucket.name });
		bucketScopeMap[bucket.name] = scopes;
	}

	return bucketScopeMap;
};

/**
 * @param {{ scopes: Scope[] }} param0
 * @returns {boolean}
 */
const isBucketHasDefaultCollection = ({ scopes }) => {
	const defaultScope = scopes.find(scope => scope.name === DEFAULT_NAME);
	return !!defaultScope && defaultScope.collections.some(collection => collection.name === DEFAULT_NAME);
};

/**
 * @param {{ cluster: Cluster;connectionInfo: ConnectionInfo;log: Logger; }} param0
 * @returns {Promise<any>}
 */
const getDbCollectionsNames = async ({ cluster, connectionInfo, log }) => {
	const connectionDataItems = [];
	const bucketScopeMap = await getBucketScopeNameMap({ cluster, selectedBucket: connectionInfo.couchbase_bucket });

	for (const bucketName in bucketScopeMap) {
		const documentKind = connectionInfo.documentKinds?.[bucketName]?.documentKindName || DEFAULT_DOCUMENT_KIND;
		const scopes = bucketScopeMap[bucketName];

		for (const scope of scopes) {
			const scopeName = scope.name;
			const scopeCollectionNames = scope.collections.map(collection => collection.name);
			const hasDefaultCollection = isBucketHasDefaultCollection({ scopes: [scope] });
			const documentKindCollectionNames = hasDefaultCollection
				? await getDocumentKindCollectionNames({ cluster, bucketName, documentKind, log })
				: [];
			const collectionNames = [...documentKindCollectionNames, ...scopeCollectionNames];
			const dataItem = prepareConnectionDataItem({ bucketName, scopeName, collectionNames });

			connectionDataItems.push(dataItem);
		}
	}

	return connectionDataItems;
};

/**
 *
 * @param {{ cluster: Cluster;bucketName: string;scopeName: string;documentKind: string; log: Logger }} param0
 * @returns {Promise<string[]>}
 */
const getDocumentKindCollectionNames = async ({ cluster, bucketName, documentKind, log }) => {
	try {
		if (documentKind === DEFAULT_DOCUMENT_KIND) {
			return [];
		}

		const selectQuery = queryHelper.getSelectBucketDocumentKindQuery({ bucketName, documentKind });
		const { rows: documents } = await cluster.query(selectQuery);
		const collectionNames = documents.map(doc => doc[documentKind]).filter(Boolean);

		return collectionNames;
	} catch (error) {
		const errorCode = getErrorCode({ error });
		const errorMessage = getErrorMessage({ error });
		if (
			errorCode === COUCHBASE_ERROR_CODE.primaryIndexDoesNotExist ||
			errorCode === COUCHBASE_ERROR_CODE.n1qlMethodsAreNotSupported
		) {
			//TODO get Fetched documents
			return [];
		}

		log.error(errorMessage);
		return [];
	}
};
/**
 * @param {{ cluster: Cluster; bucketName: string; }} param0
 * @throws {Error}
 * @returns {Promise<any[]>}
 */
const getDocumentsByInfer = async ({ cluster, bucketName }) => {
	const inferBucketDocumentsQuery = queryHelper.getInferBucketDocumentsQuery({ bucketName });
	const { rows: documents, meta } = await cluster.query(inferBucketDocumentsQuery);
	const metaError = _.get(meta, 'errors.[0].[0]');
	const isDocumentEmpty = _.get(documents, '[0].properties');

	if (metaError) {
		throw metaError;
	}

	if (isDocumentEmpty) {
		const error = new Error();
		error.code = COUCHBASE_ERROR_CODE.bucketIsEmpty;
		throw error;
	}

	return documents;
};

/**
 * @param {{ cluster: Cluster; bucketName: string; }} param0
 * @returns {Promise<any[]>}
 */
const getDocumentsBySelectStatement = async ({ cluster, bucketName }) => {
	const selectBucketDocumentsQuery = queryHelper.getSelectBucketDocumentsQuery({ bucketName });
	const { rows: documents } = await cluster.query(selectBucketDocumentsQuery);

	return documents;
};

/**
 * @param {{ error: Error }} param0
 * @returns {number | undefined}
 */
const getErrorCode = ({ error }) => {
	return error?.cause?.first_error_code || error?.code;
};

/**
 * @param {{ error: Error }} param0
 * @returns {string}
 */
const getErrorMessage = ({ error }) => {
	const errorCode = getErrorCode({ error });
	switch (errorCode) {
		case COUCHBASE_ERROR_CODE.bucketIsEmpty:
			return 'Collection is empty.';
		case COUCHBASE_ERROR_CODE.n1qlMethodsAreNotSupported:
			return 'N1QL methods are not supported.';
		case COUCHBASE_ERROR_CODE.parseSyntaxError:
		case COUCHBASE_ERROR_CODE.inferMethodIsNotSupport:
			return 'Infer method is not supported.';
		case COUCHBASE_ERROR_CODE.userDoesNotHaveAccessToPrivilegeCluster:
			return 'User doesn`t have credentials for privileged cluster.';
		default:
			return error?.message || '';
	}
};

/**
 * @param {{ bucketName: string; scopeName: string; collectionNames?: string[]; status?: STATUS; }} param0
 * @returns {ConnectionDataItem}
 */
const prepareConnectionDataItem = ({ bucketName, scopeName, collectionNames, status }) => {
	const hasError = status === STATUS.hasError;
	const dbCollections = hasError ? [] : _.uniq(collectionNames);
	return {
		scopeName,
		dbCollections,
		dbName: bucketName,
		...(status && { status }),
		...(hasError && { disabledTooltip: DISABLED_TOOLTIP }),
	};
};

module.exports = {
	isBucketHasDefaultCollection,
	getAllBuckets,
	getBucketScopeNameMap,
	getDbCollectionsNames,
	getDocumentsBySelectStatement,
	getDocumentsByInfer,
	getErrorCode,
	getErrorMessage,
};
