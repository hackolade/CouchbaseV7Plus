const { getIndexesScript } = require('./statements/indexesStatements');
const { getInsertScripts, getInsertScriptForCollection } = require('./statements/insertStatements');
const { getScopeScript } = require('./statements/scopesStatements');
const { getCollectionScript } = require('./statements/collectionsStatements');

class ForwardEngineeringScriptBuilder {
	constructor() {
		this.ddlScript = '';
		this.insertScripts = '';
	}

	/**
	 *
	 * @returns {string}
	 */
	#getDdlStatementsSeparator() {
		return this.ddlScript ? '\n\n' : '';
	}

	/**
	 *
	 * @param {object} scope
	 * @returns {ForwardEngineeringScriptBuilder}
	 */
	addScopeScript(scope) {
		this.ddlScript = `${this.ddlScript}${this.#getDdlStatementsSeparator()}${getScopeScript(scope)}`;
		return this;
	}

	/**
	 *
	 * @param {object[]} collections
	 * @returns {ForwardEngineeringScriptBuilder}
	 */
	addCollectionsScripts(collections) {
		const collectionsDefinitionsScripts = collections.map(collection => getCollectionScript(collection));
		const collectionsIndexesScripts = collections.map(collection => getIndexesScript(collection));
		const primaryIndexesScripts = collectionsIndexesScripts.filter(script =>
			script.startsWith('CREATE PRIMARY INDEX'),
		);
		const restOfIndexes = collectionsIndexesScripts.filter(script => !primaryIndexesScripts.includes(script));

		const collectionsScripts = [...collectionsDefinitionsScripts, ...primaryIndexesScripts, ...restOfIndexes]
			.filter(Boolean)
			.join(this.#getDdlStatementsSeparator());
		this.ddlScript = `${this.ddlScript}${this.#getDdlStatementsSeparator()}${collectionsScripts}`;

		return this;
	}

	/**
	 *
	 * @param {object} collection
	 * @returns {ForwardEngineeringScriptBuilder}
	 */
	addCollectionScripts(collection) {
		this.ddlScript = `${this.ddlScript}${this.#getDdlStatementsSeparator()}${getCollectionScript(collection)}`;
		this.ddlScript = `${this.ddlScript}${getIndexesScript(collection)}`;
		return this;
	}

	/**
	 *
	 * @param {{collections: object[], jsonData: object}} insertScriptsParams
	 * @returns {ForwardEngineeringScriptBuilder}
	 */
	async addContainerInsertScripts({ collections, jsonData }) {
		this.insertScripts = getInsertScripts({ collections, jsonData });
		return this;
	}

	/**
	 *
	 * @param {{collection: object, jsonData: object}} insertScriptsParams
	 * @returns {ForwardEngineeringScriptBuilder}
	 */
	async addCollectionInsertScripts({ jsonData, collection }) {
		this.insertScripts = getInsertScriptForCollection({
			jsonData,
			collection,
		});
		return this;
	}

	/**
	 *
	 * @returns {{script: string, insertScripts: string}}
	 */
	buildScriptSeparateFromInsertScripts() {
		return { script: this.ddlScript, insertScripts: this.insertScripts };
	}

	/**
	 *
	 * @param {string} separator
	 * @returns {string}
	 */
	buildScriptConcatenatedWithInsertScripts(separator = '') {
		return `${this.ddlScript}${separator}${this.insertScripts}`;
	}
}

module.exports = ForwardEngineeringScriptBuilder;
