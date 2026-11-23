const { wrapWithBackticks } = require('./services/statements/commonStatements');

/**
 * Used by Hackolade Studio to resolve names in custom script hooks
 * and to comment out hooks of deactivated objects.
 */
module.exports = () => ({
	prepareName(name) {
		return wrapWithBackticks(name);
	},
});
