USE [FAJITA]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

/*
  Stored Procedure: sp_CreateVFREQColumns

  Description: Creates and populates VFREQGEN and VFREQPR columns based on voting history
               for the previous 4 even years. Counts the number of elections voted in.

  Parameters:
    @TableName NVARCHAR(255) - The sample table name

  Returns:
    Result set with calculation details

  Notes:
    - Handles 'NA' and other non-numeric values in VH columns
    - Only counts valid numeric non-zero values
*/
ALTER PROCEDURE [dbo].[sp_CreateVFREQColumns]
    @TableName NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @SQL NVARCHAR(MAX);
    DECLARE @CurrentYear INT = YEAR(GETDATE());
    DECLARE @Year1 INT, @Year2 INT, @Year3 INT, @Year4 INT;
    DECLARE @Year1_2Digit VARCHAR(2), @Year2_2Digit VARCHAR(2), @Year3_2Digit VARCHAR(2), @Year4_2Digit VARCHAR(2);
    DECLARE @RowsUpdated INT = 0;
    DECLARE @ColumnsFound INT = 0;
    DECLARE @ColumnsUsed NVARCHAR(500) = '';
    DECLARE @VFREQGENCalc NVARCHAR(2000) = '';
    DECLARE @VFREQPRCalc NVARCHAR(2000) = '';

    BEGIN TRY
        -- Check if table exists
        IF NOT EXISTS (
            SELECT 1
            FROM FAJITA.INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = 'dbo'
            AND TABLE_NAME = @TableName
        )
        BEGIN
            RAISERROR('Table %s does not exist in FAJITA.dbo schema', 16, 1, @TableName);
            RETURN;
        END

        -- Calculate previous 4 even years
        IF @CurrentYear % 2 = 0
        BEGIN
            SET @Year1 = @CurrentYear - 2;
            SET @Year2 = @CurrentYear - 4;
            SET @Year3 = @CurrentYear - 6;
            SET @Year4 = @CurrentYear - 8;
        END
        ELSE
        BEGIN
            SET @Year1 = @CurrentYear - 1;
            SET @Year2 = @CurrentYear - 3;
            SET @Year3 = @CurrentYear - 5;
            SET @Year4 = @CurrentYear - 7;
        END

        -- Get last 2 digits of each year
        SET @Year1_2Digit = RIGHT(CAST(@Year1 AS VARCHAR(4)), 2);
        SET @Year2_2Digit = RIGHT(CAST(@Year2 AS VARCHAR(4)), 2);
        SET @Year3_2Digit = RIGHT(CAST(@Year3 AS VARCHAR(4)), 2);
        SET @Year4_2Digit = RIGHT(CAST(@Year4 AS VARCHAR(4)), 2);

        -- Check which VH columns actually exist in the table
        SELECT @ColumnsFound = COUNT(*)
        FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = @TableName
        AND COLUMN_NAME IN (
            'VH' + @Year1_2Digit + 'G', 'VH' + @Year1_2Digit + 'P',
            'VH' + @Year2_2Digit + 'G', 'VH' + @Year2_2Digit + 'P',
            'VH' + @Year3_2Digit + 'G', 'VH' + @Year3_2Digit + 'P',
            'VH' + @Year4_2Digit + 'G', 'VH' + @Year4_2Digit + 'P'
        );

        -- If no VH columns exist, skip the operation
        IF @ColumnsFound = 0
        BEGIN
            PRINT 'No VH columns found for years ' + CAST(@Year4 AS VARCHAR) + '-' + CAST(@Year1 AS VARCHAR) + ' in table ' + @TableName + '. Skipping VFREQ calculation.';

            SELECT
                @TableName as TableName,
                0 as RowsUpdated,
                @Year4 as OldestYear,
                @Year3 as Year3,
                @Year2 as Year2,
                @Year1 as NewestYear,
                'No VH columns found' as ColumnsUsed,
                'VFREQ calculation skipped - no VH columns found' as Message;
            RETURN;
        END

        PRINT 'Found ' + CAST(@ColumnsFound AS VARCHAR) + ' VH columns for years: ' + CAST(@Year4 AS VARCHAR) + ', ' + CAST(@Year3 AS VARCHAR) + ', ' + CAST(@Year2 AS VARCHAR) + ', ' + CAST(@Year1 AS VARCHAR);

        -- Add VFREQGEN column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1
            FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
            AND TABLE_NAME = @TableName
            AND COLUMN_NAME = 'VFREQGEN'
        )
        BEGIN
            SET @SQL = 'ALTER TABLE FAJITA.dbo.[' + @TableName + '] ADD VFREQGEN INTEGER NULL';
            EXEC sp_executesql @SQL;
            PRINT 'Added VFREQGEN column to table ' + @TableName;
        END

        -- Add VFREQPR column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1
            FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
            AND TABLE_NAME = @TableName
            AND COLUMN_NAME = 'VFREQPR'
        )
        BEGIN
            SET @SQL = 'ALTER TABLE FAJITA.dbo.[' + @TableName + '] ADD VFREQPR INTEGER NULL';
            EXEC sp_executesql @SQL;
            PRINT 'Added VFREQPR column to table ' + @TableName;
        END

        -- Build VFREQGEN calculation string (COUNT occurrences, not SUM)
        -- Handle non-numeric values like 'NA' by using TRY_CAST
        SET @VFREQGENCalc = '0';

        IF EXISTS (SELECT 1 FROM FAJITA.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @TableName AND COLUMN_NAME = 'VH' + @Year4_2Digit + 'G')
        BEGIN
            SET @VFREQGENCalc = @VFREQGENCalc + ' + CASE WHEN [VH' + @Year4_2Digit + 'G] IS NOT NULL AND TRY_CAST([VH' + @Year4_2Digit + 'G] AS INT) IS NOT NULL AND TRY_CAST([VH' + @Year4_2Digit + 'G] AS INT) != 0 THEN 1 ELSE 0 END';
            SET @ColumnsUsed = @ColumnsUsed + 'VH' + @Year4_2Digit + 'G, ';
        END

        IF EXISTS (SELECT 1 FROM FAJITA.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @TableName AND COLUMN_NAME = 'VH' + @Year3_2Digit + 'G')
        BEGIN
            SET @VFREQGENCalc = @VFREQGENCalc + ' + CASE WHEN [VH' + @Year3_2Digit + 'G] IS NOT NULL AND TRY_CAST([VH' + @Year3_2Digit + 'G] AS INT) IS NOT NULL AND TRY_CAST([VH' + @Year3_2Digit + 'G] AS INT) != 0 THEN 1 ELSE 0 END';
            SET @ColumnsUsed = @ColumnsUsed + 'VH' + @Year3_2Digit + 'G, ';
        END

        IF EXISTS (SELECT 1 FROM FAJITA.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @TableName AND COLUMN_NAME = 'VH' + @Year2_2Digit + 'G')
        BEGIN
            SET @VFREQGENCalc = @VFREQGENCalc + ' + CASE WHEN [VH' + @Year2_2Digit + 'G] IS NOT NULL AND TRY_CAST([VH' + @Year2_2Digit + 'G] AS INT) IS NOT NULL AND TRY_CAST([VH' + @Year2_2Digit + 'G] AS INT) != 0 THEN 1 ELSE 0 END';
            SET @ColumnsUsed = @ColumnsUsed + 'VH' + @Year2_2Digit + 'G, ';
        END

        IF EXISTS (SELECT 1 FROM FAJITA.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @TableName AND COLUMN_NAME = 'VH' + @Year1_2Digit + 'G')
        BEGIN
            SET @VFREQGENCalc = @VFREQGENCalc + ' + CASE WHEN [VH' + @Year1_2Digit + 'G] IS NOT NULL AND TRY_CAST([VH' + @Year1_2Digit + 'G] AS INT) IS NOT NULL AND TRY_CAST([VH' + @Year1_2Digit + 'G] AS INT) != 0 THEN 1 ELSE 0 END';
            SET @ColumnsUsed = @ColumnsUsed + 'VH' + @Year1_2Digit + 'G, ';
        END

        -- Build VFREQPR calculation string (COUNT occurrences, not SUM)
        -- Handle non-numeric values like 'NA' by using TRY_CAST
        SET @VFREQPRCalc = '0';

        IF EXISTS (SELECT 1 FROM FAJITA.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @TableName AND COLUMN_NAME = 'VH' + @Year4_2Digit + 'P')
        BEGIN
            SET @VFREQPRCalc = @VFREQPRCalc + ' + CASE WHEN [VH' + @Year4_2Digit + 'P] IS NOT NULL AND TRY_CAST([VH' + @Year4_2Digit + 'P] AS INT) IS NOT NULL AND TRY_CAST([VH' + @Year4_2Digit + 'P] AS INT) != 0 THEN 1 ELSE 0 END';
            SET @ColumnsUsed = @ColumnsUsed + 'VH' + @Year4_2Digit + 'P, ';
        END

        IF EXISTS (SELECT 1 FROM FAJITA.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @TableName AND COLUMN_NAME = 'VH' + @Year3_2Digit + 'P')
        BEGIN
            SET @VFREQPRCalc = @VFREQPRCalc + ' + CASE WHEN [VH' + @Year3_2Digit + 'P] IS NOT NULL AND TRY_CAST([VH' + @Year3_2Digit + 'P] AS INT) IS NOT NULL AND TRY_CAST([VH' + @Year3_2Digit + 'P] AS INT) != 0 THEN 1 ELSE 0 END';
            SET @ColumnsUsed = @ColumnsUsed + 'VH' + @Year3_2Digit + 'P, ';
        END

        IF EXISTS (SELECT 1 FROM FAJITA.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @TableName AND COLUMN_NAME = 'VH' + @Year2_2Digit + 'P')
        BEGIN
            SET @VFREQPRCalc = @VFREQPRCalc + ' + CASE WHEN [VH' + @Year2_2Digit + 'P] IS NOT NULL AND TRY_CAST([VH' + @Year2_2Digit + 'P] AS INT) IS NOT NULL AND TRY_CAST([VH' + @Year2_2Digit + 'P] AS INT) != 0 THEN 1 ELSE 0 END';
            SET @ColumnsUsed = @ColumnsUsed + 'VH' + @Year2_2Digit + 'P, ';
        END

        IF EXISTS (SELECT 1 FROM FAJITA.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @TableName AND COLUMN_NAME = 'VH' + @Year1_2Digit + 'P')
        BEGIN
            SET @VFREQPRCalc = @VFREQPRCalc + ' + CASE WHEN [VH' + @Year1_2Digit + 'P] IS NOT NULL AND TRY_CAST([VH' + @Year1_2Digit + 'P] AS INT) IS NOT NULL AND TRY_CAST([VH' + @Year1_2Digit + 'P] AS INT) != 0 THEN 1 ELSE 0 END';
            SET @ColumnsUsed = @ColumnsUsed + 'VH' + @Year1_2Digit + 'P, ';
        END

        -- Remove trailing comma and space from @ColumnsUsed
        IF LEN(@ColumnsUsed) > 0
            SET @ColumnsUsed = LEFT(@ColumnsUsed, LEN(@ColumnsUsed) - 2);

        -- Build final UPDATE SQL
        SET @SQL = '
        UPDATE FAJITA.dbo.[' + @TableName + ']
        SET
            VFREQGEN = ' + @VFREQGENCalc + ',
            VFREQPR = ' + @VFREQPRCalc;

        EXEC sp_executesql @SQL;

        -- Get count of updated rows
        SET @SQL = 'SELECT @Count = COUNT(*) FROM FAJITA.dbo.[' + @TableName + ']';
        EXEC sp_executesql @SQL, N'@Count INT OUTPUT', @Count = @RowsUpdated OUTPUT;

        PRINT 'VFREQGEN and VFREQPR columns updated for ' + CAST(@RowsUpdated AS VARCHAR(10)) + ' rows using columns: ' + @ColumnsUsed;

        -- Return result for application
        SELECT
            @TableName as TableName,
            @RowsUpdated as RowsUpdated,
            @Year4 as OldestYear,
            @Year3 as Year3,
            @Year2 as Year2,
            @Year1 as NewestYear,
            @ColumnsUsed as ColumnsUsed,
            'VFREQGEN and VFREQPR columns created and calculated successfully by counting occurrences (non-zero values)' as Message;

    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO
