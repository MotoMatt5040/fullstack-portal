-- Variable Exclusions Migration
-- Creates tables for managing globally excluded variables and project-specific inclusions

-- Table 1: VariableExclusions
-- Stores variables that should be excluded from all file uploads by default
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'VariableExclusions' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE FAJITA.dbo.VariableExclusions (
        ExclusionID INT IDENTITY(1,1) PRIMARY KEY,
        VariableName NVARCHAR(255) NOT NULL,
        Description NVARCHAR(500) NULL,
        CreatedDate DATETIME DEFAULT GETDATE(),
        CreatedBy NVARCHAR(100) NULL,
        CONSTRAINT UQ_VariableExclusions_VariableName UNIQUE (VariableName)
    );

    PRINT 'Created VariableExclusions table';
END
ELSE
BEGIN
    PRINT 'VariableExclusions table already exists';
END
GO

-- Table 2: ProjectVariableInclusions
-- Tracks when excluded variables are included for a specific project and what they're renamed to
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProjectVariableInclusions' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE FAJITA.dbo.ProjectVariableInclusions (
        InclusionID INT IDENTITY(1,1) PRIMARY KEY,
        ProjectID INT NOT NULL,
        OriginalVariableName NVARCHAR(255) NOT NULL,
        MappedVariableName NVARCHAR(255) NOT NULL,
        CreatedDate DATETIME DEFAULT GETDATE(),
        CreatedBy NVARCHAR(100) NULL,
        CONSTRAINT UQ_ProjectVariableInclusions UNIQUE (ProjectID, OriginalVariableName)
    );

    -- Create index for faster lookups by ProjectID
    CREATE INDEX IX_ProjectVariableInclusions_ProjectID
    ON FAJITA.dbo.ProjectVariableInclusions (ProjectID);

    PRINT 'Created ProjectVariableInclusions table';
END
ELSE
BEGIN
    PRINT 'ProjectVariableInclusions table already exists';
END
GO

-- Insert default exclusions (only if not already present)
-- These are common variables that are typically not needed in sample tables

