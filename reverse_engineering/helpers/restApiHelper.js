/**
 * @typedef {import('../../shared/types').App} App
 * @typedef {import('../../shared/types').ConnectionInfo} ConnectionInfo
 * @typedef {import('../../shared/types').Document} Document
 * @typedef {import('../../shared/types').Logger} Logger
 */

const _ = require('lodash');
const { DEFAULT_LIMIT } = require('../../shared/constants');

class CustomError extends Error {
	constructor({ code, message }) {
		super();
		this.code = code;
		this.message = message;
	}
}

class CouchbaseRestApiService {
	constructor(connectionInfo, httpService) {
		this.host = connectionInfo.host;
		this.port = connectionInfo.port;

		if (connectionInfo?.couchbase_username && connectionInfo?.couchbase_password) {
			this.password = connectionInfo.couchbase_password;
			this.username = connectionInfo.couchbase_username;
		}

		this.httpService = httpService;
	}

	/**
	 * @returns {string}
	 */
	encodeCredentials() {
		return Buffer.from(`${this.username}:${this.password}`).toString('base64');
	}

	/**
	 * @param {string} endpoint
	 * @returns {Promise<any>}
	 * @throws {CustomError}
	 */
	async fetch(endpoint) {
		try {
			const uri = `http://${this.host}:${this.port}${endpoint}`;
			const encodedCredentials = this.encodeCredentials();
			const options = {
				headers: {
					Authorization: `Basic ${encodedCredentials}`,
				},
				useElectronNet: true,
			};

			return await this.httpService.get(uri, options);
		} catch (error) {
			throw new CustomError({
				message: error.statusText || error.message,
				code: error.status || error.code,
			});
		}
	}

	/**
	 * @param {{ bucketName: string; scopeName: string; collectionName: string; limit: number }} param0
	 * @returns {Promise<Document[]>}
	 */
	async getCollectionDocuments({ bucketName, scopeName, collectionName, limit }) {
		const endpoint = `/pools/default/buckets/${bucketName}/scopes/${scopeName}/collections/${collectionName}/docs?include_docs=true&limit=${limit}&skip=0`;
		return await this.fetch(endpoint);
	}

	/**
	 * @param {{ bucketName: string; scopeName: string; collectionName: string; }} param0
	 * @returns {Promise<{ error: Error; key: string }>}
	 */
	async getLocalRandomKey({ bucketName, scopeName, collectionName }) {
		const endpoint = `/pools/default/buckets/${bucketName}/scopes/${scopeName}/collections/${collectionName}/localRandomKey`;
		return await this.fetch(endpoint);
	}

	async getIndexes() {
		return await this.fetch('/indexStatus');
	}
}

const safeParse = value => {
	try {
		return JSON.parse(value);
	} catch (error) {
		return value;
	}
};

const isBinaryFile = obj => _.isObject(obj) && !!obj.base64 && !!obj.meta;

const createRestApiService = ({ connectionInfo, app }) => {
	const httpService = app.require('httpService');
	const httpServiceInstance = httpService.createInstance(connectionInfo);
	const apiService = new CouchbaseRestApiService(connectionInfo, httpServiceInstance);

	return apiService;
};

/**
 * @param {{ connectionInfo: ConnectionInfo; bucketName: string; scopeName: string; collectionName: string; logger: Logger; app: App }} param0
 * @returns {Promise<Document[]>}
 */
const getCollectionDocuments = async ({ connectionInfo, bucketName, scopeName, collectionName, logger, app }) => {
	try {
		logger.info(`${bucketName}.${scopeName}.${collectionName}: Start getting documents using REST API`);

		const apiService = createRestApiService({ connectionInfo, app });
		const { rows } = await apiService.getCollectionDocuments({
			bucketName,
			scopeName,
			collectionName,
			limit: DEFAULT_LIMIT,
		});

		return rows
			.filter(row => !isBinaryFile(row))
			.map(row => ({
				[bucketName]: safeParse(row.doc?.json),
				docid: row.id,
			}));
	} catch (error) {
		logger.error(error);
		return [];
	}
};

/**
 * @param {{ connectionInfo: ConnectionInfo; logger: Logger; app: App }} param0
 * @returns {Promise<object[]>}
 */
const getIndexes = async ({ connectionInfo, logger, app }) => {
	logger.info(`Start getting indexes using REST API`);

	const apiService = createRestApiService({ connectionInfo, app });
	const { indexes } = await apiService.getIndexes();

	return indexes;
};

module.exports = {
	getCollectionDocuments,
	getIndexes,
};
