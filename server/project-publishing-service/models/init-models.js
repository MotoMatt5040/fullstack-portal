var DataTypes = require("sequelize").DataTypes;
var _tblAuthentication = require("./tblAuthentication");
var _tblUserProjects = require("./tblUserProjects");
var _tblCC3ProjectHeader = require("./tblCC3ProjectHeader");

function initModels(sequelize) {
  var tblAuthentication = _tblAuthentication(sequelize, DataTypes);
  var tblUserProjects = _tblUserProjects(sequelize, DataTypes);
  var tblCC3ProjectHeader = _tblCC3ProjectHeader(sequelize, DataTypes);

  // Associations
  tblAuthentication.belongsToMany(tblCC3ProjectHeader, {
    as: 'projectId_tblCC3ProjectHeaders',
    through: tblUserProjects,
    foreignKey: "UUID",
    otherKey: "projectId"
  });
  tblCC3ProjectHeader.belongsToMany(tblAuthentication, {
    as: 'UUID_tblAuthentications',
    through: tblUserProjects,
    foreignKey: "projectId",
    otherKey: "UUID"
  });
  tblUserProjects.belongsTo(tblAuthentication, { as: "UU", foreignKey: "UUID" });
  tblAuthentication.hasMany(tblUserProjects, { as: "tblUserProjects", foreignKey: "UUID" });
  tblUserProjects.belongsTo(tblCC3ProjectHeader, { as: "project", foreignKey: "projectId" });
  tblCC3ProjectHeader.hasMany(tblUserProjects, { as: "tblUserProjects", foreignKey: "projectId" });

  return {
    tblAuthentication,
    tblUserProjects,
    tblCC3ProjectHeader,
  };
}

module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
