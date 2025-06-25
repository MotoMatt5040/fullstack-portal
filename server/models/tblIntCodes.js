const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tblIntCodes', {
    projectid: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    voxcoid: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    codeqty: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    recid: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    }
  }, {
    sequelize,
    tableName: 'tblIntCodes',
    schema: 'dbo',
    timestamps: false,
    indexes: [
      {
        name: "PK_tblIntCodes",
        unique: true,
        fields: [
          { name: "recid" },
        ]
      },
    ]
  });
};
