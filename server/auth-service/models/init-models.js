// Auth Service - init-models.js

var DataTypes = require("sequelize").DataTypes;
var _Authentication = require("./tblAuthentication");
var _UserRoles = require("./tblUserRoles");
var _Roles = require("./tblRoles");

function initModels(sequelize) {
  var Authentication = _Authentication(sequelize, DataTypes);
  var UserRoles = _UserRoles(sequelize, DataTypes);
  var Roles = _Roles(sequelize, DataTypes);

  // Associations
  UserRoles.belongsTo(Authentication, { as: "uu", foreignKey: "uuid" });
  Authentication.hasMany(UserRoles, { as: "UserRoles", foreignKey: "uuid" });

  return {
    Authentication,
    UserRoles,
    Roles,
  };
}

module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
