const cleanQueryParam = (value) => {
	if (value === 'undefined' || value === 'null' || value === '')
		return undefined;
	return value;
};

module.exports = { cleanQueryParam }