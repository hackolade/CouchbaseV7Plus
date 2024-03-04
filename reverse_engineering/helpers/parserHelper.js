/**
 * @typedef {{ scopes: Scope[]; collections: Collection[]; indexes: object[] }} ParsedResult
 */

const { isEmpty, get } = require('lodash');
const antlr4 = require('antlr4');
const n1qlLexer = require('../antlr/parser/n1qlLexer');
const n1qlParser = require('../antlr/parser/n1qlParser');
const n1qlToCollectionVisitor = require('../antlr/n1qlToCollectionVisitor');
const ExprErrorListener = require('../antlr/antlrErrorListener');

/**
 * @param {{ statements: string }} param0
 * @returns {ParsedResult}
 */
const parseN1qlStatements = ({ statements }) => {
	const chars = new antlr4.InputStream(statements);
	const lexer = new n1qlLexer(chars);

	const tokens = new antlr4.CommonTokenStream(lexer);
	const parser = new n1qlParser(tokens);

	parser.removeErrorListeners();
	parser.addErrorListener(new ExprErrorListener());

	const tree = parser.statements();

	const n1qlToCollectionsGenerator = new n1qlToCollectionVisitor();
	const result = tree.accept(n1qlToCollectionsGenerator);

	return mapParsedResult({ result, statements });
};

/**
 * @param {{ result: ParsedResult[]; statements: string; }} param0
 * @returns {ParsedResult}
 */
const mapParsedResult = ({ result, statements }) => {
	const scopes = result.flatMap(({ scopes }) => scopes);
	const collections = result.flatMap(({ collections }) => collections);
	const indexes = result.flatMap(({ indexes }) => indexes);

	return {
		scopes,
		collections,
		indexes: mapIndexes({ indexes, statements }),
	};
};

const mapIndexes = ({ indexes, statements }) => {
	return indexes.reduce((result, indexData) => {
		if (isEmpty(indexData)) {
			return result;
		}

		let indexWithKeys = indexData.index;

		if (indexWithKeys.indxType !== 'Primary') {
			const indexKeys = get(indexData, 'indexKeys.indexKeysIntervals').reduce((indexKeys, key) => {
				const select = key.select;
				const name = removeParentheses(statements.substring(select.start, select.stop));
				return [...indexKeys, { name, type: key.type }];
			}, []);

			if (indexWithKeys.indxType === 'Secondary') {
				indexWithKeys = {
					...indexWithKeys,
					[get(indexData, 'indexKeys.indexKeysPropertyKeyword')]: indexKeys,
				};
			} else {
				indexWithKeys = {
					...indexWithKeys,
					[get(indexData, 'indexKeys.indexKeysPropertyKeyword')]: indexKeys
						.map(index => index.name)
						.join(', '),
				};
			}
		}

		return [...result, { ...indexData, index: indexWithKeys }];
	}, []);
};

const removeParentheses = string => {
	if (/^[(`'"].*[)`'"]$/i.test(string)) {
		return string.slice(1, string.length - 1);
	}

	return string;
};

module.exports = {
	parseN1qlStatements,
};
