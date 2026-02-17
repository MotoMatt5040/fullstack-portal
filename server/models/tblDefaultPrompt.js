const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tblProjectPrompts', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    tone: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    prompt: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    dateCreated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('getdate')
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Authentication',
        key: 'Uuid'
      }
    }
  }, {
    sequelize,
    tableName: 'tblDefaultPrompt',
    schema: 'dbo',
    timestamps: false,
    indexes: [
      {
        name: "PK__tblDefau__3213E83F071B0C32",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
