const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tblLocation', {
    LocationID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    LocationName: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    Address: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    City: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    State: {
      type: DataTypes.CHAR(2),
      allowNull: true
    },
    OfficePhone: {
      type: DataTypes.CHAR(10),
      allowNull: true
    },
    FaxNumber: {
      type: DataTypes.CHAR(10),
      allowNull: true
    },
    HotlineNumber: {
      type: DataTypes.CHAR(10),
      allowNull: true
    },
    Type: {
      type: DataTypes.CHAR(1),
      allowNull: true
    },
    Active: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    TimeZone: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Manager: {
      type: DataTypes.STRING(5),
      allowNull: true
    },
    AsstManager: {
      type: DataTypes.STRING(5),
      allowNull: true
    },
    HRAsst: {
      type: DataTypes.STRING(5),
      allowNull: true
    },
    LongName: {
      type: DataTypes.STRING(250),
      allowNull: true
    },
    SubnetID: {
      type: DataTypes.STRING(5),
      allowNull: true
    },
    AppMainLocName: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    IntPayRate: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    PRCLoc: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    DName: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    PCMAddress: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    MonitorIP: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    'CATIModule#': {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    MaxScheduled: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'tblLocation',
    schema: 'dbo',
    timestamps: false,
    indexes: [
      {
        name: "PK_tblLocation",
        unique: true,
        fields: [
          { name: "LocationID" },
        ]
      },
    ]
  });
};
