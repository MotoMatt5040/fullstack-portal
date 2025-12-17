// Auth Service - tblRoles model
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
    }
  }, {
    tableName: 'tblRoles',
    schema: 'dbo',
    timestamps: false
  });
};
