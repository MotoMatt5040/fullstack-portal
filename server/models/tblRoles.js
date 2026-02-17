const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Roles', {
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
    tableName: 'Roles',
    schema: 'FAJITA.dbo',
    timestamps: false,
    indexes: [
      {
        name: "PK_Roles",
        unique: true,
        fields: [
          { name: "RoleID" },
        ]
      },
    ]
  });
};
