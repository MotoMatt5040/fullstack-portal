const ExtractionTaskServices = require('../services/ExtractionTaskServices');
const XLSX = require('xlsx');

/**
 * Async handler wrapper
 */
const handleAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Parses the uploaded Excel file to extract the project ID and relevant rows for extraction task.
 * @param {Object} file - The uploaded file object
 * @returns {Object} - Parsed data including projectId and extracted rows
 */
const parseFile = (file) => {
  const workbook = XLSX.read(file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // header: 'A' gives you objects keyed by column letter
  // { A: ..., B: ..., C: ..., E: ... }
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 'A' });
  // Project ID is in the 3rd row, column A
  const projectId = rows[2]['A'];
  const result = [];

  // For each row, if column C is 'Y',
  // extract alias from column B and position from column E
  for (const row of rows) {
    if (row['C'] === 'Y') {
      result.push({
        alias: row['B'],
        number: row['E'],
      });
    }
  }

  return { projectId, data: result };
};

/**
 * Handles the creation of an extraction task in VOXCO.
 */
const handleCreateExtractionTask = handleAsync(async (req, res) => {
  const file = req.file;

  // Likely blocked already on frontend, but double check here
  if (!file) {
    return res.status(400).json({ error: 'File is required' });
  }

  const parsedData = parseFile(file);
  const voxcoID = await ExtractionTaskServices.getVoxcoID(parsedData.projectId);

  if (!voxcoID) {
    return res.status(404).json({ error: 'Project not found in VOXCO' });
  }

  const result = await ExtractionTaskServices.handleCreateExtractionTask(
    parsedData.data,
    voxcoID,
  );
  res
    .status(200)
    .json({ message: 'File processed successfully.', data: result });
});
