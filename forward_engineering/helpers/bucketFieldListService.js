/*
 * Copyright © 2016-2024 by IntegrIT S.A. dba Hackolade.  All rights reserved.
 *
 * The copyright to the computer software herein is the property of IntegrIT S.A.
 * The software may be used and/or copied only with the written permission of
 * IntegrIT S.A. or in accordance with the terms and conditions stipulated in
 * the agreement/contract under which the software has been supplied.
 */

const mapItemsByPath = ({ properties, path, iteratee, parent, currentPath = [] }) => {
	if (!path.length) {
		return [];
	}

	let result = [];
	const currentId = path[0];
	const nextId = path[1];
	const position = properties.findIndex(item => item.id === currentId);

	if (position === -1) {
		return result;
	}

	const current = properties[position];
	const isRef = current.type === 'reference' && nextId;
	const newPath = currentPath.concat(isRef ? [currentId, nextId] : currentId);

	const updatedItem = iteratee(current, position, newPath, parent);

	result.push(updatedItem);

	if (!Array.isArray(current.properties)) {
		return result;
	}

	return result.concat(
		mapItemsByPath({
			properties: current.properties,
			path: isRef ? path.slice(2) : path.slice(1),
			iteratee,
			parent: current,
			currentPath: newPath,
		}),
	);
};

const treeViewFieldsService = {
	getItemName(item) {
		if (item.arrayItem || item.subschema) {
			const displayName = item.displayName ? ` ${item.displayName}` : '';
			return `[${this.getIndex(item)}]${displayName}`;
		}

		if (item.type === 'choice') {
			return item.choice;
		}

		return item.collectionName || item.name || '';
	},

	getTechnicalItemName(item) {
		if (!item.code) {
			return this.getItemName(item);
		}

		return item.code;
	},

	getIndex(sourceItem) {
		return _.get(sourceItem, 'parent.properties', []).findIndex(
			item => _.get(item, 'id', null) === _.get(sourceItem, 'id', null),
		);
	},
};


const isPolyglotReference = item => item.type === 'reference' && item.refType === 'polyglot';

const bucketFieldListService = {
	updateTagItemsNames({
		tagItems,
		displayName,
		nameDivider,
		ending,
		allowCustomValue,
		lastArray,
		collections, 
		views, 
		graphConnections,
		buckets,
		entityName = true,
		front = false,
		rootTemplate = '',
	}) {
		if (!Array.isArray(tagItems)) {
			return [];
		}

		return tagItems
			.map(tagItem => {
				if (Array.isArray(tagItem.path)) {
					return {
						...tagItem,
						name: getTagItemName({
							path: tagItem.path,
							displayName,
							nameDivider,
							ending,
							lastArray,
							entityName,
							front,
							rootTemplate,
							collections, 
							views, 
							graphConnections,
							buckets,
						}),
					};
				} else if (tagItem.name) {
					return {
						...tagItem,
						custom: allowCustomValue,
					};
				}
			})
			.filter(Boolean);
	},
};

const getEntity = ({id, collections = [], views = [], graphConnections = []}) => {
	const collection = collections.find(collection => collection.id === id);
	 if (collection) {
		return collection;
	}

	const view = views.find(view => view.id === id);
	if (view) {
		return view;
	}

	return graphConnections.find(graphConnection => graphConnection.id === id);
};

const getName = (item, displayName) => {
	if (displayName === 'technical') {
		return treeViewFieldsService.getTechnicalItemName(item);
	} else {
		return treeViewFieldsService.getItemName(item);
	}
};

const getEnding = (field, ending) => {
	if (!ending) {
		return '';
	}

	if (ending[field.type]) {
		return ending[field.type];
	}

	if (ending[field.childType]) {
		return ending[field.childType];
	}

	if (ending.default) {
		return ending.default;
	}

	return '';
};

const findNameByPath = ({
	entity,
	fullPath,
	displayName,
	nameDivider = '.',
	ending = {},
	lastArray = '',
	entityName = true,
	front = false,
}) => {
	const fieldPath = isPolyglotReference(entity) ? fullPath.slice(2) : fullPath.slice(1);

	if (!entity) {
		return '';
	}

	const namePath = mapItemsByPath({
		properties: entity.properties,
		path: fieldPath,
		iteratee: (field, position, path, parent) => {
			const name = getName(
				{
					...field,
					parent,
				},
				displayName,
			);
			const isLast = path.length === fullPath.length;

			if (field.type === 'array' && getEnding(field, ending)) {
				let arrayName = [name, getEnding(field, ending)];

				if (isLast && lastArray) {
					arrayName.push(lastArray);
				}

				return arrayName.filter(Boolean).join(nameDivider);
			}

			if (field.arrayItem) {
				if (isLast && lastArray) {
					return lastArray;
				}

				return '';
			}

			if (field.type === 'choice') {
				return '';
			}

			if (field.subschema) {
				return '';
			}

			if (path.length === fullPath.length) {
				return [name, getEnding(field, ending)].filter(Boolean).join(nameDivider);
			}

			return name;
		},
		parent: entity,
		currentPath: [entity.id],
	});

	if (entityName) {
		return [getName(entity, displayName), ...namePath].filter(Boolean).join(nameDivider);
	} else {
		const result = namePath.filter(Boolean);
		if (front) {
			return ['', ...result].join(nameDivider);
		} else {
			return result.join(nameDivider);
		}
	}
};

const getTagItemName = ({
	path,
	nameDivider,
	ending,
	displayName = 'business',
	lastArray = '',
	entityName = true,
	front = false,
	rootTemplate = '/*',
	collections, 
	views, 
	graphConnections,
	buckets = [],
}) => {
	const entityId = path[0];
	const entity = getEntity({entityId, collections, views, graphConnections});

	if (entity) {
		return findNameByPath({
			fullPath: path,
			entity,
			displayName,
			nameDivider,
			ending,
			lastArray,
			entityName,
			front,
		});
	}

	const bucket = buckets.find(bucket => bucket.id === entityId);

	if (bucket) {
		return rootTemplate;
	}

	return '';
};

module.exports = bucketFieldListService
