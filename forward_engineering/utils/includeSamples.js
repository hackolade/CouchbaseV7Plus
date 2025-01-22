const includeSamples = (additionalOptions = []) =>
	Boolean(additionalOptions.find(option => option.id === 'INCLUDE_SAMPLES' && option.value));

module.exports = {
	includeSamples,
};
