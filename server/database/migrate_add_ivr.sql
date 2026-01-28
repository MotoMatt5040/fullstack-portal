-- Migration: Add IVR column to Projects table
-- Database: fajita
-- Date: 2026-01-22

USE fajita;
GO

-- Add ivr column to Projects table if it doesn't exist
IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo'
    AND TABLE_NAME = 'Projects'
    AND COLUMN_NAME = 'ivr'
)
BEGIN
    ALTER TABLE dbo.Projects
    ADD ivr BIT NOT NULL DEFAULT 0;

    PRINT 'Added ivr column to dbo.Projects table';
END
ELSE
BEGIN
    PRINT 'Column ivr already exists in dbo.Projects table';
END
GO
