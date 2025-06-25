const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tblCC3EmployeeList', {
    VoxcoID: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    EID: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true
    },
    RefName: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    CallCenter: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Active: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    SI: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    Booth: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    Pronto: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    FirstName: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    LastName: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    MI: {
      type: DataTypes.CHAR(1),
      allowNull: true
    },
    PhoneNumber: {
      type: DataTypes.CHAR(10),
      allowNull: true
    },
    ActiveHireDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    LastTermDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    CC3Name: {
      type: DataTypes.STRING(200),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'tblCC3EmployeeList',
    schema: 'dbo',
    timestamps: false,
    indexes: [
      {
        name: "PK_tblCC3EmployeeListNew",
        unique: true,
        fields: [
          { name: "EID" },
        ]
      },
    ]
  });
};
