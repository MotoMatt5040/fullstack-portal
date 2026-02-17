const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tblProjectPrompts', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    projectId: {
      type: DataTypes.STRING(15),
      allowNull: false
    },
    questionNumber: {
      type: DataTypes.STRING(25),
      allowNull: false
    },
    questionSummary: {
      type: DataTypes.TEXT,
      allowNull: false
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
    tableName: 'tblProjectPrompts',
    schema: 'dbo',
    timestamps: false,
    indexes: [
      {
        name: "PK__tblProje__3213E83F7C2A564B",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
