/**
 * @typedef {import('../types').DbCollectionData} DbCollectionData
 * @typedef {import('../types').Document} Document
 * @typedef {import('../types').Cluster} Cluster
 * @typedef {import('../types').Bucket} Bucket
 * @typedef {import('../types').Scope} Scope
 * @typedef {import('../types').NameMap} NameMap
 * @typedef {import('../types').BucketCollectionNamesData} BucketCollectionNamesData
 * @typedef {import('../types').ConnectionInfo} ConnectionInfo
 * @typedef {import('../types').Logger} Logger
 * @typedef {import('../types').RecordSamplingSettings} RecordSamplingSettings
 */
const async = require('async');
const { get, uniq, isEmpty, set } = require('lodash');
const restApiHelper = require('../../reverse_engineering/helpers/restApiHelper');
const schemaHelper = require('../../reverse_engineering/helpers/schemaHelper');
const { COUCHBASE_ERROR_CODE, DEFAULT_NAME, DISABLED_TOOLTIP, STATUS, DEFAULT_LIMIT } = require('../constants');
const queryHelper = require('../../reverse_engineering/helpers/queryHelper');

/**
 * @param {{ cluster: Cluster }} param0
 * @returns {Promise<Bucket[]>}
 */
const getAllBuckets = async ({ cluster }) => {
	return await cluster.buckets().getAllBuckets();
};

/**
 *
 * @param {{bucketName: string, cluster: Cluster}} param
 * @returns {Promise<Bucket>}
 */
const createNewBucket = async ({ bucketName, cluster }) => {
	await cluster.buckets().createBucket({ name: bucketName });

	return cluster.bucket(bucketName);
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
		const scopes = await collectionManager.getAllScopes();

		return getNonDefaultScopesAndCollections({ scopes });
	} catch (error) {
		logger.error(error);
		return [];
	}
};

/**
 * @param {{ scopes: Scope[] }} param0
 * @returns {Scope[]}
 */
const getNonDefaultScopesAndCollections = ({ scopes }) => {
	const isDefault = ({ name }) => name === DEFAULT_NAME;

	return scopes.reduce((result, scope) => {
		if (!isDefault(scope)) {
			return [...result, scope];
		}

		const scopeCollections = scope.collections.filter(collection => !isDefault(collection));

		if (!isEmpty(scopeCollections)) {
			return [...result, { ...scope, collections: scopeCollections }];
		}

		return result;
	}, []);
};

/**
 * @param {{ cluster: Cluster; connectionInfo: ConnectionInfo; logger: Logger; }} param0
 * @returns {Promise<BucketCollectionNamesData[]>}
 */
const getDbCollectionsNames = async ({ cluster, connectionInfo, logger }) => {
	const scopes = await getBucketScopes({ cluster, bucketName: connectionInfo.database, logger });

	return scopes.map(scope => {
		const collectionNames = scope.collections.map(collection => collection.name);

		return prepareBucketCollectionNamesData({ scopeName: scope.name, collectionNames });
	});
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
 * @param {{ scopeName: string; collectionNames?: string[]; status?: STATUS; }} param0
 * @returns {BucketCollectionNamesData}
 */
const prepareBucketCollectionNamesData = ({ scopeName, collectionNames, status }) => {
	const hasError = status === STATUS.hasError;
	const dbCollections = hasError ? [] : uniq(collectionNames);
	return {
		dbCollections,
		dbName: scopeName,
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
	const metaError = get(meta, 'errors.[0]');

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
	try {
		const limit = await getCollectionSamplingSize({
			cluster,
			bucketName,
			scopeName,
			collectionName,
			recordSamplingSettings: data.recordSamplingSettings,
			logger,
		});
		const options = { limit, pagination: data.pagination, bucketName, scopeName, collectionName };
		const query = queryHelper.getSelectCollectionDocumentsQuery({ bucketName, scopeName, collectionName });
		const documents = await getPaginatedQuery({ cluster, options, query, logger });
		const standardDocument = await getCollectionDocumentByDocumentId({
			cluster,
			bucketName,
			scopeName,
			collectionName,
			documentId: documents[0]?.docid,
			logger,
		});

		return schemaHelper.getDbCollectionData({
			bucketName,
			scopeName,
			collectionName,
			documents,
			collectionIndexes,
			includeEmptyCollection,
			standardDocument,
			fieldInference: data.fieldInference,
		});
	} catch (error) {
		logger.error(error);

		return getDbCollectionDataByErrorHandling({
			error,
			cluster,
			data,
			bucketName,
			scopeName,
			collectionName,
			collectionIndexes,
			includeEmptyCollection,
			logger,
			app,
		});
	}
};

/**
 * @param {{
 * error: Error;
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
const getDbCollectionDataByErrorHandling = async ({
	error,
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
	try {
		const errorCode = getErrorCode({ error });

		let documents = [];

		switch (errorCode) {
			case COUCHBASE_ERROR_CODE.primaryIndexDoesNotExist:
				documents = await getCollectionDocumentsByInfer({
					cluster,
					bucketName,
					scopeName,
					collectionName,
					limit: DEFAULT_LIMIT,
				});
				break;
			case COUCHBASE_ERROR_CODE.inferMethodIsNotSupport:
			case COUCHBASE_ERROR_CODE.n1qlMethodsAreNotSupported:
				documents = await restApiHelper.getCollectionDocuments({
					connectionInfo: data.connectionInfo,
					bucketName,
					scopeName,
					collectionName,
					logger,
					app,
				});
				break;
		}

		return schemaHelper.getDbCollectionData({
			bucketName,
			scopeName,
			collectionName,
			documents,
			collectionIndexes,
			includeEmptyCollection,
			fieldInference: data.fieldInference,
		});
	} catch (error) {
		logger.error(error);
		return schemaHelper.getDbCollectionData({
			bucketName,
			scopeName,
			collectionName,
			documents: [],
			collectionIndexes,
			includeEmptyCollection,
			fieldInference: data.fieldInference,
		});
	}
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

	if (!isEmpty(collectionVersion)) {
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
		return set(result, [dbName, scopeName], dbCollections);
	}, {});
};

/**
 * @description Function returns a document with original order of fields
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
	getAllBuckets,
	createNewBucket,
	getBucketsForReverse,
	getDbCollectionsNames,
	getDbCollectionData,
	getDocumentsBySelectStatement,
	getErrorCode,
	getErrorMessage,
	getIndexes,
	getPaginatedQuery,
	getSelectedCollections,
};
