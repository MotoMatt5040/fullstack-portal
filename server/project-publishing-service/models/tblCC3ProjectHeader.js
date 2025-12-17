const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tblCC3ProjectHeader', {
    recid: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ProjectID: {
      type: DataTypes.STRING(50),
      allowNull: false,
      primaryKey: true
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
      type: DataTypes.STRING(50),
      allowNull: true
    },
    FieldStart: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    FieldEnd: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    NSize: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    Active: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    Timeforce: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    ClientApproval: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    SampleWait: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    ReadyDial: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    PCMAdded: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    ImportDetailsAdded: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    EstReadyTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ProjectType: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    CopiedFrom: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    CellNSize: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    Invoiced: {
      type: DataTypes.BOOLEAN,
      allowNull: true
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
        name: "PK_tblCC3ProjectHeader",
        unique: true,
        fields: [
          { name: "ProjectID" },
        ]
      },
    ]
  });
};
