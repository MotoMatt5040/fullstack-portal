const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tblAspenProdII', {
    recid: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    empid: {
      type: DataTypes.STRING(5),
      allowNull: true
    },
    ProjectID: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    recdate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ProdIndex: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    talktime: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    pausetime: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    waittime: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    connecttime: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    },
    voxcoid: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    WrapUpTime: {
      type: DataTypes.DECIMAL(18,2),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'tblAspenProdII',
    schema: 'dbo',
    timestamps: false
  });
};
