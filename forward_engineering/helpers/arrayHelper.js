/**
 * @template T
 * @param {T[]} items
 * @param {(item: T) => any} asyncIteratee
 * @returns
 */
const mapEachAsync = (items, asyncIteratee) =>
	items.reduce(async (promise, ...args) => {
		const items = await promise;

		return [...items, await asyncIteratee(...args)];
	}, Promise.resolve([]));

module.exports = {
    mapEachAsync
}