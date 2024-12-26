/**
 * @typedef {import('../../shared/types').App} App
 * @typedef {import('../../shared/types').ConnectionInfo} ConnectionInfo
 * @typedef {import('../../shared/types').Document} Document
 * @typedef {import('../../shared/types').Logger} Logger
 */

const { isObject } = require('lodash');
const { hckFetch } = require('@hackolade/fetch');
const { DEFAULT_LIMIT } = require('../../shared/constants');

class CustomError extends Error {
	constructor({ code, message }) {
		super();
		this.code = code;
		this.message = message;
	}
}

class CouchbaseRestApiService {
	constructor({ host, port, couchbase_username, couchbase_password }) {
		this.host = host;
		this.port = port;

		if (couchbase_username && couchbase_password) {
			this.password = couchbase_password;
			this.username = couchbase_username;
		}
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
			};
			const response = await hckFetch(uri, options);
			return await response.json();
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

const isBinaryFile = obj => isObject(obj) && !!obj.base64 && !!obj.meta;

const createRestApiService = ({ connectionInfo }) => {
	return new CouchbaseRestApiService(connectionInfo);
};

/**
 * @param {{ connectionInfo: ConnectionInfo; bucketName: string; scopeName: string; collectionName: string; logger: Logger; }} param0
 * @returns {Promise<Document[]>}
 */
const getCollectionDocuments = async ({ connectionInfo, bucketName, scopeName, collectionName, logger }) => {
	try {
		logger.info(`${bucketName}.${scopeName}.${collectionName}: Start getting documents using REST API`);

		const apiService = createRestApiService({ connectionInfo });
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
 * @param {{ connectionInfo: ConnectionInfo; logger: Logger; }} param0
 * @returns {Promise<object[]>}
 */
const getIndexes = async ({ connectionInfo, logger }) => {
	logger.info(`Start getting indexes using REST API`);

	const apiService = createRestApiService({ connectionInfo });
	const { indexes } = await apiService.getIndexes();

	return indexes;
};

module.exports = {
	getCollectionDocuments,
	getIndexes,
};
