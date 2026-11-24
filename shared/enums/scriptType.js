/**
 * Statement types understood by Hackolade Studio when it inserts custom script hooks.
 */
const SCRIPT_TYPE = {
	createContainer: 'CREATE_CONTAINER',
	dropContainer: 'DROP_CONTAINER',
	createEntity: 'CREATE_ENTITY',
	dropEntity: 'DROP_ENTITY',
	alterEntity: 'ALTER_ENTITY',
	createEntityIndex: 'CREATE_ENTITY_INDEX',
	dropEntityIndex: 'DROP_ENTITY_INDEX',
	alterEntityIndex: 'ALTER_ENTITY_INDEX',
	sampleData: 'SAMPLE_DATA',
};

module.exports = {
	SCRIPT_TYPE,
};
