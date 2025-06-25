const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tblProduction', {
    recid: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    ProjectID: {
      type: DataTypes.STRING(35),
      allowNull: true
    },
    RecLoc: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    RecDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    RefName: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    EID: {
      type: DataTypes.STRING(5),
      allowNull: true
    },
    HRS: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    CMS: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    CPH: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true,
      defaultValue: 0.00
    },
    MPH: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true,
      defaultValue: 0.00
    },
    FinalRecord: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    VoxcoID: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    Booth: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    AvgCPH: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    GPCPH: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    PCPH: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    ProjAL: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    CPHVar: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    ProjectRank: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    ZScore: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    WZS: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    MyMPH: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    DPC: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    DPCZScore: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    TotalDials: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    SR12: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    HR05: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    RT06: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    DNC16: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    DPH: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    Exclude: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    CallDuration: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    ProjectQuartile: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    IntAL: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    DaysWorked: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'tblProduction',
    schema: 'dbo',
    timestamps: false,
    indexes: [
      {
        name: "PK_tblProduction",
        unique: true,
        fields: [
          { name: "recid" },
        ]
      },
    ]
  });
};
