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
				.query( // ParentId > 1000 is to filter out folders. To understand run SELECT k_Id, name, * FROM [VoxcoSystem].[dbo].[tblObjects] where tblobjects.Type = 1 and name LIKE '13100%'
					"SELECT k_Id, name FROM [VoxcoSystem].[dbo].[tblObjects] WHERE tblobjects.Type = 1 AND name LIKE @projectId + '%' and ParentId > 1000 ORDER BY name DESC"
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

	return withDbConnection({  //possibly have userprofile with how lfar back to show data
		database: voxco,
		queryFn: async (pool) => {
			const qry = "SELECT id, name FROM [A4Survey_Client_1].[dbo].[Survey] WHERE Name LIKE @projectId + '%' "
			const result = await pool
				.request()
				.input('projectId', sql.NVarChar, projectId)
				.query(
					 //and fieldstart is < 30 days
					 qry
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
