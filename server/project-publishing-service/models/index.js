const { Sequelize } = require('sequelize');
const initModels = require('./init-models');

const sequelize = new Sequelize(
  process.env.DB_CALIGULA || 'CaligulaD',
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: 1433,
    dialect: 'mssql',
    logging: false
  }
);

const models = initModels(sequelize);

module.exports = {
  sequelize,
  ...models
};
