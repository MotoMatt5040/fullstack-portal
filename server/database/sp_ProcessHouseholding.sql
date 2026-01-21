USE [FAJITA]
GO
/****** Object:  StoredProcedure [dbo].[sp_ProcessHouseholding]    Script Date: 12/16/2025 11:00:20 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [dbo].[sp_ProcessHouseholding]
    @TableName NVARCHAR(128),
    @SelectedAgeRange INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @SQL NVARCHAR(MAX)
    DECLARE @BackupTableName NVARCHAR(200)
    DECLARE @Duplicate2Table NVARCHAR(200)
    DECLARE @Duplicate3Table NVARCHAR(200)
    DECLARE @Duplicate4Table NVARCHAR(200)
    DECLARE @TotalProcessed INT = 0
    DECLARE @Duplicate2Count INT = 0
    DECLARE @Duplicate3Count INT = 0
    DECLARE @Duplicate4Count INT = 0
    DECLARE @MainTableFinal INT = 0
    DECLARE @HasVFREQGEN BIT = 0
    DECLARE @HasVFREQPR BIT = 0
    DECLARE @HasCALCPARTY BIT = 0

    -- Generate table names
    SET @BackupTableName = @TableName + '_BACKUP_' + FORMAT(GETDATE(), 'yyyyMMddHHmmss')
    SET @Duplicate2Table = @TableName + 'duplicate2'
    SET @Duplicate3Table = @TableName + 'duplicate3'
    SET @Duplicate4Table = @TableName + 'duplicate4'

    -- Check if base VFREQGEN column exists
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @TableName AND COLUMN_NAME = 'VFREQGEN')
        SET @HasVFREQGEN = 1

    -- Check if base VFREQPR column exists
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @TableName AND COLUMN_NAME = 'VFREQPR')
        SET @HasVFREQPR = 1

    -- Check if base CALCPARTY column exists
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @TableName AND COLUMN_NAME = 'CALCPARTY')
        SET @HasCALCPARTY = 1

    BEGIN TRY
        BEGIN TRANSACTION

        -- Step 1: Create backup table
        SET @SQL = 'SELECT * INTO FAJITA.dbo.[' + @BackupTableName + '] FROM FAJITA.dbo.[' + @TableName + ']'
        EXEC sp_executesql @SQL

        -- Step 2: Add householding columns if they don't exist
        -- Add name columns (FNAME2-4, LNAME2-4)
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @TableName AND COLUMN_NAME = 'FNAME2')
        BEGIN
            SET @SQL = 'ALTER TABLE FAJITA.dbo.[' + @TableName + '] ADD
                       FNAME2 NVARCHAR(50), LNAME2 NVARCHAR(50),
                       FNAME3 NVARCHAR(50), LNAME3 NVARCHAR(50),
                       FNAME4 NVARCHAR(50), LNAME4 NVARCHAR(50)'
            EXEC sp_executesql @SQL
        END

        -- Add IAGE columns (IAGE2, IAGE3, IAGE4)
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @TableName AND COLUMN_NAME = 'IAGE2')
        BEGIN
            SET @SQL = 'ALTER TABLE FAJITA.dbo.[' + @TableName + '] ADD
                       IAGE2 NVARCHAR(50),
                       IAGE3 NVARCHAR(50),
                       IAGE4 NVARCHAR(50)'
            EXEC sp_executesql @SQL
        END

        -- Add GEND columns (GEND2, GEND3, GEND4)
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @TableName AND COLUMN_NAME = 'GEND2')
        BEGIN
            SET @SQL = 'ALTER TABLE FAJITA.dbo.[' + @TableName + '] ADD
                       GEND2 NVARCHAR(50),
                       GEND3 NVARCHAR(50),
                       GEND4 NVARCHAR(50)'
            EXEC sp_executesql @SQL
        END

        -- Add PARTY columns (PARTY2, PARTY3, PARTY4)
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @TableName AND COLUMN_NAME = 'PARTY2')
        BEGIN
            SET @SQL = 'ALTER TABLE FAJITA.dbo.[' + @TableName + '] ADD
                       PARTY2 NVARCHAR(50),
                       PARTY3 NVARCHAR(50),
                       PARTY4 NVARCHAR(50)'
            EXEC sp_executesql @SQL
        END

        -- CONDITIONALLY add CALCPARTY columns ONLY if base CALCPARTY exists
        IF @HasCALCPARTY = 1 AND NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @TableName AND COLUMN_NAME = 'CALCPARTY2')
        BEGIN
            SET @SQL = 'ALTER TABLE FAJITA.dbo.[' + @TableName + '] ADD
                       CALCPARTY2 NVARCHAR(50),
                       CALCPARTY3 NVARCHAR(50),
                       CALCPARTY4 NVARCHAR(50)'
            EXEC sp_executesql @SQL
            PRINT 'Added CALCPARTY2-4 columns (base CALCPARTY exists)'
        END

        -- CONDITIONALLY add VFREQGEN columns ONLY if base VFREQGEN exists
        IF @HasVFREQGEN = 1 AND NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @TableName AND COLUMN_NAME = 'VFREQGEN2')
        BEGIN
            SET @SQL = 'ALTER TABLE FAJITA.dbo.[' + @TableName + '] ADD
                       VFREQGEN2 NVARCHAR(50),
                       VFREQGEN3 NVARCHAR(50),
                       VFREQGEN4 NVARCHAR(50)'
            EXEC sp_executesql @SQL
            PRINT 'Added VFREQGEN2-4 columns (base VFREQGEN exists)'
        END

        -- CONDITIONALLY add VFREQPR columns ONLY if base VFREQPR exists
        IF @HasVFREQPR = 1 AND NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @TableName AND COLUMN_NAME = 'VFREQPR2')
        BEGIN
            SET @SQL = 'ALTER TABLE FAJITA.dbo.[' + @TableName + '] ADD
                       VFREQPR2 NVARCHAR(50),
                       VFREQPR3 NVARCHAR(50),
                       VFREQPR4 NVARCHAR(50)'
            EXEC sp_executesql @SQL
            PRINT 'Added VFREQPR2-4 columns (base VFREQPR exists)'
        END

        -- Step 3: Create duplicate tables with same structure as main table (AFTER adding new columns)
        SET @SQL = 'SELECT TOP 0 * INTO FAJITA.dbo.[' + @Duplicate2Table + '] FROM FAJITA.dbo.[' + @TableName + ']'
        EXEC sp_executesql @SQL

        SET @SQL = 'SELECT TOP 0 * INTO FAJITA.dbo.[' + @Duplicate3Table + '] FROM FAJITA.dbo.[' + @TableName + ']'
        EXEC sp_executesql @SQL

        SET @SQL = 'SELECT TOP 0 * INTO FAJITA.dbo.[' + @Duplicate4Table + '] FROM FAJITA.dbo.[' + @TableName + ']'
        EXEC sp_executesql @SQL

        -- Step 4: Build UPDATE statement dynamically based on which columns exist
        SET @SQL = '
        WITH RankedLandlines AS (
            SELECT *,
                   ROW_NUMBER() OVER (PARTITION BY LAND ORDER BY IAGE ASC) as rn
            FROM FAJITA.dbo.[' + @TableName + ']
            WHERE (SOURCE = 1 OR (SOURCE = 3 AND AGERANGE >= ' + CAST(@SelectedAgeRange AS NVARCHAR(10)) + '))
            AND LAND IS NOT NULL AND LAND != ''''
        ),
        GroupedData AS (
            SELECT
                LAND,
                -- Rank 2 data
                MAX(CASE WHEN rn = 2 THEN FNAME END) as FNAME2,
                MAX(CASE WHEN rn = 2 THEN LNAME END) as LNAME2,
                MAX(CASE WHEN rn = 2 THEN IAGE END) as IAGE2,
                MAX(CASE WHEN rn = 2 THEN GEND END) as GEND2,
                MAX(CASE WHEN rn = 2 THEN PARTY END) as PARTY2,'

        -- Add CALCPARTY2 only if base column exists
        IF @HasCALCPARTY = 1
            SET @SQL = @SQL + '
                MAX(CASE WHEN rn = 2 THEN CALCPARTY END) as CALCPARTY2,'

        -- Add VFREQGEN2 only if base column exists
        IF @HasVFREQGEN = 1
            SET @SQL = @SQL + '
                MAX(CASE WHEN rn = 2 THEN VFREQGEN END) as VFREQGEN2,'

        -- Add VFREQPR2 only if base column exists
        IF @HasVFREQPR = 1
            SET @SQL = @SQL + '
                MAX(CASE WHEN rn = 2 THEN VFREQPR END) as VFREQPR2,'

        SET @SQL = @SQL + '
                -- Rank 3 data
                MAX(CASE WHEN rn = 3 THEN FNAME END) as FNAME3,
                MAX(CASE WHEN rn = 3 THEN LNAME END) as LNAME3,
                MAX(CASE WHEN rn = 3 THEN IAGE END) as IAGE3,
                MAX(CASE WHEN rn = 3 THEN GEND END) as GEND3,
                MAX(CASE WHEN rn = 3 THEN PARTY END) as PARTY3,'

        -- Add CALCPARTY3 only if base column exists
        IF @HasCALCPARTY = 1
            SET @SQL = @SQL + '
                MAX(CASE WHEN rn = 3 THEN CALCPARTY END) as CALCPARTY3,'

        -- Add VFREQGEN3 only if base column exists
        IF @HasVFREQGEN = 1
            SET @SQL = @SQL + '
                MAX(CASE WHEN rn = 3 THEN VFREQGEN END) as VFREQGEN3,'

        -- Add VFREQPR3 only if base column exists
        IF @HasVFREQPR = 1
            SET @SQL = @SQL + '
                MAX(CASE WHEN rn = 3 THEN VFREQPR END) as VFREQPR3,'

        SET @SQL = @SQL + '
                -- Rank 4 data
                MAX(CASE WHEN rn = 4 THEN FNAME END) as FNAME4,
                MAX(CASE WHEN rn = 4 THEN LNAME END) as LNAME4,
                MAX(CASE WHEN rn = 4 THEN IAGE END) as IAGE4,
                MAX(CASE WHEN rn = 4 THEN GEND END) as GEND4,
                MAX(CASE WHEN rn = 4 THEN PARTY END) as PARTY4'

        -- Add CALCPARTY4 only if base column exists
        IF @HasCALCPARTY = 1
            SET @SQL = @SQL + ',
                MAX(CASE WHEN rn = 4 THEN CALCPARTY END) as CALCPARTY4'

        -- Add VFREQGEN4 only if base column exists
        IF @HasVFREQGEN = 1
            SET @SQL = @SQL + ',
                MAX(CASE WHEN rn = 4 THEN VFREQGEN END) as VFREQGEN4'

        -- Add VFREQPR4 only if base column exists
        IF @HasVFREQPR = 1
            SET @SQL = @SQL + ',
                MAX(CASE WHEN rn = 4 THEN VFREQPR END) as VFREQPR4'

        SET @SQL = @SQL + '
            FROM RankedLandlines
            WHERE rn <= 4
            GROUP BY LAND
        )
        UPDATE t
        SET
            -- Rank 2 columns
            FNAME2 = g.FNAME2,
            LNAME2 = g.LNAME2,
            IAGE2 = g.IAGE2,
            GEND2 = g.GEND2,
            PARTY2 = g.PARTY2'

        -- Add CALCPARTY2 to UPDATE only if it exists
        IF @HasCALCPARTY = 1
            SET @SQL = @SQL + ',
            CALCPARTY2 = g.CALCPARTY2'

        -- Add VFREQGEN2/PR2 to UPDATE only if they exist
        IF @HasVFREQGEN = 1
            SET @SQL = @SQL + ',
            VFREQGEN2 = g.VFREQGEN2'
        IF @HasVFREQPR = 1
            SET @SQL = @SQL + ',
            VFREQPR2 = g.VFREQPR2'

        SET @SQL = @SQL + ',
            -- Rank 3 columns
            FNAME3 = g.FNAME3,
            LNAME3 = g.LNAME3,
            IAGE3 = g.IAGE3,
            GEND3 = g.GEND3,
            PARTY3 = g.PARTY3'

        -- Add CALCPARTY3 to UPDATE only if it exists
        IF @HasCALCPARTY = 1
            SET @SQL = @SQL + ',
            CALCPARTY3 = g.CALCPARTY3'

        -- Add VFREQGEN3/PR3 to UPDATE only if they exist
        IF @HasVFREQGEN = 1
            SET @SQL = @SQL + ',
            VFREQGEN3 = g.VFREQGEN3'
        IF @HasVFREQPR = 1
            SET @SQL = @SQL + ',
            VFREQPR3 = g.VFREQPR3'

        SET @SQL = @SQL + ',
            -- Rank 4 columns
            FNAME4 = g.FNAME4,
            LNAME4 = g.LNAME4,
            IAGE4 = g.IAGE4,
            GEND4 = g.GEND4,
            PARTY4 = g.PARTY4'

        -- Add CALCPARTY4 to UPDATE only if it exists
        IF @HasCALCPARTY = 1
            SET @SQL = @SQL + ',
            CALCPARTY4 = g.CALCPARTY4'

        -- Add VFREQGEN4/PR4 to UPDATE only if they exist
        IF @HasVFREQGEN = 1
            SET @SQL = @SQL + ',
            VFREQGEN4 = g.VFREQGEN4'
        IF @HasVFREQPR = 1
            SET @SQL = @SQL + ',
            VFREQPR4 = g.VFREQPR4'

        SET @SQL = @SQL + '
        FROM FAJITA.dbo.[' + @TableName + '] t
        INNER JOIN GroupedData g ON t.LAND = g.LAND'

        EXEC sp_executesql @SQL

        -- Step 5-8: Move rank 2, 3, 4 records to duplicate tables and delete from main
        -- (Rest of the stored procedure remains the same as original)

        -- Step 5: Move rank 2 records to duplicate2 table
        SET @SQL = '
        INSERT INTO FAJITA.dbo.[' + @Duplicate2Table + ']
        SELECT t.*
        FROM FAJITA.dbo.[' + @TableName + '] t
        INNER JOIN (
            SELECT LAND, FNAME, LNAME, IAGE,
                   ROW_NUMBER() OVER (PARTITION BY LAND ORDER BY IAGE ASC) as rn
            FROM FAJITA.dbo.[' + @TableName + ']
            WHERE (SOURCE = 1 OR (SOURCE = 3 AND AGERANGE >= ' + CAST(@SelectedAgeRange AS NVARCHAR(10)) + '))
            AND LAND IS NOT NULL AND LAND != ''''
        ) ranked ON t.LAND = ranked.LAND AND t.FNAME = ranked.FNAME AND t.LNAME = ranked.LNAME AND t.IAGE = ranked.IAGE
        WHERE ranked.rn = 2'
        EXEC sp_executesql @SQL
        SET @Duplicate2Count = @@ROWCOUNT

        -- Step 6: Move rank 3 records to duplicate3 table
        SET @SQL = '
        INSERT INTO FAJITA.dbo.[' + @Duplicate3Table + ']
        SELECT t.*
        FROM FAJITA.dbo.[' + @TableName + '] t
        INNER JOIN (
            SELECT LAND, FNAME, LNAME, IAGE,
                   ROW_NUMBER() OVER (PARTITION BY LAND ORDER BY IAGE ASC) as rn
            FROM FAJITA.dbo.[' + @TableName + ']
            WHERE (SOURCE = 1 OR (SOURCE = 3 AND AGERANGE >= ' + CAST(@SelectedAgeRange AS NVARCHAR(10)) + '))
            AND LAND IS NOT NULL AND LAND != ''''
        ) ranked ON t.LAND = ranked.LAND AND t.FNAME = ranked.FNAME AND t.LNAME = ranked.LNAME AND t.IAGE = ranked.IAGE
        WHERE ranked.rn = 3'
        EXEC sp_executesql @SQL
        SET @Duplicate3Count = @@ROWCOUNT

        -- Step 7: Move rank 4 records to duplicate4 table
        SET @SQL = '
        INSERT INTO FAJITA.dbo.[' + @Duplicate4Table + ']
        SELECT t.*
        FROM FAJITA.dbo.[' + @TableName + '] t
        INNER JOIN (
            SELECT LAND, FNAME, LNAME, IAGE,
                   ROW_NUMBER() OVER (PARTITION BY LAND ORDER BY IAGE ASC) as rn
            FROM FAJITA.dbo.[' + @TableName + ']
            WHERE (SOURCE = 1 OR (SOURCE = 3 AND AGERANGE >= ' + CAST(@SelectedAgeRange AS NVARCHAR(10)) + '))
            AND LAND IS NOT NULL AND LAND != ''''
        ) ranked ON t.LAND = ranked.LAND AND t.FNAME = ranked.FNAME AND t.LNAME = ranked.LNAME AND t.IAGE = ranked.IAGE
        WHERE ranked.rn = 4'
        EXEC sp_executesql @SQL
        SET @Duplicate4Count = @@ROWCOUNT

        -- Step 8: Remove duplicate records from main table (keep only rank 1)
        SET @SQL = '
        DELETE t
        FROM FAJITA.dbo.[' + @TableName + '] t
        INNER JOIN (
            SELECT LAND, FNAME, LNAME, IAGE,
                   ROW_NUMBER() OVER (PARTITION BY LAND ORDER BY IAGE ASC) as rn
            FROM FAJITA.dbo.[' + @TableName + ']
            WHERE (SOURCE = 1 OR (SOURCE = 3 AND AGERANGE >= ' + CAST(@SelectedAgeRange AS NVARCHAR(10)) + '))
            AND LAND IS NOT NULL AND LAND != ''''
        ) ranked ON t.LAND = ranked.LAND AND t.FNAME = ranked.FNAME AND t.LNAME = ranked.LNAME AND t.IAGE = ranked.IAGE
        WHERE ranked.rn > 1'
        EXEC sp_executesql @SQL

        -- Get final count of main table landline records
        SET @SQL = 'SELECT @Count = COUNT(*) FROM FAJITA.dbo.[' + @TableName + ']
                   WHERE (SOURCE = 1 OR (SOURCE = 3 AND AGERANGE >= ' + CAST(@SelectedAgeRange AS NVARCHAR(10)) + '))'
        EXEC sp_executesql @SQL, N'@Count INT OUTPUT', @Count = @MainTableFinal OUTPUT

        SET @TotalProcessed = @Duplicate2Count + @Duplicate3Count + @Duplicate4Count + @MainTableFinal

        -- Drop empty duplicate tables (no rows were inserted)
        IF @Duplicate2Count = 0
        BEGIN
            SET @SQL = 'DROP TABLE FAJITA.dbo.[' + @Duplicate2Table + ']'
            EXEC sp_executesql @SQL
            SET @Duplicate2Table = NULL
            PRINT 'Dropped empty duplicate2 table (0 records)'
        END

        IF @Duplicate3Count = 0
        BEGIN
            SET @SQL = 'DROP TABLE FAJITA.dbo.[' + @Duplicate3Table + ']'
            EXEC sp_executesql @SQL
            SET @Duplicate3Table = NULL
            PRINT 'Dropped empty duplicate3 table (0 records)'
        END

        IF @Duplicate4Count = 0
        BEGIN
            SET @SQL = 'DROP TABLE FAJITA.dbo.[' + @Duplicate4Table + ']'
            EXEC sp_executesql @SQL
            SET @Duplicate4Table = NULL
            PRINT 'Dropped empty duplicate4 table (0 records)'
        END

        COMMIT TRANSACTION

        -- Return results
        SELECT
            1 as Success,
            @TotalProcessed as TotalProcessed,
            @MainTableFinal as MainTableFinalCount,
            @Duplicate2Count as Duplicate2Count,
            @Duplicate3Count as Duplicate3Count,
            @Duplicate4Count as Duplicate4Count,
            @BackupTableName as BackupTableName,
            @Duplicate2Table as Duplicate2Table,
            @Duplicate3Table as Duplicate3Table,
            @Duplicate4Table as Duplicate4Table,
            @HasVFREQGEN as VFREQGENIncluded,
            @HasVFREQPR as VFREQPRIncluded,
            @HasCALCPARTY as CALCPARTYIncluded,
            'Householding completed successfully' +
            CASE
                WHEN @HasVFREQGEN = 1 OR @HasVFREQPR = 1 OR @HasCALCPARTY = 1 THEN ' (additional metrics copied for household members: ' +
                    CASE WHEN @HasCALCPARTY = 1 THEN 'CALCPARTY' ELSE '' END +
                    CASE WHEN @HasCALCPARTY = 1 AND (@HasVFREQGEN = 1 OR @HasVFREQPR = 1) THEN ', ' ELSE '' END +
                    CASE WHEN @HasVFREQGEN = 1 OR @HasVFREQPR = 1 THEN 'VFREQ' ELSE '' END +
                    ')'
                ELSE ' (no additional metrics - CALCPARTY/VFREQ not present in source data)'
            END as Message

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE()
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY()
        DECLARE @ErrorState INT = ERROR_STATE()

        SELECT
            0 as Success,
            0 as TotalProcessed,
            0 as MainTableFinalCount,
            0 as Duplicate2Count,
            0 as Duplicate3Count,
            0 as Duplicate4Count,
            '' as BackupTableName,
            '' as Duplicate2Table,
            '' as Duplicate3Table,
            '' as Duplicate4Table,
            0 as VFREQGENIncluded,
            0 as VFREQPRIncluded,
            0 as CALCPARTYIncluded,
            'Error: ' + @ErrorMessage as Message

        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState)
    END CATCH
END
GO
