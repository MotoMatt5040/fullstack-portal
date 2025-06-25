const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tblDispo', {
    ProjID: {
      type: DataTypes.STRING(25),
      allowNull: false,
      primaryKey: true
    },
    DispoDate: {
      type: DataTypes.DATE,
      allowNull: false,
      primaryKey: true
    },
    UserID: {
      type: DataTypes.STRING(5),
      allowNull: true
    },
    ProjName: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    CMS: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    SampUsed: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Dials: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Mean: {
      type: DataTypes.REAL,
      allowNull: true
    },
    Median: {
      type: DataTypes.REAL,
      allowNull: true
    },
    DPC: {
      type: DataTypes.REAL,
      allowNull: true
    },
    SC: {
      type: DataTypes.REAL,
      allowNull: true
    },
    CORATE: {
      type: DataTypes.REAL,
      allowNull: true
    },
    RESRATE: {
      type: DataTypes.REAL,
      allowNull: true
    },
    INC: {
      type: DataTypes.REAL,
      allowNull: true
    },
    FileLoc: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    RootName: {
      type: DataTypes.CHAR(4),
      allowNull: true
    },
    SingleDay: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      primaryKey: true
    },
    Combined: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      primaryKey: true
    },
    FinalCombined: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      primaryKey: true
    }
  }, {
    sequelize,
    tableName: 'tblDispo',
    schema: 'dbo',
    timestamps: false,
    indexes: [
      {
        name: "PK_tblDispo2",
        unique: true,
        fields: [
          { name: "ProjID" },
          { name: "DispoDate" },
          { name: "SingleDay" },
          { name: "Combined" },
          { name: "FinalCombined" },
        ]
      },
    ]
  });
};
