/*
 * Copyright © 2016-2023 by IntegrIT S.A. dba Hackolade.  All rights reserved.
 *
 * The copyright to the computer software herein is the property of IntegrIT S.A.
 * The software may be used and/or copied only with the written permission of
 * IntegrIT S.A. or in accordance with the terms and conditions stipulated in
 * the agreement/contract under which the software has been supplied.
 */
const n1qlVisitor = require('./parser/n1qlVisitor');

class Visitor extends n1qlVisitor {
	visitCreate_index(ctx) {
		const indxName = this.visit(ctx.index_name());
		const indexKeys = this.visit(ctx.index_terms());
		const { bucketName, scopeName, collectionName } = this.visit(ctx.named_keyspace_ref());
		const usingGSI = this.visitIfExists(ctx, 'opt_index_using', false);
		const partitionByHashExpr = this.visitIfExists(ctx, 'index_partition', '');
		const whereClause = this.visitIfExists(ctx, 'index_where', '');
		const withOptions = this.visitIfExists(ctx, 'opt_index_with', {});
		if (isMetaIndex(indexKeys)) {
			return {
				index: {
					indxName,
					indxType: 'Metadata',
				},
				bucketName,
				scopeName,
				collectionName,
				indexKeys: {
					indexKeysPropertyKeyword: 'metadataExpr',
					indexKeysIntervals: indexKeys,
				},
			};
		} else if (isArrayIndex(indexKeys)) {
			return {
				index: {
					indxName,
					indxType: 'Array',
					usingGSI,
					whereClause,
					withOptions,
				},
				bucketName,
				scopeName,
				collectionName,
				indexKeys: {
					indexKeysPropertyKeyword: 'arrayExpr',
					indexKeysIntervals: indexKeys,
				},
			};
		} else {
			return {
				index: {
					indxName,
					indxType: 'Secondary',
					usingGSI,
					whereClause,
					withOptions,
					...(partitionByHashExpr && { partitionByHash: 'Expression', partitionByHashExpr }),
				},
				bucketName,
				scopeName,
				collectionName,
				indexKeys: {
					indexKeysPropertyKeyword: 'indxKey',
					indexKeysIntervals: indexKeys,
				},
			};
		}
	}
	visitCreate_primary_index(ctx) {
		const indxName = this.visit(ctx.opt_primary_name());
		const usingGSI = this.visitIfExists(ctx, 'opt_index_using', false);
		const { bucketName, scopeName, collectionName } = this.visit(ctx.named_keyspace_ref());
		const withOptions = this.visitIfExists(ctx, 'opt_index_with', {});
		return {
			index: {
				indxName,
				indxType: 'Primary',
				partitionByHash: '',
				usingGSI,
				withOptions,
			},
			bucketName,
			scopeName,
			collectionName,
		};
	}

	visitIndex_partition(ctx) {
		return this.visitIfExists(ctx, 'exprs', []).join(', ');
	}

	visitIndex_terms(ctx) {
		const singleTerm = this.visit(ctx.index_term());
		const otherTerms = this.visitIfExists(ctx, 'index_terms', null);
		if (otherTerms) {
			return [...otherTerms, singleTerm];
		}
		return [singleTerm];
	}

	visitIndex_term(ctx) {
		const indexOrder = this.visit(ctx.opt_ikattr());
		const expr = this.visit(ctx.index_term_expr());

		return {
			name: expr,
			type: indexOrder === 'DESC' ? 'descending' : 'ascending',
			select: {
				start: ctx.index_term_expr().start.start,
				stop: ctx.index_term_expr().stop.stop + 1,
			},
		};
	}

	visitIndex_term_expr(ctx) {
		const distinct = getName(ctx.DISTINCT());
		const all = getName(ctx.all());
		return all + distinct + this.visitIfExists(ctx, 'index_expr', '');
	}

	visitOpt_ikattr(ctx) {
		return this.visit(ctx.ikattr())[0];
	}
	visitIkattr(ctx) {
		return ctx.getText();
	}

	visitOpt_index_with(ctx) {
		return this.visit(ctx.index_with());
	}

