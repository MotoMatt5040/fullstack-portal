const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tblHourlyProductionDetail', {
    recid: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    projectid: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    voxcoid: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    CMS: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    CPH: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    MPH: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    RecLoc: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    HRS: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    ConnectTime: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    PauseTime: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    AvgCPH: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    CPHVar: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    WVar: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    WaitTime: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    TalkTime: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    WrapUpTime: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'tblHourlyProductionDetail',
    schema: 'dbo',
    timestamps: false,
    indexes: [
      {
        name: "PK_tblHourlyProductionDetail",
        unique: true,
        fields: [
          { name: "recid" },
        ]
      },
    ]
  });
};
