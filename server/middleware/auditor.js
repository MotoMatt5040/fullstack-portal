const sql = require('mssql');
const withDbConnection = require('../config/dbConnPromark');

const auditLogger = async (req, res, next) => {
	if (!['PUT', 'POST', 'DELETE'].includes(req.method)) return next();

	res.on('finish', async () => {
		const { userid, tableModified, columnModified, modifiedFrom, modifiedTo } = req.auditData || {};

		if (res.statusCode >= 400) return;

		try {
			await withDbConnection(
				async (pool) => {
					const request = pool.request();
					request.input('userid', sql.VarChar(50), userid);
					request.input('tablemodified', sql.VarChar(50), tableModified);
					request.input('columnmodified', sql.VarChar(50), columnModified);
					request.input('modifiedfrom', sql.VarChar(50), String(modifiedFrom));
					request.input('modifiedto', sql.VarChar(50), String(modifiedTo));
					request.input('datemodified', sql.DateTime, new Date());

					await request.query(`
						INSERT INTO tblAudit (userid, tablemodified, columnmodified, modifiedfrom, modifiedto, datemodified)
						VALUES (@userid, @tablemodified, @columnmodified, @modifiedfrom, @modifiedto, @datemodified)
					`);
				},
				5,
				'auditLogger',
				true,
				true
			);
		} catch (err) {
			console.error('Audit log failed:', err);
		}
	});

	next();
};

module.exports = auditLogger;
