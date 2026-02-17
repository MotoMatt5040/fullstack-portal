var DataTypes = require("sequelize").DataTypes;
var _Authentication = require("./tblAuthentication");
var _tblUserProjects = require("./tblUserProjects");
var _tblCC3ProjectHeader = require("./tblCC3ProjectHeader");

function initModels(sequelize) {
  var Authentication = _Authentication(sequelize, DataTypes);
  var tblUserProjects = _tblUserProjects(sequelize, DataTypes);
  var tblCC3ProjectHeader = _tblCC3ProjectHeader(sequelize, DataTypes);

  // Associations
  Authentication.belongsToMany(tblCC3ProjectHeader, {
    as: 'projectId_tblCC3ProjectHeaders',
    through: tblUserProjects,
    foreignKey: "UUID",
    otherKey: "projectId"
  });
  tblCC3ProjectHeader.belongsToMany(Authentication, {
    as: 'UUID_Authentications',
    through: tblUserProjects,
    foreignKey: "projectId",
    otherKey: "UUID"
  });
  tblUserProjects.belongsTo(Authentication, { as: "UU", foreignKey: "UUID" });
  Authentication.hasMany(tblUserProjects, { as: "tblUserProjects", foreignKey: "UUID" });
  tblUserProjects.belongsTo(tblCC3ProjectHeader, { as: "project", foreignKey: "projectId" });
  tblCC3ProjectHeader.hasMany(tblUserProjects, { as: "tblUserProjects", foreignKey: "projectId" });

  return {
    Authentication,
    tblUserProjects,
    tblCC3ProjectHeader,
  };
}

module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