INSERT INTO FAJITA.dbo.VariableExclusions (VariableName, Description, CreatedBy)
SELECT v.VariableName, v.Description, 'system'
FROM (VALUES
    ('PREV_DT_ID', 'Previous data ID - internal tracking'),
    ('ISPARTYREG', 'Party registration flag'),
    ('CENSUSBLOCK2020', 'Census block identifier'),
    ('METROTYPE', 'Metro type classification'),
    ('RNCTURF', 'RNC turf data'),
    ('MCD', 'Minor civil division'),
    ('STATECOUNTYCODE', 'State county code'),
    ('STATETOWNCODE', 'State town code'),
    ('WARD', 'Ward identifier'),
    ('SCHOOLBOARD', 'School board district'),
    ('SCHOOLDISTRICT', 'School district'),
    ('CITYCOUNCIL', 'City council district'),
    ('CONGRESSIONALDISTRICT_PREVIOUSELECTION', 'Previous election congressional district'),
    ('STATELEGUPPERDISTRICT_PREVIOUSELECTION', 'Previous election state leg upper district'),
    ('STATELEGUPPERDISTRICT_PROPER', 'State leg upper district proper'),
    ('STATELEGUPPERDISTRICT_PROPER_PREVIOUSELECTION', 'Previous election state leg upper district proper'),
    ('STATELEGLOWERDISTRICT_PREVIOUSELECTION', 'Previous election state leg lower district'),
    ('STATELEGLOWERSUBDISTRICT', 'State leg lower subdistrict'),
    ('STATELEGLOWERSUBDISTRICT_PREVIOUSELECTION', 'Previous election state leg lower subdistrict'),
    ('STATELEGLOWERDISTRICT_PROPER', 'State leg lower district proper'),
    ('STATELEGLOWERDISTRICT_PROPER_PREVIOUSELECTION', 'Previous election state leg lower district proper'),
    ('SEX_SOURCE', 'Sex data source'),
    ('DATEOFBIRTH_SOURCE', 'Date of birth data source'),
    ('JURISDICTIONVOTERID', 'Jurisdiction voter ID'),
    ('LASTACTIVITYDATE', 'Last activity date'),
    ('REGISTRATIONDATESOURCE', 'Registration date source'),
    ('PERMANENTABSENTEE', 'Permanent absentee status'),
    ('ETHNICITYREPORTED', 'Reported ethnicity'),
    ('ETHNICITYMODELED', 'Modeled ethnicity'),
    ('LANGUAGEMODELED', 'Modeled language'),
    ('RELIGIONMODELED', 'Modeled religion'),
    ('HOUSEHOLDPARTY', 'Household party affiliation'),
    ('NEIGHBORHOODID', 'Neighborhood identifier'),
    ('NEIGHBORHOODSEGMENTID', 'Neighborhood segment identifier'),
    ('REGADDRESSID', 'Registration address ID'),
    ('REGHOUSENUM', 'Registration house number'),
    ('REGHOUSESFX', 'Registration house suffix'),
    ('REGSTPREFIX', 'Registration street prefix'),
    ('REGSTNAME', 'Registration street name'),
    ('REGSTTYPE', 'Registration street type'),
    ('REGSTPOST', 'Registration street post'),
    ('REGUNITTYPE', 'Registration unit type'),
    ('REGUNITNUMBER', 'Registration unit number'),
    ('REGLATITUDE', 'Registration latitude'),
    ('REGLONGITUDE', 'Registration longitude'),
    ('REGGEOCODELEVEL', 'Registration geocode level'),
    ('REGLASTCLEANSE', 'Registration last cleanse date'),
    ('REGLASTGEOCODE', 'Registration last geocode date'),
    ('REGLASTCOA', 'Registration last change of address'),
    ('CHANGEOFADDRESSSOURCE', 'Change of address source'),
    ('CHANGEOFADDRESSDATE', 'Change of address date'),
    ('CHANGEOFADDRESSTYPE', 'Change of address type'),
    ('MAILINGADDR1', 'Mailing address line 1'),
    ('MAILINGADDR2', 'Mailing address line 2'),
    ('MAILHOUSENUM', 'Mailing house number'),
    ('MAILHOUSESFX', 'Mailing house suffix'),
    ('MAILSTPREFIX', 'Mailing street prefix'),
    ('MAILSTNAME', 'Mailing street name'),
    ('MAILSTTYPE', 'Mailing street type'),
    ('MAILSTPOST', 'Mailing street post'),
    ('MAILUNITTYPE', 'Mailing unit type'),
    ('MAILUNITNUMBER', 'Mailing unit number'),
    ('MAILCITY', 'Mailing city'),
    ('MAILSTA', 'Mailing state'),
    ('MAILZIP5', 'Mailing ZIP 5'),
    ('MAILZIP4', 'Mailing ZIP 4'),
    ('MAILSORTCODEROUTE', 'Mailing sort code route'),
    ('MAILDELIVERYPT', 'Mailing delivery point'),
    ('MAILDELIVERYPTCHKDIGIT', 'Mailing delivery point check digit'),
    ('MAILLINEOFTRAVEL', 'Mailing line of travel'),
    ('MAILLINEOFTRAVELORDER', 'Mailing line of travel order'),
    ('MAILDPVSTATUS', 'Mailing DPV status'),
    ('MAILLASTCLEANSE', 'Mailing last cleanse date'),
    ('MAILLASTCOA', 'Mailing last change of address'),
    ('CELLSOURCECODE', 'Cell source code'),
    ('CELLMATCHLEVEL', 'Cell match level'),
    ('CELLFTCDONOTCALL', 'Cell FTC do not call'),
    ('CELLAPPENDDATE', 'Cell append date'),
    ('CELLDATAAXLE', 'Cell Data Axle'),
    ('CELLDATAAXLEMATCHLEVEL', 'Cell Data Axle match level'),
    ('CELLDATAAXLERELIABILITYCODE', 'Cell Data Axle reliability code'),
    ('CELLDATAAXLEFTCDONOTCALL', 'Cell Data Axle FTC do not call'),
    ('CELLDATAAXLEAPPENDDATE', 'Cell Data Axle append date'),
    ('CELLRAWVF', 'Cell raw VF'),
    ('CELLABEV', 'Cell ABEV'),
    ('CELLNEUSTAR', 'Cell Neustar'),
    ('CELLNEUSTARMATCHLEVEL', 'Cell Neustar match level'),
    ('CELLNEUSTARTIMEOFDAY', 'Cell Neustar time of day'),
    ('CELLNEUSTARAPPENDDATE', 'Cell Neustar append date'),
    ('LANDLINESOURCECODE', 'Landline source code'),
    ('LANDLINEMATCHLEVEL', 'Landline match level'),
    ('LANDLINEFTCDONOTCALL', 'Landline FTC do not call'),
    ('LANDLINEAPPENDDATE', 'Landline append date'),
    ('LANDLINEDATAAXLE', 'Landline Data Axle'),
    ('LANDLINEDATAAXLEMATCHLEVEL', 'Landline Data Axle match level'),
    ('LANDLINEDATAAXLERELIABILITYCODE', 'Landline Data Axle reliability code'),
    ('LANDLINEDATAAXLEFTCDONOTCALL', 'Landline Data Axle FTC do not call'),
    ('LANDLINEDATAAXLEAPPENDDATE', 'Landline Data Axle append date'),
    ('LANDLINERAWVF', 'Landline raw VF'),
    ('LANDLINEABEV', 'Landline ABEV'),
    ('LANDLINENEUSTAR', 'Landline Neustar'),
    ('LANDLINENEUSTARMATCHLEVEL', 'Landline Neustar match level'),
    ('LANDLINENEUSTARTIMEOFDAY', 'Landline Neustar time of day'),
    ('LANDLINENEUSTARAPPENDDATE', 'Landline Neustar append date'),
    ('VOTERREGULARITYGENERAL', 'Voter regularity general'),
    ('VOTERREGULARITYPRIMARY', 'Voter regularity primary'),
    ('VH24PP', 'Vote history 2024 presidential primary'),
    ('VH20PP', 'Vote history 2020 presidential primary'),
    ('VH17G', 'Vote history 2017 general'),
    ('VH17P', 'Vote history 2017 primary'),
    ('VH16G', 'Vote history 2016 general'),
    ('VH16P', 'Vote history 2016 primary'),
    ('VH16PP', 'Vote history 2016 presidential primary'),
    ('VH15G', 'Vote history 2015 general'),
    ('VH15P', 'Vote history 2015 primary'),
    ('VH14G', 'Vote history 2014 general'),
    ('VH14P', 'Vote history 2014 primary'),
    ('VH13G', 'Vote history 2013 general'),
    ('VH13P', 'Vote history 2013 primary'),
    ('VH12G', 'Vote history 2012 general'),
    ('VH12P', 'Vote history 2012 primary'),
    ('VH12PP', 'Vote history 2012 presidential primary'),
    ('VH11G', 'Vote history 2011 general'),
    ('VH11P', 'Vote history 2011 primary'),
    ('VH10G', 'Vote history 2010 general'),
    ('VH10P', 'Vote history 2010 primary'),
    ('VH09G', 'Vote history 2009 general'),
    ('VH09P', 'Vote history 2009 primary'),
    ('VH08G', 'Vote history 2008 general'),
    ('VH08P', 'Vote history 2008 primary'),
    ('VH08PP', 'Vote history 2008 presidential primary'),
    ('VH07G', 'Vote history 2007 general'),
    ('VH07P', 'Vote history 2007 primary'),
    ('VH06G', 'Vote history 2006 general'),
    ('VH06P', 'Vote history 2006 primary'),
    ('VH05G', 'Vote history 2005 general'),
    ('VH05P', 'Vote history 2005 primary'),
    ('VH04G', 'Vote history 2004 general'),
    ('VH04P', 'Vote history 2004 primary'),
    ('VH04PP', 'Vote history 2004 presidential primary'),
    ('COALITIONID_SOCIALCONSERVATIVE', 'Coalition ID social conservative'),
    ('COALITIONID_VETERAN', 'Coalition ID veteran'),
    ('COALITIONID_SPORTSMEN', 'Coalition ID sportsmen'),
    ('COALITIONID_2NDAMENDMENT', 'Coalition ID 2nd amendment'),
    ('COALITIONID_PROLIFE', 'Coalition ID pro-life'),
    ('COALITIONID_PROCHOICE', 'Coalition ID pro-choice'),
    ('COALITIONID_FISCALCONSERVATIVE', 'Coalition ID fiscal conservative'),
    ('MODELEDIDEOLOGY_SOCIALCONSERVATIVE', 'Modeled ideology social conservative'),
    ('MODELEDIDEOLOGY_SOCIALLIBERAL', 'Modeled ideology social liberal'),
    ('MODELEDIDEOLOGY_FISCALCONSERVATIVE', 'Modeled ideology fiscal conservative'),
    ('MODELEDIDEOLOGY_FISCALLIBERAL', 'Modeled ideology fiscal liberal'),
    ('MODELEDISSUE_BORDERSECURITYCRISIS', 'Modeled issue border security crisis'),
    ('MODELEDISSUE_BORDERHUMANITARIANCRISIS', 'Modeled issue border humanitarian crisis'),
    ('MODELEDISSUE_FIXECONOMYDEM', 'Modeled issue fix economy dem'),
    ('MODELEDISSUE_FIXECONOMYGOP', 'Modeled issue fix economy gop'),
    ('MODELEDISSUE_BIDENDISAPPROVE', 'Modeled issue Biden disapprove'),
    ('MODELEDISSUE_BIDENAPPROVE', 'Modeled issue Biden approve'),
    ('MODELEDISSUE_INFLATIONECONOMICFACTORS', 'Modeled issue inflation economic factors'),
    ('MODELEDISSUE_INFLATIONBIDENFAULT', 'Modeled issue inflation Biden fault'),
    ('REPUBLICANPARTYSCORE', 'Republican party score'),
    ('RPRSC', 'Republican party score (short)'),
    ('DEMOCRATICPARTYSCORE', 'Democratic party score'),
    ('DPRSC', 'Democratic party score (short)'),
    ('REPUBLICANBALLOTSCORE', 'Republican ballot score'),
    ('RBLLSC', 'Republican ballot score (short)'),
    ('DEMOCRATICBALLOTSCORE', 'Democratic ballot score'),
    ('DBLLSC', 'Democratic ballot score (short)'),
    ('TURNOUTGENERALSCORE', 'Turnout general score'),
    ('TURN', 'Turnout score (short)'),
    ('HOUSEHOLDINCOMEMODELED', 'Household income modeled'),
    ('HHPARTY', 'Household party'),
    ('EDUCATIONMODELED', 'Education modeled'),
    ('MODEDU', 'Modeled education (short)'),
    ('CUSTOM01', 'Custom field 01'),
    ('CUSTOM02', 'Custom field 02'),
    ('CUSTOM03', 'Custom field 03'),
    ('CUSTOM04', 'Custom field 04'),
    ('CUSTOM05', 'Custom field 05'),
    ('LASTUPDATE', 'Last update timestamp'),
    ('INDIANA1025USEDSAMPLE', 'Indiana 1025 used sample flag'),
    ('NOTES', 'Notes field')
) AS v(VariableName, Description)
WHERE NOT EXISTS (
    SELECT 1 FROM FAJITA.dbo.VariableExclusions ve
    WHERE ve.VariableName = v.VariableName
);

PRINT 'Inserted default variable exclusions';
GO
