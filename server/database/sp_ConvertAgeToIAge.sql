USE [FAJITA]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_ConvertAgeToIAge]
    @TableName NVARCHAR(128)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @SQL NVARCHAR(MAX)
    DECLARE @RowsUpdated INT = 0
    DECLARE @TotalRows INT = 0
    DECLARE @AgeColumnExists INT = 0
    DECLARE @IAgeColumnExists INT = 0

    BEGIN TRY
        -- Check if AGE column exists
        SELECT @AgeColumnExists = COUNT(*)
        FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = @TableName
        AND COLUMN_NAME = 'AGE'

        IF @AgeColumnExists = 0
        BEGIN
            SELECT
                'SKIPPED' as Status,
                @TableName as TableName,
                0 as RowsUpdated,
                0 as TotalRows,
                'AGE column does not exist in table' as Message
            RETURN
        END

        -- Check if IAGE column exists, if not create it
        SELECT @IAgeColumnExists = COUNT(*)
        FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = @TableName
        AND COLUMN_NAME = 'IAGE'

        IF @IAgeColumnExists = 0
        BEGIN
            SET @SQL = 'ALTER TABLE FAJITA.dbo.' + QUOTENAME(@TableName) + ' ADD IAGE NVARCHAR(2)'
            EXEC sp_executesql @SQL
            PRINT 'Created IAGE column'
        END

        -- Get total rows in table
        SET @SQL = 'SELECT @Count = COUNT(*) FROM FAJITA.dbo.' + QUOTENAME(@TableName)
        EXEC sp_executesql @SQL, N'@Count INT OUTPUT', @Count = @TotalRows OUTPUT

        -- Convert AGE to IAGE
        -- AGE is numeric, IAGE is 2-character string with leading zero for single digits
        SET @SQL = '
        UPDATE FAJITA.dbo.' + QUOTENAME(@TableName) + '
        SET IAGE = CASE
            WHEN AGE IS NULL THEN ''00''
            WHEN AGE < 0 THEN ''00''
            WHEN AGE >= 0 AND AGE <= 9 THEN ''0'' + CAST(AGE AS VARCHAR(1))
            WHEN AGE >= 10 AND AGE <= 99 THEN CAST(AGE AS VARCHAR(2))
            WHEN AGE > 99 THEN ''99''
            ELSE ''00''
        END
        WHERE AGE IS NOT NULL OR IAGE IS NULL
        '

        EXEC sp_executesql @SQL
        SET @RowsUpdated = @@ROWCOUNT

        PRINT 'Converted ' + CAST(@RowsUpdated AS NVARCHAR(10)) + ' AGE values to IAGE format'

        -- Return results
        SELECT
            'SUCCESS' as Status,
            @TableName as TableName,
            @RowsUpdated as RowsUpdated,
            @TotalRows as TotalRows,
            'Successfully converted AGE to IAGE for ' + CAST(@RowsUpdated AS NVARCHAR(10)) + ' rows' as Message

    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE()
        DECLARE @ErrorLine INT = ERROR_LINE()

        SELECT
            'ERROR' as Status,
            @TableName as TableName,
            0 as RowsUpdated,
            0 as TotalRows,
            'Error at line ' + CAST(@ErrorLine AS NVARCHAR(10)) + ': ' + @ErrorMessage as Message

        -- Use level 16, state 1 for consistent error reporting
        RAISERROR (@ErrorMessage, 16, 1)
    END CATCH
END
GO
