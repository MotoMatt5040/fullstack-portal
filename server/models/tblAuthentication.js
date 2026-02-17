const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Authentication', {
    Uuid: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true
    },
    Email: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: "UQ_Authentication_email"
    },
    Password: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    AccessToken: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    RefreshToken: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    DeviceId: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    ResetPasswordToken: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ResetPasswordExpires: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    DateCreated: {
      type: DataTypes.DATE,
      allowNull: true
    },
    DateUpdated: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resetToken: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    resetTokenExpiry: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'Authentication',
    schema: 'FAJITA.dbo',
    timestamps: false,
    indexes: [
      {
        name: "PK_Authentication",
        unique: true,
        fields: [
          { name: "Uuid" },
        ]
      },
      {
        name: "UQ_Authentication_email",
        unique: true,
        fields: [
          { name: "Email" },
        ]
      },
    ]
  });
};
