const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tblUserProjects', {
    UUID: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'Authentication',
        key: 'Uuid'
      }
    },
    projectId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'tblCC3ProjectHeader',
        key: 'ProjectID'
      }
    },
    dateCreated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('getdate')
    },
    dateUpdated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('getdate')
    }
  }, {
    sequelize,
    tableName: 'tblUserProjects',
    schema: 'dbo',
    timestamps: false,
    indexes: [
      {
        name: "PK_UserProjects",
        unique: true,
        fields: [
          { name: "UUID" },
          { name: "projectId" },
        ]
      },
    ]
  });
};
