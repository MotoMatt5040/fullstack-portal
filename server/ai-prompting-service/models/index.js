const { Sequelize } = require('sequelize');
const initModels = require('./init-models');

const sequelize = new Sequelize(
  process.env.DB_CALIGULA || 'CaligulaD',
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 1433,
    dialect: 'mssql',
    logging: false,
    dialectOptions: {
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

const models = initModels(sequelize);

module.exports = {
  sequelize,
  ...models,
};
