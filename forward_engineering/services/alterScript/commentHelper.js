const { joinStatements } = require('../statements/commonStatements');

/**
 * @param {{ statement: string }} params
 * @returns {string}
 */
const commentStatement = ({ statement } = {}) => {
	if (!statement) {
		return '';
	}

	const joinedStatement = joinStatements({
		statements: statement.split('\n').map(line => ` * ${line}`),
		separator: '\n',
	});

	return `/*\n${joinedStatement}\n */`;
};

module.exports = {
	commentStatement,
};
