const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tblGPCPHDaily', {
    recid: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    recdate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    projectid: {
      type: DataTypes.STRING(25),
      allowNull: true
    },
    gpcph: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    adjcph: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    adjmph: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    targetmph: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    dateupdated: {
      type: DataTypes.DATE,
      allowNull: true
    },
    updatedby: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'tblGPCPHDaily',
    schema: 'dbo',
    timestamps: false
  });
};
