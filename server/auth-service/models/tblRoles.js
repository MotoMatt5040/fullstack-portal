// Auth Service - Roles model (FAJITA database)
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
    }
  }, {
    tableName: 'Roles',
    schema: 'dbo',
    timestamps: false
  });
};
