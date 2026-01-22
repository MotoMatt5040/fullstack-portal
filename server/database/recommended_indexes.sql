-- ============================================================================
-- RECOMMENDED INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================
-- Generated: 2026-01-22
-- Purpose: Improve query performance for report endpoints
--
-- IMPORTANT: Review execution plans before applying to production.
-- These indexes are based on observed query patterns in:
--   - server/services/ReportModel.js (getLiveInterviewerData, getLiveReportData)
--   - server/controllers/reportController.js
-- ============================================================================

-- ----------------------------------------------------------------------------
-- tblHourlyProductionDetail indexes
-- Used in: getLiveInterviewerData() with JOINs on VoxcoID, ProjectID, recloc
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_HPD_VoxcoID' AND object_id = OBJECT_ID('tblHourlyProductionDetail'))
BEGIN
    CREATE INDEX IX_HPD_VoxcoID ON tblHourlyProductionDetail(VoxcoID);
    PRINT 'Created index IX_HPD_VoxcoID';
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_HPD_ProjectID_RecLoc' AND object_id = OBJECT_ID('tblHourlyProductionDetail'))
BEGIN
    CREATE INDEX IX_HPD_ProjectID_RecLoc ON tblHourlyProductionDetail(ProjectID, recloc);
    PRINT 'Created index IX_HPD_ProjectID_RecLoc';
END

-- ----------------------------------------------------------------------------
-- tblIntCodes indexes
-- Used in: Subqueries filtering by VoxcoID, ProjectID, and Code ('TD', '02')
-- INCLUDE columns avoid key lookups for CodeQty
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_IntCodes_Lookup' AND object_id = OBJECT_ID('tblIntCodes'))
BEGIN
    CREATE INDEX IX_IntCodes_Lookup ON tblIntCodes(VoxcoID, ProjectID, Code) INCLUDE (CodeQty);
    PRINT 'Created index IX_IntCodes_Lookup';
END

-- ----------------------------------------------------------------------------
-- tblCC3EmployeeList indexes
-- Used in: JOIN with tblHourlyProductionDetail on VoxcoID
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_EmpList_VoxcoID' AND object_id = OBJECT_ID('tblCC3EmployeeList'))
BEGIN
    CREATE INDEX IX_EmpList_VoxcoID ON tblCC3EmployeeList(VoxcoID);
    PRINT 'Created index IX_EmpList_VoxcoID';
END

-- ----------------------------------------------------------------------------
-- tblProduction indexes
-- Used in: Date range queries filtering by ProjectID and RecDate
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Production_ProjectDate' AND object_id = OBJECT_ID('tblProduction'))
BEGIN
    CREATE INDEX IX_Production_ProjectDate ON tblProduction(ProjectID, RecDate);
    PRINT 'Created index IX_Production_ProjectDate';
END

-- ----------------------------------------------------------------------------
-- tblBlueBookProjMaster indexes (if used in report queries)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BluBook_ProjectDate' AND object_id = OBJECT_ID('tblBlueBookProjMaster'))
BEGIN
    CREATE INDEX IX_BluBook_ProjectDate ON tblBlueBookProjMaster(ProjectID, RecDate);
    PRINT 'Created index IX_BluBook_ProjectDate';
END

-- ----------------------------------------------------------------------------
-- tblGPCPHDaily indexes
-- Used in: Report data queries with ProjectID and RecDate filters
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GPCPH_ProjectDate' AND object_id = OBJECT_ID('tblGPCPHDaily'))
BEGIN
    CREATE INDEX IX_GPCPH_ProjectDate ON tblGPCPHDaily(ProjectID, RecDate);
    PRINT 'Created index IX_GPCPH_ProjectDate';
END

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these after creating indexes to verify they exist
-- ============================================================================
/*
SELECT
    t.name AS TableName,
    i.name AS IndexName,
    i.type_desc AS IndexType
FROM sys.indexes i
JOIN sys.tables t ON i.object_id = t.object_id
WHERE i.name IN (
    'IX_HPD_VoxcoID',
    'IX_HPD_ProjectID_RecLoc',
    'IX_IntCodes_Lookup',
    'IX_EmpList_VoxcoID',
    'IX_Production_ProjectDate',
    'IX_BluBook_ProjectDate',
    'IX_GPCPH_ProjectDate'
)
ORDER BY t.name, i.name;
*/

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================
/*
DROP INDEX IF EXISTS IX_HPD_VoxcoID ON tblHourlyProductionDetail;
DROP INDEX IF EXISTS IX_HPD_ProjectID_RecLoc ON tblHourlyProductionDetail;
DROP INDEX IF EXISTS IX_IntCodes_Lookup ON tblIntCodes;
DROP INDEX IF EXISTS IX_EmpList_VoxcoID ON tblCC3EmployeeList;
DROP INDEX IF EXISTS IX_Production_ProjectDate ON tblProduction;
DROP INDEX IF EXISTS IX_BluBook_ProjectDate ON tblBlueBookProjMaster;
DROP INDEX IF EXISTS IX_GPCPH_ProjectDate ON tblGPCPHDaily;
*/
