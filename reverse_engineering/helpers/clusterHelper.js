/**
 * @typedef {import('../../shared/types').DbCollectionData} DbCollectionData
 * @typedef {import('../../shared/types').Document} Document
 * @typedef {import('../../shared/types').Cluster} Cluster
 * @typedef {import('../../shared/types').Bucket} Bucket
 * @typedef {import('../../shared/types').Scope} Scope
 * @typedef {import('../../shared/types').NameMap} NameMap
 * @typedef {import('../../shared/types').BucketCollectionNamesData} BucketCollectionNamesData
 * @typedef {import('../../shared/types').ConnectionInfo} ConnectionInfo
 * @typedef {import('../../shared/types').Logger} Logger
 * @typedef {import('../../shared/types').RecordSamplingSettings} RecordSamplingSettings
 */
const async = require('async');
const _ = require('lodash');
const restApiHelper = require('./restApiHelper');
const schemaHelper = require('./schemaHelper');
const {
	COUCHBASE_ERROR_CODE,
	DEFAULT_DOCUMENT_KIND,
	DEFAULT_NAME,
	DISABLED_TOOLTIP,
	STATUS,
	DEFAULT_LIMIT,
	DEFAULT_SCOPE,
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
 * @param {{ cluster: Cluster; bucketName: string; logger: Logger }} param0
 * @returns {Promise<Scope[]>}
 */
const getBucketScopes = async ({ cluster, bucketName, logger }) => {
	try {
		const bucketInstance = await cluster.bucket(bucketName);
		const collectionManager = await bucketInstance.collections();
		const bucketScopes = await collectionManager.getAllScopes();

		return bucketScopes;
	} catch (error) {
		logger.error(error);
		return [DEFAULT_SCOPE];
	}
};

/**
 * @param {{cluster: Cluster; selectedBucket: string; logger: Logger }} param0
 * @returns {Promise<NameMap>}
 */
const getBucketScopeNameMap = async ({ cluster, selectedBucket, logger }) => {
	const buckets = await getBucketsForReverse({ cluster, selectedBucket });

	return await async.reduce(buckets, {}, async (result, bucket) => {
		const scopes = await getBucketScopes({ cluster, bucketName: bucket.name, logger });

		return {
			...result,
			[bucket.name]: scopes,
		};
	});
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
	const bucketScopeMap = await getBucketScopeNameMap({
		cluster,
		selectedBucket: connectionInfo.couchbase_bucket,
		logger,
	});

	return await async.reduce(Object.entries(bucketScopeMap), [], async (result, [bucketName, scopes]) => {
		const documentKind = connectionInfo.documentKinds?.[bucketName]?.documentKindName || DEFAULT_DOCUMENT_KIND;
		const dbCollectionsNames = await async.map(scopes, async scope => {
			const collectionNames = await getScopeCollectionNames({
				cluster,
				connectionInfo,
				bucketName,
				documentKind,
				scope,
				logger,
				app,
			});

			return prepareBucketCollectionNamesData({ bucketName, scopeName: scope.name, collectionNames });
		});

		return [...result, ...dbCollectionsNames];
	});
};

/**
 * @param {{
 * cluster: Cluster;
 * connectionInfo: ConnectionInfo;
 * bucketName: string;
 * documentKind: string;
 * scope: Scope;
 * logger: Logger;
 * app: App
 *  }} param0
 * @returns {Promise<string[]>}
 */
const getScopeCollectionNames = async ({ cluster, connectionInfo, bucketName, documentKind, scope, logger, app }) => {
	const scopeCollectionNames = scope.collections.map(collection => collection.name);
	const notDefaultScopeCollectionNames = scopeCollectionNames.filter(name => name !== DEFAULT_NAME);
	const hasDefaultCollection = isBucketHasDefaultCollection({ scopes: [scope] });

	if (!hasDefaultCollection) {
		return notDefaultScopeCollectionNames;
	}

	const documentKindCollectionNames = await getDocumentKindCollectionNames({
		cluster,
		connectionInfo,
		bucketName,
		documentKind,
		logger,
		app,
	});

	return [...documentKindCollectionNames, ...notDefaultScopeCollectionNames];
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
			const documents = await restApiHelper.getBucketDocuments({ connectionInfo, bucketName, logger, app });
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
const getBucketDocumentsByInfer = async ({ cluster, bucketName }) => {
	const inferBucketDocumentsQuery = queryHelper.getInferBucketDocumentsQuery({ bucketName, limit: DEFAULT_LIMIT });
	const { rows: documents, meta } = await cluster.query(inferBucketDocumentsQuery);
	const metaError = _.get(meta, 'errors.[0]');
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
 * @param {{ cluster: Cluster; bucketName: string; limit: number }} param0
 * @returns {Promise<Document[]>}
 */
const getDocumentsBySelectStatement = async ({ cluster, bucketName, limit = DEFAULT_LIMIT }) => {
	const selectBucketDocumentsQuery = queryHelper.getSelectBucketDocumentsQuery({ bucketName, limit });
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
			return error?.cause?.first_error_message || error?.message || '';
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

/**
 * @typedef {(args: object) => string} getQuery
 * @param {{ cluster: Cluster; options: object; getQuery: getQuery; logger: Logger }} param0
 * @returns {Promise<Document[]>}
 */
const getPaginatedQuery = async ({ cluster, options, query, logger }) => {
	const { bucketName, scopeName, collectionName, pagination, limit } = options;
	logger.progress('Get data from database', bucketName + '.' + scopeName, collectionName);

	if (!pagination?.enabled) {
		const queryWithOptions = queryHelper.getQueryOptions({ query, limit });
		const { rows } = await cluster.query(queryWithOptions);
		return rows;
	}

	const pageSize = Number(options.pagination.value) || DEFAULT_LIMIT;
	const pages = Math.ceil(options.limit / pageSize);
	const rowsByPages = [];

	let counter = 0;

	for (const page of pages) {
		const offset = pageSize * page;
		const limit = options.limit - offset < pageSize ? options.limit - offset : pageSize;
		const queryWithOptions = queryHelper.getQueryOptions({ query, limit, offset });
		const { rows } = await cluster.query(queryWithOptions);

		counter += rows.length;
		rowsByPages.push(...rows);

		logger.progress(
			`Collection sampling: ${counter} / ${options.limit}`,
			bucketName + '.' + scopeName,
			collectionName,
		);
	}

	return rowsByPages;
};

/**
 * @param {{size: number; recordSamplingSettings: RecordSamplingSettings }} param0
 * @returns {number}
 */
const getDocSamplingSize = ({ size, recordSamplingSettings }) => {
	if (recordSamplingSettings.active === 'absolute') {
		return Number(recordSamplingSettings.absolute.value);
	}

	const limit = Math.ceil((size * recordSamplingSettings.relative.value) / 100);

	return Math.min(limit, recordSamplingSettings.maxValue);
};

/**
 * @param {{ cluster: Cluster; bucketName: string; scopeName: string; collectionName: string; recordSamplingSettings: RecordSamplingSettings; logger: Logger }} param0
 * @returns {Promise<number>}
 */
const getCollectionSamplingSize = async ({
	cluster,
	bucketName,
	scopeName,
	collectionName,
	recordSamplingSettings,
	logger,
}) => {
	try {
		const query = queryHelper.getCountCollectionDocumentsQuery({ bucketName, scopeName, collectionName });
		const { rows } = await cluster.query(query);
		const size = rows?.[0]?.size;

		return getDocSamplingSize({ size, recordSamplingSettings }) || DEFAULT_LIMIT;
	} catch (error) {
		logger.error(error);
		return DEFAULT_LIMIT;
	}
};

/**
 * @param {{ cluster: Cluster; bucketName: string; scopeName: string; collectionName: string; limit: number }} param0
 * @returns {Promise<Document[]>}
 */
const getCollectionDocumentsByInfer = async ({ cluster, bucketName, scopeName, collectionName, limit }) => {
	const query = queryHelper.getInferCollectionDocumentsQuery({ bucketName, scopeName, collectionName, limit });
	const { rows, meta } = await cluster.query(query);
	const metaError = _.get(meta, 'errors.[0]');

	if (metaError) {
		throw metaError;
	}

	const [[inference]] = rows;

	return schemaHelper.convertInferSchemaToDocuments({ inference, bucketName });
};

/**
 * @param {{
 * cluster: Cluster;
 * data: object;
 * bucketName: string;
 * scopeName: string;
 * collectionName: string;
 * collectionIndexes: object[];
 * includeEmptyCollection: boolean;
 * logger: Logger;
 * app: App;
 *  }} param0
 * @returns {Promise<DbCollectionData>}
 */
const getDbCollectionData = async ({
	cluster,
	data,
	bucketName,
	scopeName,
	collectionName,
	collectionIndexes,
	includeEmptyCollection,
	logger,
	app,
}) => {
	const limit = await getCollectionSamplingSize({
		cluster,
		bucketName,
		scopeName,
		collectionName,
		recordSamplingSettings: data.recordSamplingSettings,
		logger,
	});
	const documentKind = data.documentKinds?.[bucketName]?.documentKindName || '';
	const options = { limit, pagination: data.pagination, bucketName, scopeName, collectionName };
	const fieldInference = data.fieldInference;

	let documents = [];
	let standardDocument = null;
	let query = queryHelper.getSelectCollectionDocumentsQuery({ bucketName, scopeName, collectionName });

	try {
		documents = await getPaginatedQuery({ cluster, options, query, logger });
		standardDocument = await getCollectionDocumentByDocumentId({
			cluster,
			bucketName,
			scopeName,
			collectionName,
			documentId: documents[0]?.docid,
			logger,
		});
	} catch (error) {
		try {
			const errorCode = getErrorCode({ error });
			switch (errorCode) {
				case COUCHBASE_ERROR_CODE.parseSyntaxError:
				case COUCHBASE_ERROR_CODE.collectionDoesNotExist:
					query = queryHelper.getSelectBucketDocumentsByDocumentKindQuery({
						bucketName,
						documentKind,
						collectionName,
					});
					documents = await getPaginatedQuery({ cluster, options, query, logger });
					standardDocument = await getCollectionDocumentByDocumentId({
						cluster,
						bucketName,
						scopeName,
						collectionName: DEFAULT_NAME,
						documentId: documents[0]?.docid,
						logger,
					});
					break;
				case COUCHBASE_ERROR_CODE.primaryIndexDoesNotExist:
					documents = await getCollectionDocumentsByInfer({
						cluster,
						bucketName,
						scopeName,
						collectionName,
						limit,
					});
					break;
				case COUCHBASE_ERROR_CODE.inferMethodIsNotSupport:
				case COUCHBASE_ERROR_CODE.n1qlMethodsAreNotSupported:
					documents = await restApiHelper.getBucketDocuments({
						connectionInfo: data.connectionInfo,
						bucketName,
						logger,
						app,
					});
					break;
			}
		} catch (error) {
			const errorCode = getErrorCode({ error });
			if (errorCode === COUCHBASE_ERROR_CODE.n1qlMethodsAreNotSupported) {
				documents = await restApiHelper.getBucketDocuments({
					connectionInfo: data.connectionInfo,
					bucketName,
					logger,
					app,
				});
			}
			logger.error(error);
		}

		logger.error(error);
	}

	return schemaHelper.getDbCollectionData({
		bucketName,
		scopeName,
		collectionName,
		documentKind,
		documents,
		collectionIndexes,
		includeEmptyCollection,
		standardDocument,
		fieldInference,
	});
};

/**
 * @param {{ cluster: Cluster; logger: Logger }} param0
 * @returns {Promise<object[]>}
 */
const getIndexes = async ({ cluster, logger }) => {
	try {
		const query = queryHelper.getSelectIndexesQuery();
		const { rows } = await cluster.query(query);

		return rows.map(row => row.indexes);
	} catch (error) {
		logger.error(error);
		return [];
	}
};

/**
 * @param { cluster: Cluster; data: object; logger: Logger; app: App } param0
 * @returns {Promise<NameMap>}
 */
const getSelectedCollections = async ({ cluster, data, logger, app }) => {
	const collectionVersion = data.collectionData.collectionVersion;
	const dataBaseNames = data.collectionData.dataBaseNames;

	if (!_.isEmpty(collectionVersion)) {
		return collectionVersion;
	}

	const dbCollectionData = await async.flatMap(dataBaseNames, async bucketName => {
		return getDbCollectionsNames({
			connectionInfo: {
				...data,
				couchbase_bucket: bucketName,
			},
			cluster,
			logger,
			app,
		});
	});

	return dbCollectionData.reduce((result, collectionData) => {
		const { dbName, scopeName, dbCollections } = collectionData;
		return _.set(result, [dbName, scopeName], dbCollections);
	}, {});
};

/**
 * @param {{
 * cluster: Cluster;
 * bucketName: string;
 * scopeName: string;
 * collectionName: string;
 * documentId?: string;
 * logger: Logger;
 * }} param0
 * @returns {Promise<Document|null>}
 */
const getCollectionDocumentByDocumentId = async ({
	cluster,
	bucketName,
	scopeName,
	collectionName,
	documentId,
	logger,
}) => {
	try {
		const bucket = cluster.bucket(bucketName);
		const scope = bucket.scope(scopeName);
		const collection = scope.collection(collectionName);
		const { content } = await collection.get(documentId);

		return content;
	} catch (error) {
		logger.error(error);
		return null;
	}
};

module.exports = {
	isBucketHasDefaultCollection,
	getAllBuckets,
	getBucketsForReverse,
	getBucketScopeNameMap,
	getDbCollectionsNames,
	getDbCollectionData,
	getDocumentsBySelectStatement,
	getBucketDocumentsByInfer,
	getErrorCode,
	getErrorMessage,
	getIndexes,
	getPaginatedQuery,
	getSelectedCollections,
};
