/**
 * @typedef {import('../../shared/types').App} App
 * @typedef {import('../../shared/types').Document} Document
 * @typedef {import('../../shared/types').DocumentKindData} DocumentKindData
 * @typedef {import('../../shared/types').Cluster} Cluster
 * @typedef {import('../../shared/types').ConnectionInfo} ConnectionInfo
 * @typedef {import('../../shared/types').BucketCollectionNamesData} BucketCollectionNamesData
 * @typedef {import('../../shared/types').Logger} Logger
 */
const async = require('async');
const _ = require('lodash');
const clusterHelper = require('./clusterHelper');
const restApiHelper = require('./restApiHelper');
const schemaHelper = require('./schemaHelper');
const { COUCHBASE_ERROR_CODE, DEFAULT_NAME, FLAVOR_REGEX, STATUS } = require('../../shared/constants');

/**
 * @param {{ bucketName: string; status?: STATUS; }} param0
 * @returns {DocumentKindData}
 */
const getDefaultDocumentKindData = ({ bucketName, status }) => {
	return { bucketName, documentList: [], documentKind: '', status };
};

/**
 * @param {{ cluster: Cluster; connectionInfo: ConnectionInfo; logger: Logger; app: App }} param0
 * @returns {Promise<DocumentKindData[]>}
 */
const getBucketsDocumentKindList = async ({ cluster, connectionInfo, logger, app }) => {
	const selectedBucket = connectionInfo.couchbase_bucket;
	const bucketScopeNameMap = await clusterHelper.getBucketScopeNameMap({ cluster, selectedBucket, logger });

	return await async.reduce(Object.entries(bucketScopeNameMap), [], async (result, [bucketName, scopes]) => {
		const hasDefaultCollection = clusterHelper.isBucketHasDefaultCollection({ scopes });

		if (!hasDefaultCollection) {
			return result;
		}

		const documentKindData = await getBucketDocumentKindData({
			cluster,
			connectionInfo,
			bucketName,
			logger,
			app,
		});

		return [...result, documentKindData];
	});
};

/**
 * @param {{ cluster: Cluster; connectionInfo: ConnectionInfo; bucketName: string; logger: Logger; app: App }} param0
 * @returns {Promise<DocumentKindData>}
 */
const getBucketDocumentKindData = async ({ cluster, connectionInfo, bucketName, logger, app }) => {
	const keySpaceName = `${bucketName}.${DEFAULT_NAME}.${DEFAULT_NAME}: `;

	return getDocumentKindDataByInference({ cluster, bucketName })
		.catch(error => {
			const errorMessage = clusterHelper.getErrorMessage({ error });
			logger.info(keySpaceName + errorMessage);
			return getDocumentKindDataByErrorHandling({ cluster, connectionInfo, bucketName, error, logger, app });
		})
		.catch(error => {
			const errorMessage = clusterHelper.getErrorMessage({ error });
			logger.info(keySpaceName + errorMessage);
			return getDefaultDocumentKindData({ bucketName, status: STATUS.hasError });
		});
};

/**
 * @param {{ bucketName: string; documents: Document[]; }} param0
 * @returns {object}
 */
const generateCustomInferSchema = ({ bucketName, documents }) => {
	documents = documents.map(item => {
		if (typeof item[bucketName] === 'object') {
			return item[bucketName];
		} else {
			return { 'unknown': item[bucketName] };
		}
	});

	let inferSchema = {
		'#docs': 0,
		'$schema': 'http://json-schema.org/schema#',
		'properties': {},
	};

	documents.forEach(item => {
		inferSchema['#docs']++;

		for (const prop in item) {
			if (inferSchema.properties.hasOwnProperty(prop)) {
				const minimumNumberOfSamples = 20;
				const samples = inferSchema.properties[prop]['samples'];
				const propDoesNotExists = samples.indexOf(item[prop]) === -1;
				const shouldAddSample = samples.length < minimumNumberOfSamples;

				inferSchema.properties[prop]['#docs']++;

				if (propDoesNotExists && shouldAddSample) {
					inferSchema.properties[prop]['samples'].push(item[prop]);
				}

				inferSchema.properties[prop]['type'] = schemaHelper.typeOf(item[prop]);
			} else {
				inferSchema.properties[prop] = {
					'#docs': 1,
					'%docs': 100,
					'samples': [item[prop]],
					'type': schemaHelper.typeOf(item[prop]),
				};
			}
		}
	});

	for (const prop in inferSchema.properties) {
		inferSchema.properties[prop]['%docs'] = _.round(
			(inferSchema.properties[prop]['#docs'] / inferSchema['#docs']) * 100,
			2,
		);
	}
	return inferSchema;
};

