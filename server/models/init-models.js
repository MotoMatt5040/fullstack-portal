var DataTypes = require("sequelize").DataTypes;
var _tblAspenProdII = require("./tblAspenProdII");
var _tblAuthentication = require("./tblAuthentication");
var _tblAvgLengthShift = require("./tblAvgLengthShift");
var _tblBlueBookProjMaster = require("./tblBlueBookProjMaster");
var _tblCC3EmployeeList = require("./tblCC3EmployeeList");
var _tblCC3ProjectHeader = require("./tblCC3ProjectHeader");
var _tblClients = require("./tblClients");
var _tblDefaultPrompts = require("./tblDefaultPrompts"); // Added this line
var _tblDispo = require("./tblDispo");
var _tblEmployees = require("./tblEmployees");
var _tblGPCPHDaily = require("./tblGPCPHDaily");
var _tblHourlyProduction = require("./tblHourlyProduction");
var _tblHourlyProductionDetail = require("./tblHourlyProductionDetail");
var _tblIntCodes = require("./tblIntCodes");
var _tblLocation = require("./tblLocation");
var _tblProduction = require("./tblProduction");
var _tblRoles = require("./tblRoles");
var _tblUserProfiles = require("./tblUserProfiles");
var _tblUserProjects = require("./tblUserProjects");
var _tblUserRoles = require("./tblUserRoles");

function initModels(sequelize) {
  var tblAspenProdII = _tblAspenProdII(sequelize, DataTypes);
  var tblAuthentication = _tblAuthentication(sequelize, DataTypes);
  var tblAvgLengthShift = _tblAvgLengthShift(sequelize, DataTypes);
  var tblBlueBookProjMaster = _tblBlueBookProjMaster(sequelize, DataTypes);
  var tblCC3EmployeeList = _tblCC3EmployeeList(sequelize, DataTypes);
  var tblCC3ProjectHeader = _tblCC3ProjectHeader(sequelize, DataTypes);
  var tblClients = _tblClients(sequelize, DataTypes);
  var tblDefaultPrompts = _tblDefaultPrompts(sequelize, DataTypes); // Added this line
  var tblDispo = _tblDispo(sequelize, DataTypes);
  var tblEmployees = _tblEmployees(sequelize, DataTypes);
  var tblGPCPHDaily = _tblGPCPHDaily(sequelize, DataTypes);
  var tblHourlyProduction = _tblHourlyProduction(sequelize, DataTypes);
  var tblHourlyProductionDetail = _tblHourlyProductionDetail(sequelize, DataTypes);
  var tblIntCodes = _tblIntCodes(sequelize, DataTypes);
  var tblLocation = _tblLocation(sequelize, DataTypes);
  var tblProduction = _tblProduction(sequelize, DataTypes);
  var tblRoles = _tblRoles(sequelize, DataTypes);
  var tblUserProfiles = _tblUserProfiles(sequelize, DataTypes);
  var tblUserProjects = _tblUserProjects(sequelize, DataTypes);
  var tblUserRoles = _tblUserRoles(sequelize, DataTypes);

  // Associations
  tblAuthentication.belongsToMany(tblCC3ProjectHeader, { as: 'projectId_tblCC3ProjectHeaders', through: tblUserProjects, foreignKey: "UUID", otherKey: "projectId" });
  tblCC3ProjectHeader.belongsToMany(tblAuthentication, { as: 'UUID_tblAuthentications', through: tblUserProjects, foreignKey: "projectId", otherKey: "UUID" });
  tblUserProfiles.belongsTo(tblAuthentication, { as: "UU", foreignKey: "UUID"});
  tblAuthentication.hasOne(tblUserProfiles, { as: "tblUserProfile", foreignKey: "UUID"});
  tblUserProjects.belongsTo(tblAuthentication, { as: "UU", foreignKey: "UUID"});
  tblAuthentication.hasMany(tblUserProjects, { as: "tblUserProjects", foreignKey: "UUID"});
  tblUserRoles.belongsTo(tblAuthentication, { as: "uu", foreignKey: "uuid"});
  tblAuthentication.hasMany(tblUserRoles, { as: "tblUserRoles", foreignKey: "uuid"});
  tblUserProjects.belongsTo(tblCC3ProjectHeader, { as: "project", foreignKey: "projectId"});
  tblCC3ProjectHeader.hasMany(tblUserProjects, { as: "tblUserProjects", foreignKey: "projectId"});
  tblUserProfiles.belongsTo(tblClients, { as: "Client", foreignKey: "ClientID"});
  tblClients.hasMany(tblUserProfiles, { as: "tblUserProfiles", foreignKey: "ClientID"});

  // Added associations for tblDefaultPrompts
  tblDefaultPrompts.belongsTo(tblAuthentication, { as: "createdBy_tblAuthentication", foreignKey: "createdBy"});
  tblAuthentication.hasMany(tblDefaultPrompts, { as: "tblDefaultPrompts", foreignKey: "createdBy"});


  return {
    tblAspenProdII,
    tblAuthentication,
    tblAvgLengthShift,
    tblBlueBookProjMaster,
    tblCC3EmployeeList,
    tblCC3ProjectHeader,
    tblClients,
    tblDefaultPrompts, // Added this line
    tblDispo,
    tblEmployees,
    tblGPCPHDaily,
    tblHourlyProduction,
    tblHourlyProductionDetail,
    tblIntCodes,
    tblLocation,
    tblProduction,
    tblRoles,
    tblUserProfiles,
    tblUserProjects,
    tblUserRoles,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
