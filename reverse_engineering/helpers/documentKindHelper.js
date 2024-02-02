/**
 * @typedef {import('../../shared/types').App} App
 * @typedef {import('../../shared/types').Document} Document
 * @typedef {import('../../shared/types').DocumentKindData} DocumentKindData
 * @typedef {import('../../shared/types').Cluster} Cluster
 * @typedef {import('../../shared/types').ConnectionInfo} ConnectionInfo
 * @typedef {import('../../shared/types').BucketCollectionNamesData} BucketCollectionNamesData
 * @typedef {import('../../shared/types').Logger} Logger
 */
const _ = require('lodash');
const clusterHelper = require('./clusterHelper');
const restApiHelper = require('./restApiHelper');
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
	const documentKindList = [];
	const selectedBucket = connectionInfo.couchbase_bucket;
	const bucketScopeNameMap = await clusterHelper.getBucketScopeNameMap({ cluster, selectedBucket });

	for (const bucketName in bucketScopeNameMap) {
		const scopes = bucketScopeNameMap[bucketName];
		const hasDefaultCollection = clusterHelper.isBucketHasDefaultCollection({ scopes });

		if (hasDefaultCollection) {
			const documentKindData = await getBucketDocumentKindData({
				cluster,
				connectionInfo,
				bucketName,
				logger,
				app,
			});
			documentKindList.push(documentKindData);
		}
	}

	return documentKindList;
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
	const typeOf = obj => {
		return {}.toString.call(obj).split(' ')[1].slice(0, -1).toLowerCase();
	};

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

				inferSchema.properties[prop]['type'] = typeOf(item[prop]);
			} else {
				inferSchema.properties[prop] = {
					'#docs': 1,
					'%docs': 100,
					'samples': [item[prop]],
					'type': typeOf(item[prop]),
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
 * @param {string[]} array
 * @returns {string[]}
 */
const replaceQuotes = array =>
	array.map(item => {
		const inQuotes = _.first(item) === '`' && _.last(item) === '`';

		return inQuotes ? item.slice(1, -1) : item;
	});

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
 * @param {{ bucketName: string; inference: Document; isCustomInfer: boolean; flavorValue: string; }} param0
 * @returns {DocumentKindData}
 */
const getDocumentKindDataFromInfer = ({ bucketName, inference, isCustomInfer, flavorValue }) => {
	let suggestedDocKinds = [];
	let otherDocKinds = [];
	let documentKind = {
		key: '',
		probability: 0,
	};

	if (isCustomInfer) {
		let minCount = Infinity;
		inference = inference.properties;

		for (let key in inference) {
			if (isSuggestedDocKind(inference[key])) {
				suggestedDocKinds.push(key);

				if (inference[key]['%docs'] >= documentKind.probability && inference[key].samples.length < minCount) {
					minCount = inference[key].samples.length;
					documentKind.probability = inference[key]['%docs'];
					documentKind.key = key;
				}
			} else if (inference[key]['type'] === 'string') {
				otherDocKinds.push(key);
			}
		}
	} else {
		const flavor = flavorValue ? flavorValue.split(',') : inference[0].Flavor.split(',');
		if (flavor.length === 1) {
			suggestedDocKinds = getSuggestedDocKindsFromInference(inference);
			const flavorRegex = new RegExp(FLAVOR_REGEX);
			const matchedDocKind = flavor[0].match(flavorRegex);
			documentKind.key = matchedDocKind.length ? matchedDocKind[1] : '';
		}
	}

	documentKind.key = replaceQuotes([documentKind.key])[0];

	let documentKindData = {
		bucketName,
		documentList: suggestedDocKinds,
		documentKind: documentKind.key,
		otherDocKinds,
	};

	return documentKindData;
};

const manualInfer = ({ bucketName, documents }) => {
	const inference = generateCustomInferSchema({ bucketName, documents });
	return getDocumentKindDataFromInfer({ bucketName, inference, isCustomInfer: true });
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
