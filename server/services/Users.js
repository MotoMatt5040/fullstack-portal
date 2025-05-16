const sql = require('mssql');
const withDbConnection = require('../config/dbConn');
const { promark } = require('../utils/databaseTypes');

const createUser = async (email, hashedPwd) => {
	return withDbConnection({
		database: promark,
		queryFn: async (pool) => {
			const result = await pool
				.request()
				.input('email', sql.NVarChar, email)
				.input('password', sql.NVarChar, hashedPwd)
				.input('dateCreated', sql.DateTime, new Date())
				.input('dateUpdated', sql.DateTime, new Date())
				.query(
					'INSERT INTO tblAuthentication (email, password, dateCreated, dateUpdated) VALUES (@email, @password, @dateCreated, @dateUpdated)'
				);
			return result;
		},
		fnName: 'createUser',
		allowAbort: false,
		allowRetry: false,
	});
};

const getClients = async () => {
	return withDbConnection({
		database: promark,
		queryFn: async (pool) => {
			const result = await pool.request().query('SELECT clientId, clientName FROM tblClients');
			return result.recordset;
		},
		fnName: 'getClients',
	});
};

// const getPartners = async (clientId) => {
//   return withDbConnection({
//     database: promark,
//     queryFn: async (pool) => {
//       const result = await pool
//         .request()
//         .input('clientId', sql.Int, clientId)
//         .query('SELECT a.email, partnerid FROM tblPartners p JOIN tblAuthentication a ON p.partnerId = a.uuid WHERE p.clientId = @clientId;');
//       return result.recordset;
//     },
//     fnName: 'getPartners',
//   });
// }

const addUserRoles = async (uuid, roles) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      for (const role of roles) {
        await pool.request()
          .input('uuid', sql.UniqueIdentifier, uuid)
          .input('role', sql.SmallInt, role)
          .query('INSERT INTO tblUserRoles (uuid, role) VALUES (@uuid, @role)');
      }
    }
  })
}

// const addPartner = async (partnerId, clientId) => {
//   return withDbConnection({
//     database: promark,
//     queryFn: async (pool) => {
//       await pool.request()
//         .input('partnerId', sql.UniqueIdentifier, partnerId)
//         .input('clientId', sql.Int, clientId)
//         .query('INSERT INTO tblPartners (partnerId, clientId) VALUES (@partnerId, @clientId)');
//     }
//   })
// }

// const addPartnerDirector = async (partnerId, directorId) => {
//   return withDbConnection({
//     database: promark,
//     queryFn: async (pool) => {
//       await pool.request()
//         .input('partnerId', sql.UniqueIdentifier, partnerId)
//         .input('directorId', sql.UniqueIdentifier, directorId)
//         .query('INSERT INTO tblPartnerDirectors (partnerId, directorId) VALUES (@partnerId, @directorId)');
//     }
//   })
// }

const getUser = async (email) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      const result = await pool
        .request()
        .input('email', sql.NVarChar, email)
        .query('SELECT uuid, email FROM tblAuthentication WHERE email = @email');
      return result.recordset[0];
    },
    fnName: 'getUser',
  });
}

const addUserProfile = async (uuid, clientId) => {
  return withDbConnection({
    database: promark,
    queryFn: async (pool) => {
      await pool.request()
        .input('uuid', sql.UniqueIdentifier, uuid)
        .input('clientId', sql.Int, clientId)
        .query('INSERT INTO tblUserProfiles (uuid, clientId) VALUES (@uuid, @clientId)');
    }
  })
}

module.exports = {
  createUser,
  getClients,
  // getPartners,
  addUserRoles,
  addUserProfile,
  // addPartner,
  // addPartnerDirector,
  getUser
}
