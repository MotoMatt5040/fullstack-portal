// Auth Service - tblUserRoles.js

const Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tblUserRoles', {
    uuid: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'tblAuthentication',
        key: 'Uuid'
      }
    },
    role: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      primaryKey: true
    }
  }, {
    sequelize,
    tableName: 'tblUserRoles',
    schema: 'dbo',
    timestamps: false,
    indexes: [
      {
        name: "PK__tblUserR__F721AB24B44026BD",
        unique: true,
        fields: [
          { name: "uuid" },
          { name: "role" },
        ]
      },
    ]
  });
};
