const DataTypes = require('sequelize').DataTypes;
const _Authentication = require('./tblAuthentication');
const _tblDefaultPrompt = require('./tblDefaultPrompt');
const _tblProjectPrompts = require('./tblProjectPrompts');

function initModels(sequelize) {
  const Authentication = _Authentication(sequelize, DataTypes);
  const tblDefaultPrompt = _tblDefaultPrompt(sequelize, DataTypes);
  const tblProjectPrompts = _tblProjectPrompts(sequelize, DataTypes);

  // Define associations
  tblDefaultPrompt.belongsTo(Authentication, {
    as: 'creator',
    foreignKey: 'createdBy',
    targetKey: 'Uuid'
  });

  tblProjectPrompts.belongsTo(Authentication, {
    as: 'creator',
    foreignKey: 'createdBy',
    targetKey: 'Uuid'
  });

  return {
    Authentication,
    tblDefaultPrompt,
    tblProjectPrompts,
  };
}

module.exports = initModels;
