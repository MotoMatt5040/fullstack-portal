const sql = require('mssql');
const withDbConnection = require('../config/dbConn');
const { promark } = require('../utils/databaseTypes');

const auditLogger = async (req, res, next) => {
	if (!['PUT', 'POST', 'DELETE'].includes(req.method)) return next();

	res.on('finish', async () => {
		// Skip audit for certain routes that don't need auditing
		const skipAuditPaths = ['/reset/', '/auth/login', '/auth/logout', '/refresh'];
		if (skipAuditPaths.some(path => req.path.startsWith(path))) {
			console.log(`Skipping audit for path: ${req.path}`);
			return;
		}

		const { userid, tableModified, columnModified, modifiedFrom, modifiedTo } =
			req.auditData || {};

		// Skip audit if no audit data is set or if response failed
		if (res.statusCode >= 400 || !req.auditData) {
			console.log(`Skipping audit - statusCode: ${res.statusCode}, hasAuditData: ${!!req.auditData}`);
			return;
		}

		try {
			await withDbConnection({
				database: promark,
				queryFn: async (pool) => {
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
				attempts: 5,
				fnName: 'auditLogger',
				allowAbort: true,
				allowRetry: true,
			});
		} catch (err) {
			console.error('❌ Audit log failed:', err);
		}
	});

	next();
};

module.exports = auditLogger;