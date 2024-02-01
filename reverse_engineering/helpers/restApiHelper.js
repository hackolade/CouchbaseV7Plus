const _ = require('lodash');
const async = require('async');
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

		if (connectionInfo.couchbase_username && connectionInfo.couchbase_password) {
			this.password = connectionInfo.couchbase_password;
			this.username = connectionInfo.couchbase_username;
		}

		this.httpService = httpService;
	}

	async fetch(endpoint, options = {}) {
		const uri = `http://${this.host}:${this.port}${endpoint}`;

		if (this.username && this.password) {
			let encodedCredentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
			options = {
				...options,
				headers: {
					...(options.headers || {}),
					Authorization: `Basic ${encodedCredentials}`,
				},
				useElectronNet: false,
			};
		}

		try {
			return await this.httpService.get(uri, options);
		} catch (error) {
			throw new CustomError({
				message: error.statusText || error.message,
				code: error.status || error.code,
			});
		}
	}

	async count(bucketName) {
		const body = await this.fetch(`/pools/default/buckets/${bucketName}`);

		return body?.basicStats?.itemCount;
	}

	async getDocuments(bucketName, size) {
		let docsUri = `/pools/default/buckets/${bucketName}/docs?include_docs=true&limit=${size}&skip=0`;

		const body = await this.fetch(docsUri);

		return body?.rows?.map(item => {
			return {
				json: safeParse(item?.doc?.json),
				meta: {
					id: item?.id,
				},
			};
		});
	}

	async getDocumentByKey(bucketName, key) {
		let docsUri = `/pools/default/buckets/${bucketName}/docs/${encodeURIComponent(key.replace(/\u0000/g, ''))}`;
		const body = await this.fetch(docsUri);

		return {
			...body,
			json: safeParse(body.json),
		};
	}

	async getRandomKey(bucketName) {
		const randomKeyUri = `/pools/default/buckets/${bucketName}/localRandomKey`;

		return this.fetch(randomKeyUri);
	}

	async getVersion() {
		const body = await this.fetch('/pools');

		return body.implementationVersion;
	}

	async getIndexes() {
		const body = await this.fetch('/indexStatus');

		return body.indexes;
	}
}

const safeParse = value => {
	try {
		if (typeof value !== 'string') {
			return value;
		}
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

const getBucketDocuments = async ({ connectionInfo, bucketName, logger, app }) => {
	logger.info(`${bucketName}: Start getting documents using REST API`);

	const apiService = createRestApiService({ connectionInfo, app });
	const count = await apiService.count(bucketName);
	const body = await apiService.getRandomKey(bucketName);
	const size = count ?? DEFAULT_LIMIT;

	if (body.error === 'fallback_to_all_docs') {
		logger.error({ message: `"localRandomKey" in not available or bucket ${bucketName} is empty` });

		return await apiService.getDocuments(bucketName, size);
	}

	logger.info(`REST API: fetching documents by random key`);

	const maxNumberOfAttempts = 5;

	let numberOfAttempts = 0;

	return new Promise((resolve, reject) => {
		async.timesLimit(
			size,
			50,
			async index => {
				if (numberOfAttempts > maxNumberOfAttempts) {
					return;
				}

				const keyBody = await apiService.getRandomKey(bucketName).catch(error => {
					logger.error({ message: `Error fetching random key from bucket "${bucketName}" (${index})` });
					return Promise.reject(error);
				});

				return await apiService.getDocumentByKey(bucketName, keyBody.key).catch(error => {
					if (numberOfAttempts >= maxNumberOfAttempts) {
						throw error;
					}

					logger.error({
						message: `Error fetching document by random key from bucket "${bucketName}" (${index})`,
					});

					numberOfAttempts++;
				});
			},
			(error, result) => {
				if (error) {
					logger.error(error);
					return reject(error);
				}

				logger.info(`Successfully read ${result.length} document(s)`);

				const documents = (result || [])
					.filter(item => Boolean(item) && !isBinaryFile(item))
					.map(item => ({ [bucketName]: item.json }));

				return resolve(documents);
			},
		);
	});
};

module.exports = {
	getBucketDocuments,
};
