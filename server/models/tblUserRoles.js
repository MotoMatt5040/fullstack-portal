const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('UserRoles', {
    uuid: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'Authentication',
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
    tableName: 'UserRoles',
    schema: 'FAJITA.dbo',
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
