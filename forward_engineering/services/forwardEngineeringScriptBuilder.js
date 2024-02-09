const { getValidBucketName } = require('../utils/objectConformance');
const { getIndexesScript } = require('./indexesScriptsService');
const { getInsertScripts, getInsertScriptForCollection } = require('./insertScriptsService');

const wrapWithBackticks = str => `\`${str}\``;

const getScopeScript = scope => {
	const namespace = scope.namespace ? `${wrapWithBackticks(scope.namespace)}: ` : '';
	const bucket = wrapWithBackticks(scope.bucket);
	const scopeName = wrapWithBackticks(scope.name);
	const ifNotExistsClause = scope.ifNotExists ? 'IF NOT EXISTS' : '';

	return `CREATE SCOPE ${namespace}${bucket}.${scopeName} ${ifNotExistsClause}`;
};

const getCollectionScript = collection => {
	const namespace = collection.namespace ? `${wrapWithBackticks(collection.namespace)}: ` : '';
	const bucketAndScope =
		collection.bucket && collection.scope
			? `${wrapWithBackticks(collection.bucket)}.${wrapWithBackticks(collection.scope)}.`
			: '';
	const ifNotExistsClause = collection.ifNotExists ? 'IF NOT EXISTS' : '';

	return `CREATE COLLECTION ${namespace}${bucketAndScope}${collection.collectionName} ${ifNotExistsClause}\n\n`;
};

class ForwardEngineeringScriptBuilder {
	constructor() {
		this.ddlScript = '';
		this.insertScripts = '';
	}

	#getDdlStatementsSeparator() {
		return this.ddlScript ? '\n\n' : '';
	}

	addScopeScript(scope) {
		this.ddlScript = `${this.ddlScript}${this.#getDdlStatementsSeparator()}${getScopeScript(scope)}`;
		return this;
	}

	addCollectionScripts(collection) {
		this.ddlScript = `${this.ddlScript}${this.#getDdlStatementsSeparator()}${getCollectionScript(collection)}`;
		this.ddlScript = `${this.ddlScript}${getIndexesScript(collection)}`;
		return this;
	}

	async addContainerInsertScripts({ bucket, collections, jsonData }) {
		this.insertScripts = getInsertScripts({ bucket, collections, jsonData });
		return this;
	}

	async addCollectionInsertScripts({ jsonData, collection }) {
		this.insertScripts = getInsertScriptForCollection({
			jsonData,
			collection,
		});
		return this;
	}

	buildScriptWithoutSamples() {
		return this.ddlScript;
	}

	buildScriptSeparateFromInsertScripts() {
		return { script: this.ddlScript, insertScripts: this.insertScripts };
	}

	buildScriptConcatenatedWithInsertScripts(separator = '') {
		return `${this.ddlScript}${separator}${this.insertScripts}`;
	}
}

module.exports = ForwardEngineeringScriptBuilder;
