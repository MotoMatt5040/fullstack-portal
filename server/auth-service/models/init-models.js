// Auth Service - init-models.js

var DataTypes = require("sequelize").DataTypes;
var _tblAuthentication = require("./tblAuthentication");
var _tblUserRoles = require("./tblUserRoles");
var _tblRoles = require("./tblRoles");

function initModels(sequelize) {
  var tblAuthentication = _tblAuthentication(sequelize, DataTypes);
  var tblUserRoles = _tblUserRoles(sequelize, DataTypes);
  var tblRoles = _tblRoles(sequelize, DataTypes);

  // Associations
  tblUserRoles.belongsTo(tblAuthentication, { as: "uu", foreignKey: "uuid" });
  tblAuthentication.hasMany(tblUserRoles, { as: "tblUserRoles", foreignKey: "uuid" });

  return {
    tblAuthentication,
    tblUserRoles,
    tblRoles,
  };
}

module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