	visitIndex_with(ctx) {
		const expression = this.visit(ctx.expr());
		const withOptions = JSON.parse(expression);
		if (!withOptions.nodes) {
			return withOptions;
		}
		const mappedNodes = withOptions.nodes.map(node => ({ nodeName: node }));
		return { ...withOptions, nodes: mappedNodes };
	}

	visitIndex_where(ctx) {
		return this.visit(ctx.index_expr());
	}

	visitIndex_expr(ctx) {
		return getName(ctx);
	}

	visitOpt_primary_name(ctx) {
		return getName(ctx);
	}

	visitIndex_name(ctx) {
		return getName(ctx);
	}

	visitNamed_keyspace_ref(ctx) {
		const defaultBucketName = this.visitIfExists(ctx, 'simple_named_keyspace_ref', '');
		const bucketName = this.visitIfExists(ctx, 'bucket_name', '');
		const scopeName = this.visitIfExists(ctx, 'scope_name', '');
		const collectionName = this.visitIfExists(ctx, 'keyspace_name', '');

		return {
			bucketName: defaultBucketName || bucketName,
			scopeName,
			collectionName,
		};
	}

	visitExpr(ctx) {
		return getName(ctx);
	}

	visitSimple_named_keyspace_ref(ctx) {
		return getName(ctx);
	}

	visitKeyspace_name(ctx) {
		return getName(ctx);
	}

	visitOpt_index_using(ctx) {
		const usingStatement = ctx.getText();
		if (!usingStatement) {
			return false;
		}
		return usingStatement.trim().toUpperCase() === 'USINGGSI';
	}

	visitStatements(ctx) {
		return this.visit(ctx.input());
	}

	visitInput(ctx) {
		return this.visit(ctx.stmt_body());
	}

	visitStmt_body(ctx) {
		return this.visit(ctx.stmt());
	}

	visitStmt(ctx) {
		return this.visitIfExists(ctx, 'ddl_stmt', []);
	}

	visitDdl_stmt(ctx) {
		const scopes = this.visitIfExists(ctx, 'scope_stmt', []);
		const collections = this.visitIfExists(ctx, 'collection_stmt', []);
		const indexes = this.visitIfExists(ctx, 'index_stmt', []);

		return {
			scopes,
			collections,
			indexes,
		};
	}

	visitIfExists(ctx, funcName, defaultValue) {
		try {
			return this.visit(ctx[funcName]());
		} catch (e) {
			return defaultValue;
		}
	}

	visitCreate_scope(ctx) {
		const { bucketName, scopeName } = this.visit(ctx.named_scope_ref());
		const ifNotExists = this.visitIfExists(ctx, 'if_not_exists', false);

		return {
			bucketName,
			scopeName,
			ifNotExists,
		};
	}

	visitCreate_collection(ctx) {
		const { bucketName, scopeName, collectionName } = this.visit(ctx.named_keyspace_ref());
		const ifNotExists = this.visitIfExists(ctx, 'if_not_exists', false);

		return {
			bucketName,
			scopeName,
			collectionName,
			ifNotExists,
		};
	}

	visitNamed_scope_ref(ctx) {
		const bucketName = this.visit(ctx.bucket_name());
		const scopeName = this.visit(ctx.scope_name());

		return {
			bucketName,
			scopeName,
		};
	}

	visitBucket_name(ctx) {
		return getName(ctx);
	}

	visitScope_name(ctx) {
		return getName(ctx);
	}

	visitIf_not_exists(ctx) {
		return true;
	}
}

const isMetaIndex = indexKeys => {
	return indexKeys.map(key => key.name).some(key => /^\(?META\(\)/i.test(key));
};

const isArrayIndex = indexKeys => {
	return indexKeys.map(key => key.name).some(key => /^\(?(ALLARRAY|DISTINCTARRAY|DISTINCT|ARRAY)/i.test(key));
};

const getName = context => {
	if (!context) {
		return '';
	}
	return removeQuotes(context.getText());
};

const removeQuotes = string => string.replace(/^(['`"])(.*)\1$/, '$2');

module.exports = Visitor;