/**
 * @param {Document} property
 * @returns {boolean}
 */
const isSuggestedDocKind = property => {
	return property['%docs'] >= 70 && property.samples?.length && typeof property.samples[0] !== 'object';
};

/**
 * @param {string} string
 * @returns {string}
 */
const replaceQuotes = string => {
	const inQuotes = _.first(string) === '`' && _.last(string) === '`';

	return inQuotes ? string.slice(1, -1) : string;
};

const rejectPropertiesWithLowAppearancePercentage = properties => {
	return _.chain(properties)
		.toPairs()
		.filter(([, propertyData]) => isSuggestedDocKind(propertyData))
		.fromPairs()
		.value();
};

/**
 * @param {Document[]} inferences
 * @returns {string[]}
 */
const getSuggestedDocKindsFromInference = inferences => {
	return _.uniq(
		inferences.flatMap(inference => Object.keys(rejectPropertiesWithLowAppearancePercentage(inference.properties))),
	);
};

/**
 * @param {{ bucketName: string; inference: Document; flavorValue: string; }} param0
 * @returns {DocumentKindData}
 */
const getDocumentKindDataFromInfer = ({ bucketName, inference, flavorValue }) => {
	const flavor = flavorValue ? flavorValue.split(',') : inference[0].Flavor.split(',');

	if (flavor.length !== 1) {
		return {
			bucketName,
			documentKind: '',
			documentList: [],
			otherDocKinds: [],
		};
	}

	const suggestedDocKinds = getSuggestedDocKindsFromInference(inference);
	const flavorRegex = new RegExp(FLAVOR_REGEX);
	const matchedDocKind = flavor[0].match(flavorRegex);
	const documentKindKey = matchedDocKind.length ? matchedDocKind[1] : '';
	const documentKind = replaceQuotes(documentKindKey);

	return {
		bucketName,
		documentKind,
		documentList: suggestedDocKinds,
		otherDocKinds: [],
	};
};

/**
 * @param {{ bucketName: string; inference: Document; }} param0
 * @returns {DocumentKindData}
 */
const getDocumentKindDataFromManualInfer = ({ bucketName, inference }) => {
	let minCount = Infinity;
	let probability = 0;

	return Object.entries(inference.properties).reduce(
		(result, [propertyName, property]) => {
			const isSuggestedDocumentKind = isSuggestedDocKind(property);
			const isOtherDocumentKind = property.type === 'string';

			if (!isSuggestedDocumentKind && !isOtherDocumentKind) {
				return result;
			}

			if (!isSuggestedDocumentKind && isOtherDocumentKind) {
				return {
					...result,
					otherDocKinds: [...result.otherDocKinds, propertyName],
				};
			}

			const propertyProbability = property['%docs'];
			const propertySamplesCount = property.samples.length;

			if (propertyProbability >= probability && propertySamplesCount < minCount) {
				minCount = propertySamplesCount;
				probability = propertyProbability;

				return {
					...result,
					documentList: [...result.documentList, propertyName],
					documentKind: replaceQuotes(propertyName),
				};
			}

			return {
				...result,
				documentList: [...result.documentList, propertyName],
			};
		},
		{
			bucketName,
			documentKind: '',
			documentList: [],
			otherDocKinds: [],
		},
	);
};

