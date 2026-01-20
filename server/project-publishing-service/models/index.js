const { Sequelize } = require('sequelize');
const initModels = require('./init-models');

const sequelize = new Sequelize(
  process.env.PROMARK_DB_NAME || 'CaligulaD',
  process.env.PROMARK_DB_USER,
  process.env.PROMARK_DB_PASSWORD,
  {
    host: process.env.PROMARK_DB_SERVER,
    port: parseInt(process.env.PROMARK_DB_PORT) || 1433,
    dialect: 'mssql',
    logging: false
  }
);

const models = initModels(sequelize);

module.exports = {
  sequelize,
  ...models
};
