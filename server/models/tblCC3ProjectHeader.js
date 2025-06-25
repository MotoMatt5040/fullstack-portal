const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tblCC3ProjectHeader', {
    recid: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    ProjectID: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: "UQ_tblCC3ProjectHeader_projectid"
    },
    ProjectName: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    Client: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    Programmer: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    Tester: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    Contact: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    ContactPhone: {
      type: DataTypes.CHAR(10),
      allowNull: true
    },
    FieldStart: {
      type: DataTypes.DATE,
      allowNull: true
    },
    FieldEnd: {
      type: DataTypes.DATE,
      allowNull: true
    },
    NSize: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Active: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1
    },
    Timeforce: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    ClientApproval: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    SampleWait: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    ReadyDial: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    PCMAdded: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    ImportDetailsAdded: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    EstReadyTime: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    ProjectType: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    CopiedFrom: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    CellNSize: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Invoiced: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    VoxcoID: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'tblCC3ProjectHeader',
    schema: 'dbo',
    timestamps: false,
    indexes: [
      {
        name: "PK_tblCC3ProjectHeaderII",
        unique: true,
        fields: [
          { name: "recid" },
        ]
      },
      {
        name: "UQ_tblCC3ProjectHeader_projectid",
        unique: true,
        fields: [
          { name: "ProjectID" },
        ]
      },
    ]
  });
};
