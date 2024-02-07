const { getValidBucketName } = require('../utils/objectConformance');
const { getIndexesScript } = require('./indexesScriptsService');
const { getInsertScripts, getInsertScriptForCollection } = require('./insertScriptsService');

const wrapWithCommentAboutNotExistingBucket = bucketName => {
	return `/*\n * If bucket '${bucketName}' does not exists it will be created automatically by Hackolade\n */\n\n`;
};

class ForwardEngineeringScriptBuilder {
	constructor() {
		this.script = '';
		this.insertScripts = '';
	}

	addTemplateScript({ bucket }) {
		const bucketName = getValidBucketName(bucket);
		this.script = `${this.script}${wrapWithCommentAboutNotExistingBucket(bucketName)}`;
		return this;
	}

	addIndexesScript({ bucket, indexes }) {
		this.script = `${this.script}${getIndexesScript({ bucket, indexes })}`;
		return this;
	}

	async addContainerInsertScripts({ bucket, collections, jsonData, fakerLocalization }) {
		this.insertScripts = getInsertScripts({ bucket, collections, jsonData, fakerLocalization });
		return this;
	}

	async addCollectionInsertScripts({ bucket, fakerLocalization, jsonData, keyPropertyId, collection }) {
		const bucketName = getValidBucketName(bucket);
		this.insertScripts = getInsertScriptForCollection({
			bucketName,
			fakerLocalization,
			jsonData,
			keyPropertyId,
			collection,
		});
		return this;
	}

	buildScriptWithoutSamples() {
		return this.script;
	}

	buildScriptSeparateFromInsertScripts() {
		return { script: this.script, insertScripts: this.insertScripts };
	}

	buildScriptConcatenatedWithInsertScripts(separator = '') {
		return `${this.script}${separator}${this.insertScripts}`;
	}
}

module.exports = ForwardEngineeringScriptBuilder;
