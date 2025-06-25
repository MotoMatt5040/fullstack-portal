const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tblClients', {
    ClientID: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    ClientName: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    TypingFormat: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    }
  }, {
    sequelize,
    tableName: 'tblClients',
    schema: 'dbo',
    timestamps: false,
    indexes: [
      {
        name: "PK_tblClients",
        unique: true,
        fields: [
          { name: "ClientID" },
        ]
      },
    ]
  });
};
