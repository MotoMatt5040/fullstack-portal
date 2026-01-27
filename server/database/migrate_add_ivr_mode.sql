-- Migration: Add IVR mode to Modes table
-- Database: fajita
-- Date: 2026-01-26

USE fajita;
GO

-- Add IVR mode (7) to Modes table if it doesn't exist
IF EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'dbo'
    AND TABLE_NAME = 'Modes'
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM dbo.Modes WHERE modeID = 7
    )
    BEGIN
        INSERT INTO dbo.Modes (modeID, modeName)
        VALUES (7, 'IVR');

        PRINT 'Added IVR mode (modeID = 7) to dbo.Modes table';
    END
    ELSE
    BEGIN
        PRINT 'IVR mode (modeID = 7) already exists in dbo.Modes table';
    END
END
ELSE
BEGIN
    PRINT 'dbo.Modes table does not exist - skipping IVR mode insert';
END
GO
