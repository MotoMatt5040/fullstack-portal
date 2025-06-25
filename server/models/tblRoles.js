const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tblRoles', {
    RoleID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    RoleName: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    Description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'tblRoles',
    schema: 'dbo',
    timestamps: false,
    indexes: [
      {
        name: "PK_tblRoles",
        unique: true,
        fields: [
          { name: "RoleID" },
        ]
      },
    ]
  });
};
