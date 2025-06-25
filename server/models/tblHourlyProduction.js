const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tblHourlyProduction', {
    projectid: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    lastupdate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    CPH: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    CMS: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    AL: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    MPH: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    HRS: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    RecLoc: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    recid: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    ProjName: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    FileType: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'tblHourlyProduction',
    schema: 'dbo',
    timestamps: false,
    indexes: [
      {
        name: "PK_tblHourlyProduction",
        unique: true,
        fields: [
          { name: "recid" },
        ]
      },
    ]
  });
};
