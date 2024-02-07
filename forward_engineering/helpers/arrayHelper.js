/**
 * @template T
 * @param {T[]} items
 * @param {(item: T) => any} asyncIteratee
 * @returns
 */
const eachAsync = (items, asyncIteratee) =>
	items.reduce(async (promise, ...args) => {
		await promise;

		return await asyncIteratee(...args);
	}, Promise.resolve());

module.exports = {
	eachAsync,
};
