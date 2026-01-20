-- Migration Script: Remove StartDate and EndDate from CallIDUsage table
-- These dates will now come from the Projects table instead
-- Run this script to migrate the CallIDUsage table

-- Step 1: Create a backup of the existing data
IF OBJECT_ID('FAJITA.dbo.CallIDUsage_Backup', 'U') IS NOT NULL
    DROP TABLE FAJITA.dbo.CallIDUsage_Backup;

SELECT * INTO FAJITA.dbo.CallIDUsage_Backup FROM FAJITA.dbo.CallIDUsage;

PRINT 'Backup created: CallIDUsage_Backup';

-- Step 2: Create the new table structure without StartDate and EndDate
IF OBJECT_ID('FAJITA.dbo.CallIDUsage_New', 'U') IS NOT NULL
    DROP TABLE FAJITA.dbo.CallIDUsage_New;

CREATE TABLE FAJITA.dbo.CallIDUsage_New (
    ProjectID NVARCHAR(20) NOT NULL PRIMARY KEY,
    CallIDL1 INT NULL,
    CallIDL2 INT NULL,
    CallIDC1 INT NULL,
    CallIDC2 INT NULL,
    CONSTRAINT FK_CallIDUsage_CallIDL1 FOREIGN KEY (CallIDL1) REFERENCES FAJITA.dbo.CallIDs(PhoneNumberID),
    CONSTRAINT FK_CallIDUsage_CallIDL2 FOREIGN KEY (CallIDL2) REFERENCES FAJITA.dbo.CallIDs(PhoneNumberID),
    CONSTRAINT FK_CallIDUsage_CallIDC1 FOREIGN KEY (CallIDC1) REFERENCES FAJITA.dbo.CallIDs(PhoneNumberID),
    CONSTRAINT FK_CallIDUsage_CallIDC2 FOREIGN KEY (CallIDC2) REFERENCES FAJITA.dbo.CallIDs(PhoneNumberID)
);

PRINT 'New table structure created: CallIDUsage_New';

-- Step 3: Migrate data (taking only the columns we need)
INSERT INTO FAJITA.dbo.CallIDUsage_New (ProjectID, CallIDL1, CallIDL2, CallIDC1, CallIDC2)
SELECT DISTINCT ProjectID, CallIDL1, CallIDL2, CallIDC1, CallIDC2
FROM FAJITA.dbo.CallIDUsage;

PRINT 'Data migrated to new table';

-- Step 4: Drop the old table and rename the new one
DROP TABLE FAJITA.dbo.CallIDUsage;

EXEC sp_rename 'FAJITA.dbo.CallIDUsage_New', 'CallIDUsage';

PRINT 'Table renamed: CallIDUsage_New -> CallIDUsage';

-- Step 5: Verify the migration
SELECT
    'CallIDUsage' as TableName,
    COUNT(*) as RowCount
FROM FAJITA.dbo.CallIDUsage;

SELECT
    'CallIDUsage_Backup' as TableName,
    COUNT(*) as RowCount
FROM FAJITA.dbo.CallIDUsage_Backup;

PRINT 'Migration complete! Verify row counts match above.';
PRINT 'The backup table CallIDUsage_Backup can be dropped once verified.';
