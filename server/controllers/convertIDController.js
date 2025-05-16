const ConvertId = require('../services/ConvertID');
const handleAsync = require('./asyncController');

const handleConvertId = handleAsync(async (req, res) => {
	const { promarkId } = req.body;
	if (!promarkId) {
		return res.status(400).json({ message: 'Promark ID is required' });
	}

	const voxcoId = await ConvertId.getVoxcoId(promarkId);
	if (!voxcoId) {
		return res.status(404).json({ message: 'Voxco ID not found' });
	}

	res.status(200).json({ voxcoId });
});
