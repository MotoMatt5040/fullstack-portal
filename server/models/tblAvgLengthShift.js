const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tblAvgLengthShift', {
    recid: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    VoxcoID: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    Duration: {
      type: DataTypes.REAL,
      allowNull: true
    },
    ProjectiD: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    recloc: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'tblAvgLengthShift',
    schema: 'dbo',
    timestamps: false,
    indexes: [
      {
        name: "PK_tblAvgLengthShift",
        unique: true,
        fields: [
          { name: "recid" },
        ]
      },
    ]
  });
};
