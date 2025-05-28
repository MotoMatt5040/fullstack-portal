const sql = require('mssql');
const withDbConnection = require('../config/dbConn');
const { promark, voxco } = require('../utils/databaseTypes');

const getUserByEmail = async (email) => {
	return withDbConnection({
		database: promark,
		queryFn: async (pool) => {
			const result = await pool
				.request()
				.input('email', sql.NVarChar, email)
				.query('SELECT * FROM tblAuthentication WHERE email = @email');
			return result.recordset[0];
		},
		fnName: 'getUserByEmail',
		allowAbort: false,
		allowRetry: true,
	});
};

const updateUserPassword = async (email, hashedPwd) => {
	return withDbConnection({
		database: promark,
		queryFn: async (pool) => {
			const result = await pool
				.request()
				.input('email', sql.NVarChar, email)
				.input('password', sql.NVarChar, hashedPwd)
				// .input('dateUpdated', sql.DateTime, new Date())
				.query(
					'UPDATE tblAuthentication SET password = @password, dateUpdated = GETDATE() WHERE email = @email'
				);
			return result;
		},
		fnName: 'updateUserPassword',
		allowAbort: false,
		allowRetry: false,
	});
};

const saveResetToken = async (email, token, expires) => {
	return withDbConnection({
		database: promark,
		queryFn: async (pool) => {
			await pool
				.request()
				.input('email', sql.NVarChar, email)
				.input('token', sql.UniqueIdentifier, token)
				.input('expires', sql.DateTime, expires)
				// .input('dateUpdated', sql.DateTime, new Date())
				.query(
					'UPDATE tblAuthentication SET resetPasswordToken = @token, resetPasswordExpires = @expires, dateUpdated = GETDATE() WHERE email = @email'
				);
		},
		fnName: 'saveResetToken',
		allowAbort: false,
		allowRetry: true,
	});
};

const getUserByResetToken = async (token) => {
	return withDbConnection({
		database: promark,
		queryFn: async (pool) => {
			const result = await pool
				.request()
				.input('token', sql.UniqueIdentifier, token)
				.query(
					'SELECT * FROM tblAuthentication WHERE resetPasswordToken = @token'
				);
			return result.recordset[0];
		},
		fnName: 'getUserByResetToken',
		allowAbort: false,
		allowRetry: false,
	});
};

const createInternalUser = async (email, hashedPwd) => {
	return withDbConnection({
		database: promark,
		queryFn: async (pool) => {
			const result = await pool
				.request()
				.input('email', sql.NVarChar, email)
				.input('password', sql.NVarChar, hashedPwd)
				// .input('dateCreated', sql.DateTime, new Date())
				// .input('dateUpdated', sql.DateTime, new Date())
				.query(
					'INSERT INTO tblAuthentication (email, password, dateCreated, dateUpdated) VALUES (@email, @password, GETDATE(), GETDATE())'
				);
			return result;
		},
		fnName: 'createUser',
		allowAbort: false,
		allowRetry: false,
	});
};

const getUserByRefreshToken = async (refreshToken) => {
	return withDbConnection({
		database: promark,
		queryFn: async (pool) => {
			const result = await pool
				.request()
				.input('refreshToken', sql.NVarChar, refreshToken)
				.query(
					'SELECT * FROM tblAuthentication WHERE refreshToken = @refreshToken'
				);
			return result.recordset[0];
		},
		fnName: 'getUserByRefreshToken',
	});
};

const clearRefreshToken = async (email) => {
	// let currentDate = new Date();
	return withDbConnection({
		database: promark,
		queryFn: async (pool) => {
			await pool
				.request()
				.input('email', sql.NVarChar, email)
				// .input('dateUpdated', sql.DateTime, currentDate)
				.query(
					'UPDATE tblAuthentication SET refreshToken = NULL, accessToken = NULL, dateUpdated = GETDATE() WHERE email = @email'
				);
		},
		fnName: 'clearRefreshToken',
	});
};

const updateUserRefreshToken = async (email, refreshToken, accessToken) => {
	// let currentDate = new Date();
	return withDbConnection({
		database: promark,
		queryFn: async (pool) => {
			await pool
				.request()
				.input('email', sql.NVarChar, email)
				.input('refreshToken', sql.NVarChar, refreshToken)
				.input('accessToken', sql.NVarChar, accessToken)
				// .input('dateUpdated', sql.DateTime, currentDate)
				.query(
					'UPDATE tblAuthentication SET refreshToken = @refreshToken, accessToken = @accessToken, dateUpdated = GETDATE() WHERE email = @email'
				);
		},
		fnName: 'updateUserRefreshToken',
	});
};

const getAllUsers = async () => {
	return withDbConnection({
		database: promark,
		queryFn: async (pool) => {
			const result = await pool
				.request()
				.query('SELECT Email FROM tblAuthentication');
			return result.recordset;
		},
		fnName: 'getAllUsers',
	});
};

// const addUserRoles = async (email, roles) => {
// 	return withDbConnection({
// 		database: promark,
// 		queryFn: async (pool) => {
// 			for (const role of roles) {
// 				await pool
// 					.request()
// 					.input('email', sql.NVarChar, email)
// 					.input('role', sql.Int, role).query(`
//                     MERGE INTO tblUserRoles AS target
//                     USING (SELECT uuid, email FROM tblAuthentication WHERE email = @email) AS source
//                     ON target.email = source.email AND target.Role = @role
//                     WHEN NOT MATCHED THEN 
//                         INSERT (Role, uuid) 
//                         VALUES (@role, source.uuid);
//                 `);
// 			}
// 		},
// 		fnName: 'addUserRoles',
// 	});
// };

// const removeUserRoles = async (email, roles) => {
// 	return withDbConnection({
// 		database: promark,
// 		queryFn: async (pool) => {
// 			for (const role of roles) {
// 				await pool
// 					.request()
// 					.input('email', sql.NVarChar, email)
// 					.input('role', sql.Int, role).query(`
//                     DELETE FROM tblUserRoles
//                     WHERE email = @email
//                     AND Role = @role;
//                 `);
// 			}
// 		},
// 		fnName: 'removeUserRoles',
// 	});
// };

module.exports = {
	getUserByEmail,
	updateUserPassword,
	saveResetToken,
	getUserByResetToken,
	createInternalUser,
	getUserByRefreshToken,
	clearRefreshToken,
	updateUserRefreshToken,
	getAllUsers,
	// addUserRoles,
	// removeUserRoles,
};
