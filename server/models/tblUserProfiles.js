const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tblUserProfiles', {
    UUID: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'tblAuthentication',
        key: 'Uuid'
      }
    },
    ClientID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tblClients',
        key: 'ClientID'
      }
    }
  }, {
    sequelize,
    tableName: 'tblUserProfiles',
    schema: 'dbo',
    timestamps: false,
    indexes: [
      {
        name: "idx_userprofiles_clientid",
        fields: [
          { name: "ClientID" },
        ]
      },
      {
        name: "PK__tblUserP__65A475E7693E753A",
        unique: true,
        fields: [
          { name: "UUID" },
        ]
      },
    ]
  });
};
