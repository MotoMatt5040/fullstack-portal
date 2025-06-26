const { Sequelize } = require('sequelize');
const initModels = require('./init-models');

const sequelize = new Sequelize('CaligulaD', process.env.PROMARK_DB_USER, process.env.PROMARK_DB_PASSWORD, {
    host: process.env.PROMARK_DB_SERVER,
    port: 1433,
    dialect: 'mssql',
    logging: false // Disable logging of every query
});

const models = initModels(sequelize);

module.exports = {
  sequelize,
  ...models
};