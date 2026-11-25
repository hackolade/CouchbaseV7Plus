const { getIndexesScript, getIndexStatements } = require('./statements/indexesStatements');
const { getInsertScripts, getInsertScriptForCollection } = require('./statements/insertStatements');
const { getScopeScript } = require('./statements/scopesStatements');
const { getCollectionScript } = require('./statements/collectionsStatements');
const { SCRIPT_TYPE } = require('../../shared/enums/scriptType');

class ForwardEngineeringScriptBuilder {
	constructor() {
		this.ddlScript = '';
		this.insertScripts = '';
		this.ddlStatements = [];
	}

	/**
	 *
	 * @returns {string}
	 */
	#getDdlStatementsSeparator() {
		return this.ddlScript ? '\n\n' : '';
	}

	/**
	 * Statements are collected for Hackolade Studio to insert custom script hooks between them
	 *
	 * @param {{ script: string, scriptType: string, entityId: string | null }} statement
	 */
	#addStatement(statement) {
		if (statement.script.trim()) {
			this.ddlStatements.push(statement);
		}
	}

	/**
	 *
	 * @param {object} scope
	 * @returns {ForwardEngineeringScriptBuilder}
	 */
	addScopeScript(scope) {
		const scopeScript = getScopeScript(scope);

		this.ddlScript = `${this.ddlScript}${this.#getDdlStatementsSeparator()}${scopeScript}`;
		this.#addStatement({ script: scopeScript, scriptType: SCRIPT_TYPE.createContainer, entityId: scope.id });
		return this;
	}

	/**
	 *
	 * @param {object} collection
	 * @returns {ForwardEngineeringScriptBuilder}
	 */
	addCollectionScripts(collection) {
		const collectionScript = getCollectionScript(collection);
		const indexesScript = getIndexesScript(collection);

		this.ddlScript = `${this.ddlScript}${this.#getDdlStatementsSeparator()}${collectionScript}`;
		this.ddlScript = `${this.ddlScript}${indexesScript}`;
		this.#addStatement({
			script: collectionScript,
			scriptType: SCRIPT_TYPE.createEntity,
			entityId: collection.GUID,
		});
		getIndexStatements(collection).forEach(script => {
			this.#addStatement({
				script,
				scriptType: SCRIPT_TYPE.createEntityIndex,
				entityId: collection.GUID,
			});
		});
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
	 * Structured DDL statements. Sample data is not a part of them.
	 *
	 * @returns {{ script: string, scriptType: string, entityId: string | null }[]}
	 */
	buildStatements() {
		return this.ddlStatements;
	}

	/**
	 * Structured DDL statements followed by sample data, for a single script output
	 *
	 * @returns {{ script: string, scriptType: string, entityId: string | null }[]}
	 */
	buildStatementsWithInsertScripts() {
		return [
			...this.ddlStatements,
			{ script: this.insertScripts, scriptType: SCRIPT_TYPE.sampleData, entityId: null },
		].filter(({ script }) => script.trim());
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