/**
 * @param {{ bucketName: string; documents: Document[] }} param0
 * @returns {DocumentKindData}
 */
const manualInfer = ({ bucketName, documents }) => {
	const inference = generateCustomInferSchema({ bucketName, documents });
	return getDocumentKindDataFromManualInfer({ bucketName, inference });
};

/**
 * @param {{ bucketName: string; connectionInfo: ConnectionInfo; logger: Logger; app: App }} param0
 * @returns {Promise<DocumentKindData>}
 */
const getDocumentKindDataUsingRestApi = async ({ bucketName, connectionInfo, logger, app }) => {
	try {
		const documents = await restApiHelper.getDocuments({ bucketName, connectionInfo, logger, app });
		return manualInfer({ bucketName, documents });
	} catch (error) {
		logger.error(error);
		return getDefaultDocumentKindData({ bucketName, status: STATUS.hasError });
	}
};

/**
 * @param {{ cluster: Cluster; bucketName: string; }} param0
 * @returns {Promise<DocumentKindData>}
 */
const getDocumentKindDataUsingN1ql = async ({ cluster, bucketName }) => {
	const documents = await clusterHelper.getDocumentsBySelectStatement({ cluster, bucketName });
	return manualInfer({ bucketName, documents });
};

/**
 * @param {Document} data
 * @returns {string | undefined}
 */
const getNonEmptyFlavorValue = data => {
	return data?.find(item => item.Flavor)?.Flavor;
};

/**
 * @param {{cluster: Cluster; bucketName: string; }} param0
 * @throws
 * @returns {Promise<DocumentKindData>}
 */
const getDocumentKindDataByInference = async ({ cluster, bucketName }) => {
	const documents = await clusterHelper.getBucketDocumentsByInfer({ cluster, bucketName });
	const [inference] = documents;
	const flavorValue = getNonEmptyFlavorValue(inference);
	const isFlavourString = _.isString(flavorValue);
	const flavours = isFlavourString ? flavorValue.split(',') : [];
	const isMultipleFlavours = flavours.length > 1;
	const flavor = flavorValue?.match(new RegExp(FLAVOR_REGEX));
	const documentKindName = flavor?.[2];
	const shouldCreateManually = !isFlavourString || isMultipleFlavours || !documentKindName;

	if (shouldCreateManually) {
		throw { code: COUCHBASE_ERROR_CODE.inferMethodIsNotSupport };
	}

	return getDocumentKindDataFromInfer({ bucketName, inference, flavorValue });
};

/**
 * @param {{ cluster: Cluster; connectionInfo: ConnectionInfo;  bucketName: string; error: Error; logger: Logger; app: App }} param0
 * @throws {Error}
 * @returns {Promise<DocumentKindData>}
 */
const getDocumentKindDataByErrorHandling = async ({ cluster, connectionInfo, bucketName, error, logger, app }) => {
	const errorCode = clusterHelper.getErrorCode({ error });
	switch (errorCode) {
		case COUCHBASE_ERROR_CODE.bucketIsEmpty:
			return getDefaultDocumentKindData({ bucketName });
		case COUCHBASE_ERROR_CODE.primaryIndexDoesNotExist:
		case COUCHBASE_ERROR_CODE.n1qlMethodsAreNotSupported:
		case COUCHBASE_ERROR_CODE.userDoesNotHaveAccessToPrivilegeCluster:
			return getDocumentKindDataUsingRestApi({ bucketName, connectionInfo, logger, app });
		case COUCHBASE_ERROR_CODE.parseSyntaxError:
		case COUCHBASE_ERROR_CODE.inferMethodIsNotSupport:
			return getDocumentKindDataUsingN1ql({ cluster, bucketName });
		default:
			throw error;
	}
};

module.exports = {
	getBucketsDocumentKindList,
};
