const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tblEmployees', {
    EmpID: {
      type: DataTypes.STRING(10),
      allowNull: false,
      primaryKey: true
    },
    LName: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    FName: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    Phone1: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    Phone2: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    EmpType: {
      type: DataTypes.TINYINT,
      allowNull: true
    },
    HireDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    Status: {
      type: DataTypes.TINYINT,
      allowNull: true
    },
    Supervisor: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    Monitor: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    Typist: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    MediaConsent: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    Spanish: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    Daytime: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    MonMan: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    TueMan: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    WedMan: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    ThuMan: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    FriMan: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    SatMan: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    SunMan: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    LJS: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    Interviewer: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    },
    CallCenter: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    AltCallCenter: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    CCHoldDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    TermDate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: "1900-01-01 00:00"
    },
    TrainSession: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Coder: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    Role: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Processed: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    LeaveStart: {
      type: DataTypes.DATE,
      allowNull: true
    },
    LeaveReturn: {
      type: DataTypes.DATE,
      allowNull: true
    },
    LocalProcessed: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    Tenure: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    CumProdIndex: {
      type: DataTypes.DECIMAL(18,3),
      allowNull: true
    },
    MTDRankCenter: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    PMTDRankCenter: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    CumProdINdexPM: {
      type: DataTypes.DECIMAL(18,3),
      allowNull: true
    },
    MTDRankCompany: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    PMTDRankCompany: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    voxcoid: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    AreaCode: {
      type: DataTypes.STRING(3),
      allowNull: true
    },
    EMWebAdmin: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    EmWebSuperAdmin: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    IMSExempt: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1
    },
    IMSExemptDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    TrainGroup: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    TurnsinSchedule: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1
    },
    CellProvider: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    CellProvider2: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Email: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    ShiftSMSOptIn: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    ShiftSMSOptIn2: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    EmailOptIn: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    SSNTemp: {
      type: DataTypes.CHAR(9),
      allowNull: true
    },
    Team: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'tblEmployees',
    schema: 'dbo',
    timestamps: false,
    indexes: [
      {
        name: "PK_tblEmployees1",
        unique: true,
        fields: [
          { name: "EmpID" },
        ]
      },
    ]
  });
};
