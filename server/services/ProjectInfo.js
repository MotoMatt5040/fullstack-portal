const sql = require('mssql');
const withDbConnection = require('../config/dbConn');
const { voxco } = require('../utils/databaseTypes');

const getPhoneProjects = async (projectId) => {
	// SELECT k_Id, * FROM [VoxcoSystem].[dbo].[tblObjects] where tblobjects.Type = 1 and name LIKE '<projectid>%'
	// this usuall returns in this order [13028, 13028C, 13028COM] but it may be good to check
	/*
    for item in items:
      if item.length = 5:
        ll = item
      elif item.endswith('C'):
        cc = item
      elif item.endswith('COM'):
        com = item
  */

	return withDbConnection({
		database: voxco,
		queryFn: async (pool) => {
			const result = await pool
				.request()
				.input('projectId', sql.NVarChar, projectId)
				.query(
					"SELECT k_Id, name FROM [VoxcoSystem].[dbo].[tblObjects] where tblobjects.Type = 1 and name LIKE @projectId + '%'"
				);
			return result.recordset;
		},
		fnName: 'getPhoneProjects',
	});
};

const getWebProjects = async (projectId) => {
	// for ALL WEB (stype = 3-6)
	// SELECT id FROM [A4Survey_Client_1].[dbo].[Survey] WHERE Name LIKE '<projectid>%'
	// get the quotas then filter the stype from there

	return withDbConnection({
		database: voxco,
		queryFn: async (pool) => {
			const result = await pool
				.request()
				.input('projectId', sql.NVarChar, projectId)
				.query(
					"SELECT id, name FROM [A4Survey_Client_1].[dbo].[Survey] WHERE Name LIKE @projectId + '%'"
				);
			return result.recordset;
		},
		fnName: 'getWebProjects',
	});
};

module.exports = {
	getPhoneProjects,
	getWebProjects,
};
