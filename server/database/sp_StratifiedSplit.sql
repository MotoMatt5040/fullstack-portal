-- ============================================================================
-- STEP 1: DROP THE EXISTING PROCEDURE
-- ============================================================================
USE [FAJITA]
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_StratifiedSplit' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    DROP PROCEDURE [dbo].[sp_StratifiedSplit]
    PRINT 'Existing procedure dropped successfully'
END
ELSE
BEGIN
    PRINT 'No existing procedure found'
END
GO

-- ============================================================================
-- STEP 2: CREATE THE NEW PROCEDURE WITH FIXES
-- ============================================================================
CREATE PROCEDURE [dbo].[sp_StratifiedSplit]
    @TableName NVARCHAR(255),
    @StratifyColumns NVARCHAR(500) = 'AGERANGE,GEND,PARTY,ETHNICITY,IZIP',
    @BatchCount INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @SQL NVARCHAR(MAX);
    DECLARE @ValidatedColumns NVARCHAR(500);
    DECLARE @JoinCondition NVARCHAR(1000);
    DECLARE @RequestedCol NVARCHAR(100);
    DECLARE @Pos INT;
    DECLARE @Delimiter CHAR(1) = ',';

    PRINT 'Starting stratified batch assignment for table: ' + @TableName;
    PRINT 'Requested stratify columns: ' + @StratifyColumns;
    PRINT '*** USING RANDOMIZED ORDERING (NEWID()) ***';

    -- Validate which columns actually exist in the table
    SET @ValidatedColumns = '';
    SET @JoinCondition = '';
    SET @StratifyColumns = @StratifyColumns + ',';

    WHILE LEN(@StratifyColumns) > 0
    BEGIN
        SET @Pos = CHARINDEX(@Delimiter, @StratifyColumns);
        IF @Pos > 0
        BEGIN
            SET @RequestedCol = LTRIM(RTRIM(SUBSTRING(@StratifyColumns, 1, @Pos - 1)));

            -- Check if column exists
            IF EXISTS (
                SELECT 1
                FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = 'dbo'
                AND TABLE_NAME = @TableName
                AND COLUMN_NAME = @RequestedCol
            )
            BEGIN
                IF LEN(@ValidatedColumns) > 0
                BEGIN
                    SET @ValidatedColumns = @ValidatedColumns + ',';
                    SET @JoinCondition = @JoinCondition + ' AND ';
                END
                SET @ValidatedColumns = @ValidatedColumns + @RequestedCol;
                SET @JoinCondition = @JoinCondition + 't.' + @RequestedCol + ' = sc.' + @RequestedCol;
            END

            SET @StratifyColumns = SUBSTRING(@StratifyColumns, @Pos + 1, LEN(@StratifyColumns));
        END
        ELSE
            BREAK;
    END

    -- If no valid columns, fall back to simple NTILE without stratification
    IF LEN(@ValidatedColumns) = 0
    BEGIN
        PRINT 'WARNING: None of the requested stratify columns exist in the table';
        PRINT 'Falling back to simple even distribution without stratification';
        SET @ValidatedColumns = '(SELECT 1) AS DummyGroup';
        SET @JoinCondition = '1=1';
    END
    ELSE
    BEGIN
        PRINT 'Using validated columns: ' + @ValidatedColumns;
    END

    -- Drop BATCH column if exists
    IF EXISTS (
        SELECT 1
        FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = @TableName
        AND COLUMN_NAME = 'BATCH'
    )
    BEGIN
        SET @SQL = N'ALTER TABLE FAJITA.dbo.' + QUOTENAME(@TableName) + N' DROP COLUMN BATCH';
        EXEC sp_executesql @SQL;
    END

    -- Add BATCH column as INT
    SET @SQL = N'ALTER TABLE FAJITA.dbo.' + QUOTENAME(@TableName) + N' ADD BATCH INT NULL';
    EXEC sp_executesql @SQL;

    -- Stratified batch assignment with RANDOMIZATION
    SET @SQL = N'
    WITH StrataCounts AS (
        -- Count records in each stratum
        SELECT
            ' + @ValidatedColumns + N',
            COUNT(*) as StrataSize
        FROM FAJITA.dbo.' + QUOTENAME(@TableName) + N'
        GROUP BY ' + @ValidatedColumns + N'
    ),
    RecordsWithStrataInfo AS (
        -- Tag each record with its stratum size
        SELECT
            t.*,
            sc.StrataSize,
            CASE
                WHEN sc.StrataSize >= ' + CAST(@BatchCount AS VARCHAR) + N' THEN 0
                ELSE 1
            END as IsLowCount
        FROM FAJITA.dbo.' + QUOTENAME(@TableName) + N' t
        INNER JOIN StrataCounts sc ON ' + @JoinCondition + N'
    ),
    RegularGroupsBatched AS (
        -- Apply NTILE to regular-sized groups with RANDOM ordering
        SELECT
            LAND, CELL, FNAME, LNAME,
            NTILE(' + CAST(@BatchCount AS VARCHAR) + N') OVER (
                PARTITION BY ' + @ValidatedColumns + N'
                ORDER BY NEWID()  -- *** RANDOM ORDER FIX ***
            ) AS AssignedBatch
        FROM RecordsWithStrataInfo
        WHERE IsLowCount = 0
    ),
    LowCountGroupsWithRow AS (
        -- Assign row numbers to low-count groups with RANDOM ordering
        SELECT
            LAND, CELL, FNAME, LNAME,
            ROW_NUMBER() OVER (ORDER BY NEWID()) AS RowNum  -- *** RANDOM ORDER FIX ***
        FROM RecordsWithStrataInfo
        WHERE IsLowCount = 1
    ),
    LowCountGroupsBatched AS (
        -- Distribute low-count groups evenly using NTILE
        SELECT
            LAND, CELL, FNAME, LNAME,
            NTILE(' + CAST(@BatchCount AS VARCHAR) + N') OVER (ORDER BY RowNum) AS AssignedBatch
        FROM LowCountGroupsWithRow
    ),
    AllBatched AS (
        -- Combine both regular and low-count groups
        SELECT * FROM RegularGroupsBatched
        UNION ALL
        SELECT * FROM LowCountGroupsBatched
    )
    UPDATE orig
    SET orig.BATCH = ab.AssignedBatch
    FROM FAJITA.dbo.' + QUOTENAME(@TableName) + N' orig
    INNER JOIN AllBatched ab ON
        ISNULL(orig.LAND, '''') = ISNULL(ab.LAND, '''')
        AND ISNULL(orig.CELL, '''') = ISNULL(ab.CELL, '''')
        AND ISNULL(orig.FNAME, '''') = ISNULL(ab.FNAME, '''')
        AND ISNULL(orig.LNAME, '''') = ISNULL(ab.LNAME, '''');';

    EXEC sp_executesql @SQL;

    PRINT 'Stratified batch assignment complete - RANDOMIZED within strata';

    -- ============================================================================
    -- CLEANUP: Distribute any leftover records (NULL BATCH) evenly across batches
    -- ============================================================================
    DECLARE @LeftoverCount INT;
    
    SET @SQL = N'SELECT @Count = COUNT(*) FROM FAJITA.dbo.' + QUOTENAME(@TableName) + N' WHERE BATCH IS NULL';
    EXEC sp_executesql @SQL, N'@Count INT OUTPUT', @Count = @LeftoverCount OUTPUT;
    
    IF @LeftoverCount > 0
    BEGIN
        PRINT 'Found ' + CAST(@LeftoverCount AS VARCHAR) + ' records without batch assignment';
        PRINT 'Distributing leftovers evenly across all batches...';
        
        SET @SQL = N'
        WITH Leftovers AS (
            SELECT 
                LAND, CELL, FNAME, LNAME,
                NTILE(' + CAST(@BatchCount AS VARCHAR) + N') OVER (ORDER BY NEWID()) AS AssignedBatch
            FROM FAJITA.dbo.' + QUOTENAME(@TableName) + N'
            WHERE BATCH IS NULL
        )
        UPDATE orig
        SET orig.BATCH = lf.AssignedBatch
        FROM FAJITA.dbo.' + QUOTENAME(@TableName) + N' orig
        INNER JOIN Leftovers lf ON
            ISNULL(orig.LAND, '''') = ISNULL(lf.LAND, '''')
            AND ISNULL(orig.CELL, '''') = ISNULL(lf.CELL, '''')
            AND ISNULL(orig.FNAME, '''') = ISNULL(lf.FNAME, '''')
            AND ISNULL(orig.LNAME, '''') = ISNULL(lf.LNAME, '''')
        WHERE orig.BATCH IS NULL;';
        
        EXEC sp_executesql @SQL;
        PRINT 'Leftover distribution complete';
    END
    ELSE
    BEGIN
        PRINT 'No leftover records found - all records assigned successfully';
    END

    -- Show distribution
    SET @SQL = N'
    SELECT BATCH, COUNT(*) AS RecordCount
    FROM FAJITA.dbo.' + QUOTENAME(@TableName) + N'
    GROUP BY BATCH
    ORDER BY BATCH;';

    EXEC sp_executesql @SQL;
END;
GO

-- ============================================================================
-- STEP 3: VERIFY THE PROCEDURE WAS CREATED CORRECTLY
-- ============================================================================
PRINT ''
PRINT '=========================================='
PRINT 'VERIFICATION: Checking for NEWID() usage'
PRINT '=========================================='

IF OBJECT_DEFINITION(OBJECT_ID('dbo.sp_StratifiedSplit')) LIKE '%ORDER BY NEWID()%'
BEGIN
    PRINT '✓ SUCCESS: Procedure contains ORDER BY NEWID()'
    PRINT '✓ The randomization fix has been applied'
END
ELSE
BEGIN
    PRINT '✗ ERROR: Procedure does NOT contain ORDER BY NEWID()'
    PRINT '✗ The fix was not applied - please check for errors above'
END
GO

-- ============================================================================
-- STEP 4: NOW RUN THE PROCEDURE ON YOUR TABLE
-- ============================================================================
PRINT ''
PRINT '=========================================='
PRINT 'Ready to run the fixed procedure'
PRINT '=========================================='
PRINT 'Execute this command to re-batch your data:'
PRINT ''
PRINT 'EXEC dbo.sp_StratifiedSplit'
PRINT '    @TableName = ''uploaded_ACLJ_Advocates_sample_100k_251118_2025-11-19T19_42_37_CELL'','
PRINT '    @BatchCount = 20'
PRINT ''