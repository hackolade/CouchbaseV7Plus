/**
 * @param {{ cluster: Cluster }} param0
 * @returns {Promise<Bucket[]>}
 */
const getAllBuckets = async ({ cluster }) => {
	return await cluster.buckets().getAllBuckets();
};

module.exports = {
	getAllBuckets,
};
