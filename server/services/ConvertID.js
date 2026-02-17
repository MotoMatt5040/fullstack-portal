const sql = require('mssql');

import { caligulad, voxco} from '../utils/databaseTypes';
import withDbConnection from '../config/dbConn';

const getVoxcoId = async (promarkId) => {
  
  return withDbConnection({
    database: voxco,
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('promarkId', sql.Int, promarkId)
        // add "Voxco_Project_" in from of k_Id for table name
        // parentId is what we see in voxco, Voxco_Project_<k_Id> is the database name for that project
        // please use type = 2, dont change it to 1
        .query('SELECT k_Id, parentId FROM tblObjects WHERE type = 2 AND name = @promarkId'); 
      return result.recordset[0]?.voxcoId || null;
    },
    fnName: 'getVoxcoId',
  });
}

module.exports = {
  getVoxcoId,
};