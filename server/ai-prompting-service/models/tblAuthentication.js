const Sequelize = require('sequelize');

module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    'Authentication',
    {
      Uuid: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
      },
      Email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        field: 'Email',
      },
      Password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      RefreshToken: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      PasswordResetToken: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      PasswordResetExpires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'Authentication',
      schema: 'FAJITA.dbo',
      timestamps: false,
      indexes: [
        {
          name: 'PK__tblAuthe__65A4751A7D73E12F',
          unique: true,
          fields: [{ name: 'Uuid' }],
        },
      ],
    }
  );
};
