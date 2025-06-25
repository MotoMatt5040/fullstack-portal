const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tblBlueBookProjMaster', {
    ProjectID: {
      type: DataTypes.STRING(25),
      allowNull: false,
      primaryKey: true
    },
    ProjName: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    N: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Closed: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    SF: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    CUM: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    ToGo: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    RecDate: {
      type: DataTypes.DATE,
      allowNull: false,
      primaryKey: true
    },
    Min: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1
    },
    Target: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1
    },
    Max: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1
    },
    GPCPH: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    AvgLen: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    THours: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    AvgCPH: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    AvgMPH: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    DailyCMS: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    LJSStyle: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    CC3Number: {
      type: DataTypes.STRING(25),
      allowNull: true
    },
    QUXLoc: {
      type: DataTypes.STRING(600),
      allowNull: true
    },
    CC3DB: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    ProjectType: {
      type: DataTypes.CHAR(1),
      allowNull: true
    },
    VoxcoDBID: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    Briefing: {
      type: DataTypes.REAL,
      allowNull: true,
      defaultValue: 0
    },
    OEList: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    OEQty: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    CP: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    BaseCell: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Web: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    CATI_Module: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    Client: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    RootProjID: {
      type: DataTypes.STRING(4),
      allowNull: true
    },
    Hispanic: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    ExternalOnly: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'tblBlueBookProjMaster',
    schema: 'dbo',
    timestamps: false,
    indexes: [
      {
        name: "PK_tblBlueBookProjMaster_1",
        unique: true,
        fields: [
          { name: "ProjectID" },
          { name: "RecDate" },
        ]
      },
    ]
  });
};
