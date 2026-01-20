const DataTypes = require('sequelize').DataTypes;
const _tblAuthentication = require('./tblAuthentication');
const _tblDefaultPrompt = require('./tblDefaultPrompt');
const _tblProjectPrompts = require('./tblProjectPrompts');

function initModels(sequelize) {
  const tblAuthentication = _tblAuthentication(sequelize, DataTypes);
  const tblDefaultPrompt = _tblDefaultPrompt(sequelize, DataTypes);
  const tblProjectPrompts = _tblProjectPrompts(sequelize, DataTypes);

  // Define associations
  tblDefaultPrompt.belongsTo(tblAuthentication, {
    as: 'creator',
    foreignKey: 'createdBy',
    targetKey: 'Uuid'
  });

  tblProjectPrompts.belongsTo(tblAuthentication, {
    as: 'creator',
    foreignKey: 'createdBy',
    targetKey: 'Uuid'
  });

  return {
    tblAuthentication,
    tblDefaultPrompt,
    tblProjectPrompts,
  };
}

module.exports = initModels;
