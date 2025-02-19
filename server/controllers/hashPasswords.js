const sql = require("mssql");
const bcrypt = require("bcrypt");

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true, // Use this if you're on Windows Azure
        trustServerCertificate: true // Change to true for local dev / self-signed certs
    }
};

async function hashPasswordsForAllRows() {
    let pool;
    try {
        // Connect to MSSQL
        pool = await sql.connect(config);

        // Retrieve all rows from tblAuthentication (email and password)
        let result = await pool.request().query("SELECT Email, Password FROM tblAuthentication");

        if (result.recordset.length > 0) {
            for (let row of result.recordset) {
                const password = row.Password;

                // Hash the existing password
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(password, saltRounds);

                // Update the password field with the hashed password
                await pool.request()
                    .input("email", sql.VarChar, row.Email)
                    .input("hashedPassword", sql.VarChar, hashedPassword)
                    .query(`
                        UPDATE tblAuthentication
                        SET Password = @hashedPassword
                        WHERE Email = @email
                    `);

                console.log(`Updated password for: ${row.Email}`);
            }
            console.log("All passwords updated successfully.");
        } else {
            console.log("No records found.");
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        if (pool) {
            pool.close();
        }
    }
}

module.exports = hashPasswordsForAllRows;