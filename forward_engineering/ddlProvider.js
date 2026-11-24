const { wrapWithBackticks } = require('./services/statements/commonStatements');

/**
 * Used by Studio to resolve names in custom script hooks
 */
module.exports = () => ({
	prepareName(name) {
		return wrapWithBackticks(name);
	},
});
