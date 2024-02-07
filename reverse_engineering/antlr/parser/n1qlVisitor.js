// Generated from grammars/n1ql.g4 by ANTLR 4.9.2
// jshint ignore: start
const antlr4 = require('antlr4');

// This class defines a complete generic visitor for a parse tree produced by n1qlParser.

class n1qlVisitor extends antlr4.tree.ParseTreeVisitor {
	// Visit a parse tree produced by n1qlParser#statements.
	visitStatements(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#input.
	visitInput(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_trailer.
	visitOpt_trailer(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#stmt_body.
	visitStmt_body(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#stmt.
	visitStmt(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#advise.
	visitAdvise(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_index.
	visitOpt_index(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#explain.
	visitExplain(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#prepare.
	visitPrepare(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_force.
	visitOpt_force(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_name.
	visitOpt_name(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#from_or_as.
	visitFrom_or_as(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#execute.
	visitExecute(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#execute_using.
	visitExecute_using(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#infer.
	visitInfer(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_keyspace_collection.
	visitOpt_keyspace_collection(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_infer_using.
	visitOpt_infer_using(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_infer_ustat_with.
	visitOpt_infer_ustat_with(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#infer_ustat_with.
	visitInfer_ustat_with(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#select_stmt.
	visitSelect_stmt(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#dml_stmt.
	visitDml_stmt(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#ddl_stmt.
	visitDdl_stmt(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#role_stmt.
	visitRole_stmt(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#index_stmt.
	visitIndex_stmt(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#scope_stmt.
	visitScope_stmt(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#collection_stmt.
	visitCollection_stmt(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#function_stmt.
	visitFunction_stmt(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#transaction_stmt.
	visitTransaction_stmt(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#fullselect.
	visitFullselect(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#select_terms.
	visitSelect_terms(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#select_term.
	visitSelect_term(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#subselect.
	visitSubselect(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#from_select.
	visitFrom_select(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#select_from.
	visitSelect_from(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#select_clause.
	visitSelect_clause(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#projection.
	visitProjection(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_quantifier.
	visitOpt_quantifier(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#raw.
	visitRaw(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#projects.
	visitProjects(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#project.
	visitProject(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_as_alias.
	visitOpt_as_alias(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#as_alias.
	visitAs_alias(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#alias.
	visitAlias(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_from.
	visitOpt_from(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#from.
	visitFrom(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#from_term.
	visitFrom_term(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#simple_from_term.
	visitSimple_from_term(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#unnest.
	visitUnnest(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#keyspace_term.
	visitKeyspace_term(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#keyspace_path.
	visitKeyspace_path(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#namespace_term.
	visitNamespace_term(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#namespace_name.
	visitNamespace_name(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#bucket_name.
	visitBucket_name(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#scope_name.
	visitScope_name(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#keyspace_name.
	visitKeyspace_name(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_use.
	visitOpt_use(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#use_options.
	visitUse_options(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#use_keys.
	visitUse_keys(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#use_index.
	visitUse_index(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#join_hint.
	visitJoin_hint(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_primary.
	visitOpt_primary(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#index_refs.
	visitIndex_refs(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#index_ref.
	visitIndex_ref(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#use_hash_option.
	visitUse_hash_option(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_use_del_upd.
	visitOpt_use_del_upd(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_join_type.
	visitOpt_join_type(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_outer.
	visitOpt_outer(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#on_keys.
	visitOn_keys(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#on_key.
	visitOn_key(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_let.
	visitOpt_let(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#let_.
	visitLet_(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#bindings.
	visitBindings(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#binding.
	visitBinding(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_with.
	visitOpt_with(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#with_list.
	visitWith_list(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#with_term.
	visitWith_term(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_where.
	visitOpt_where(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#where.
	visitWhere(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_group.
	visitOpt_group(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#group.
	visitGroup(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#group_terms.
	visitGroup_terms(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#group_term.
	visitGroup_term(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_letting.
	visitOpt_letting(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#letting.
	visitLetting(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_having.
	visitOpt_having(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#having.
	visitHaving(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_order_by.
	visitOpt_order_by(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#order_by.
	visitOrder_by(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#sort_terms.
	visitSort_terms(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#sort_term.
	visitSort_term(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_dir.
	visitOpt_dir(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#dir.
	visitDir(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_order_nulls.
	visitOpt_order_nulls(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#first_last.
	visitFirst_last(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#nulls.
	visitNulls(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_limit.
	visitOpt_limit(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#limit.
	visitLimit(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_offset.
	visitOpt_offset(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#offset.
	visitOffset(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#insert.
	visitInsert(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#simple_keyspace_ref.
	visitSimple_keyspace_ref(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#keyspace_ref.
	visitKeyspace_ref(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_values_header.
	visitOpt_values_header(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#key.
	visitKey(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#values_list.
	visitValues_list(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#values.
	visitValues(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#next_values.
	visitNext_values(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#key_val_expr.
	visitKey_val_expr(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#key_val_options_expr.
	visitKey_val_options_expr(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_returning.
	visitOpt_returning(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#returning.
	visitReturning(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#returns_.
	visitReturns_(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#key_expr_header.
	visitKey_expr_header(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#value_expr_header.
	visitValue_expr_header(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#options_expr_header.
	visitOptions_expr_header(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#key_val_options_expr_header.
	visitKey_val_options_expr_header(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#upsert.
	visitUpsert(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#delete_.
	visitDelete_(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#update.
	visitUpdate(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#set.
	visitSet(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#set_terms.
	visitSet_terms(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#set_term.
	visitSet_term(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#function_meta_expr.
	visitFunction_meta_expr(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_update_for.
	visitOpt_update_for(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#update_for.
	visitUpdate_for(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#update_dimensions.
	visitUpdate_dimensions(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#update_dimension.
	visitUpdate_dimension(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#update_binding.
	visitUpdate_binding(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#variable.
	visitVariable(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_when.
	visitOpt_when(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#unset.
	visitUnset(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#unset_terms.
	visitUnset_terms(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#unset_term.
	visitUnset_term(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#merge.
	visitMerge(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_use_merge.
	visitOpt_use_merge(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_key.
	visitOpt_key(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#merge_actions.
	visitMerge_actions(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_merge_delete_insert.
	visitOpt_merge_delete_insert(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_merge_insert.
	visitOpt_merge_insert(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#merge_update.
	visitMerge_update(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#merge_delete.
	visitMerge_delete(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#merge_insert.
	visitMerge_insert(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#grant_role.
	visitGrant_role(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#role_list.
	visitRole_list(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#role_name.
	visitRole_name(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#keyspace_scope_list.
	visitKeyspace_scope_list(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#keyspace_scope.
	visitKeyspace_scope(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#user_list.
	visitUser_list(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#user.
	visitUser(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#revoke_role.
	visitRevoke_role(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#create_scope.
	visitCreate_scope(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#drop_scope.
	visitDrop_scope(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#create_collection.
	visitCreate_collection(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#drop_collection.
	visitDrop_collection(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#flush_collection.
	visitFlush_collection(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#flush_or_truncate.
	visitFlush_or_truncate(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#create_index.
	visitCreate_index(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#create_primary_index.
	visitCreate_primary_index(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_primary_name.
	visitOpt_primary_name(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#index_name.
	visitIndex_name(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_index_name.
	visitOpt_index_name(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#named_keyspace_ref.
	visitNamed_keyspace_ref(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#simple_named_keyspace_ref.
	visitSimple_named_keyspace_ref(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#named_scope_ref.
	visitNamed_scope_ref(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#index_partition.
	visitIndex_partition(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_index_using.
	visitOpt_index_using(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#index_using.
	visitIndex_using(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_index_with.
	visitOpt_index_with(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#index_with.
	visitIndex_with(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#index_terms.
	visitIndex_terms(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#index_term.
	visitIndex_term(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#index_term_expr.
	visitIndex_term_expr(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#index_expr.
	visitIndex_expr(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#all.
	visitAll(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#index_where.
	visitIndex_where(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_ikattr.
	visitOpt_ikattr(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#ikattr.
	visitIkattr(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#drop_index.
	visitDrop_index(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#alter_index.
	visitAlter_index(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#build_index.
	visitBuild_index(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#create_function.
	visitCreate_function(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_replace.
	visitOpt_replace(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#func_name.
	visitFunc_name(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#short_func_name.
	visitShort_func_name(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#long_func_name.
	visitLong_func_name(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#parm_list.
	visitParm_list(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#parameter_terms.
	visitParameter_terms(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#func_body.
	visitFunc_body(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#drop_function.
	visitDrop_function(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#execute_function.
	visitExecute_function(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#update_statistics.
	visitUpdate_statistics(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_for.
	visitOpt_for(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#update_stat_terms.
	visitUpdate_stat_terms(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#update_stat_term.
	visitUpdate_stat_term(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#path.
	visitPath(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#expr.
	visitExpr(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#valued.
	visitValued(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#c_expr.
	visitC_expr(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#b_expr.
	visitB_expr(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#literal.
	visitLiteral(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#construction_expr.
	visitConstruction_expr(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#object.
	visitObject(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_members.
	visitOpt_members(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#members.
	visitMembers(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#member.
	visitMember(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#array.
	visitArray(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_exprs.
	visitOpt_exprs(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#exprs.
	visitExprs(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#param_expr.
	visitParam_expr(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#case_expr.
	visitCase_expr(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#simple_or_searched_case.
	visitSimple_or_searched_case(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#simple_case.
	visitSimple_case(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#when_thens.
	visitWhen_thens(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#searched_case.
	visitSearched_case(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_else.
	visitOpt_else(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#function_expr.
	visitFunction_expr(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#function_name.
	visitFunction_name(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#collection_expr.
	visitCollection_expr(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#collection_cond.
	visitCollection_cond(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#coll_bindings.
	visitColl_bindings(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#coll_binding.
	visitColl_binding(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#satisfies.
	visitSatisfies(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#collection_xform.
	visitCollection_xform(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#paren_expr.
	visitParen_expr(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#subquery_expr.
	visitSubquery_expr(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#expr_input.
	visitExpr_input(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#all_expr.
	visitAll_expr(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_window_clause.
	visitOpt_window_clause(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#window_list.
	visitWindow_list(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#window_term.
	visitWindow_term(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#window_specification.
	visitWindow_specification(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_window_name.
	visitOpt_window_name(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_window_partition.
	visitOpt_window_partition(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_window_frame.
	visitOpt_window_frame(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#window_frame_modifier.
	visitWindow_frame_modifier(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_window_frame_exclusion.
	visitOpt_window_frame_exclusion(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#window_frame_extents.
	visitWindow_frame_extents(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#window_frame_extent.
	visitWindow_frame_extent(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#window_frame_valexpr_modifier.
	visitWindow_frame_valexpr_modifier(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_nulls_treatment.
	visitOpt_nulls_treatment(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#nulls_treatment.
	visitNulls_treatment(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_from_first_last.
	visitOpt_from_first_last(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#agg_quantifier.
	visitAgg_quantifier(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_filter.
	visitOpt_filter(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_window_function.
	visitOpt_window_function(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#window_function_details.
	visitWindow_function_details(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#start_transaction.
	visitStart_transaction(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#commit_transaction.
	visitCommit_transaction(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#rollback_transaction.
	visitRollback_transaction(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#start_or_begin.
	visitStart_or_begin(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_transaction.
	visitOpt_transaction(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#transaction.
	visitTransaction(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_savepoint.
	visitOpt_savepoint(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#savepoint_name.
	visitSavepoint_name(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#opt_isolation_level.
	visitOpt_isolation_level(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#isolation_level.
	visitIsolation_level(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#isolation_val.
	visitIsolation_val(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#set_transaction_isolation.
	visitSet_transaction_isolation(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#savepoint.
	visitSavepoint(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#if_exists.
	visitIf_exists(ctx) {
		return this.visitChildren(ctx);
	}

	// Visit a parse tree produced by n1qlParser#if_not_exists.
	visitIf_not_exists(ctx) {
		return this.visitChildren(ctx);
	}
}

module.exports = n1qlVisitor;
