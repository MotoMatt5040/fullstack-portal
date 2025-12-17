// Auth Service - init-models.js

var DataTypes = require("sequelize").DataTypes;
var _tblAuthentication = require("./tblAuthentication");
var _tblUserRoles = require("./tblUserRoles");

function initModels(sequelize) {
  var tblAuthentication = _tblAuthentication(sequelize, DataTypes);
  var tblUserRoles = _tblUserRoles(sequelize, DataTypes);

  // Associations
  tblUserRoles.belongsTo(tblAuthentication, { as: "uu", foreignKey: "uuid" });
  tblAuthentication.hasMany(tblUserRoles, { as: "tblUserRoles", foreignKey: "uuid" });

  return {
    tblAuthentication,
    tblUserRoles,
  };
}

module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
