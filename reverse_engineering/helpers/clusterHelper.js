/**
 * @typedef {import('../../shared/types').Document} Document
 * @typedef {import('../../shared/types').Cluster} Cluster
 * @typedef {import('../../shared/types').Bucket} Bucket
 * @typedef {import('../../shared/types').Scope} Scope
 * @typedef {import('../../shared/types').NameMap} NameMap
 * @typedef {import('../../shared/types').BucketCollectionNamesData} BucketCollectionNamesData
 * @typedef {import('../../shared/types').ConnectionInfo} ConnectionInfo
 * @typedef {import('../../shared/types').Logger} Logger
 */
const _ = require('lodash');
const restApiHelper = require('./restApiHelper');
const {
	COUCHBASE_ERROR_CODE,
	DEFAULT_DOCUMENT_KIND,
	DEFAULT_NAME,
	DISABLED_TOOLTIP,
	STATUS,
	DEFAULT_LIMIT,
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
 * @param {{ cluster: Cluster;connectionInfo: ConnectionInfo; logger: Logger; app: App }} param0
 * @returns {Promise<BucketCollectionNamesData[]>}
 */
const getDbCollectionsNames = async ({ cluster, connectionInfo, logger, app }) => {
	const dbCollectionNames = [];
	const bucketScopeMap = await getBucketScopeNameMap({ cluster, selectedBucket: connectionInfo.couchbase_bucket });

	for (const bucketName in bucketScopeMap) {
		const documentKind = connectionInfo.documentKinds?.[bucketName]?.documentKindName || DEFAULT_DOCUMENT_KIND;
		const scopes = bucketScopeMap[bucketName];

		for (const scope of scopes) {
			const scopeName = scope.name;
			const scopeCollectionNames = scope.collections.map(collection => collection.name);
			const notDefaultScopeCollectionNames = scopeCollectionNames.filter(name => name !== DEFAULT_NAME);
			const hasDefaultCollection = isBucketHasDefaultCollection({ scopes: [scope] });
			const documentKindCollectionNames = hasDefaultCollection
				? await getDocumentKindCollectionNames({
						cluster,
						connectionInfo,
						bucketName,
						documentKind,
						logger,
						app,
					})
				: [];
			const collectionNames = [...documentKindCollectionNames, ...notDefaultScopeCollectionNames];
			const dbCollectionNameData = prepareBucketCollectionNamesData({ bucketName, scopeName, collectionNames });

			dbCollectionNames.push(dbCollectionNameData);
		}
	}

	return dbCollectionNames;
};

/**
 *
 * @param {{ cluster: Cluster; connectionInfo: ConnectionInfo; bucketName: string; documentKind: string; logger: Logger; app: App }} param0
 * @returns {Promise<string[]>}
 */
const getDocumentKindCollectionNames = async ({ cluster, connectionInfo, bucketName, documentKind, logger, app }) => {
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
		if (
			errorCode === COUCHBASE_ERROR_CODE.primaryIndexDoesNotExist ||
			errorCode === COUCHBASE_ERROR_CODE.n1qlMethodsAreNotSupported
		) {
			const documents = await restApiHelper.getDocuments({ connectionInfo, bucketName, logger, app });
			const collectionNames = documents.reduce((result, doc) => {
				const collectionName = doc[bucketName]?.[documentKind];

				if (!collectionName || result.includes(collectionName)) {
					return result;
				}

				return [...result, collectionName];
			}, []);

			return collectionNames;
		}

		logger.error(error);
		return [];
	}
};
/**
 * @param {{ cluster: Cluster; bucketName: string; }} param0
 * @throws
 * @returns {Promise<Document[]>}
 */
const getDocumentsByInfer = async ({ cluster, bucketName }) => {
	const inferBucketDocumentsQuery = queryHelper.getInferBucketDocumentsQuery({ bucketName, limit: DEFAULT_LIMIT });
	const { rows: documents, meta } = await cluster.query(inferBucketDocumentsQuery);
	const metaError = _.get(meta, 'errors.[0].[0]');
	const isDocumentEmpty = _.get(documents, '[0].properties');

	if (metaError) {
		throw metaError;
	}

	if (isDocumentEmpty) {
		throw { code: COUCHBASE_ERROR_CODE.bucketIsEmpty };
	}

	return documents;
};

/**
 * @param {{ cluster: Cluster; bucketName: string; }} param0
 * @returns {Promise<Document[]>}
 */
const getDocumentsBySelectStatement = async ({ cluster, bucketName }) => {
	const selectBucketDocumentsQuery = queryHelper.getSelectBucketDocumentsQuery({ bucketName, limit: DEFAULT_LIMIT });
	const { rows: documents } = await cluster.query(selectBucketDocumentsQuery);

	return documents;
};

/**
 * @param {{ error: Error }} param0
 * @returns {number | undefined}
 */
const getErrorCode = ({ error }) => {
	return error?.cause?.first_error_code ?? error?.code;
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
			return error?.cause?.message || error?.message || '';
	}
};

/**
 * @param {{ bucketName: string; scopeName: string; collectionNames?: string[]; status?: STATUS; }} param0
 * @returns {BucketCollectionNamesData}
 */
const prepareBucketCollectionNamesData = ({ bucketName, scopeName, collectionNames, status }) => {
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
