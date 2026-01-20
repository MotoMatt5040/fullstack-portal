USE [FAJITA]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_CalculatePartyFromRPartyRollup]
    @TableName NVARCHAR(128)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @SQL NVARCHAR(MAX)
    DECLARE @RowsUpdated INT = 0
    DECLARE @TotalRows INT = 0
    DECLARE @ColumnExists INT = 0
    DECLARE @DataType NVARCHAR(128)

    BEGIN TRY
        -- Check if RPARTYROLLUP column exists and get its data type
        SELECT @ColumnExists = COUNT(*),
               @DataType = MAX(DATA_TYPE)
        FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = @TableName
        AND COLUMN_NAME = 'RPARTYROLLUP'

        IF @ColumnExists = 0
        BEGIN
            SELECT
                'SKIPPED' as Status,
                @TableName as TableName,
                0 as RowsUpdated,
                0 as TotalRows,
                'RPARTYROLLUP column does not exist in table' as Message
            RETURN
        END

        -- Check if PARTY column exists and get its data type
        DECLARE @PartyDataType NVARCHAR(128)
        SELECT @ColumnExists = COUNT(*),
               @PartyDataType = MAX(DATA_TYPE)
        FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = @TableName
        AND COLUMN_NAME = 'PARTY'

        IF @ColumnExists = 0
        BEGIN
            SET @SQL = 'ALTER TABLE FAJITA.dbo.' + QUOTENAME(@TableName) + ' ADD PARTY NVARCHAR(50)'
            EXEC sp_executesql @SQL
            PRINT 'Created PARTY column as NVARCHAR(50)'
        END
        ELSE
        BEGIN
            PRINT 'PARTY column already exists with type: ' + ISNULL(@PartyDataType, 'unknown')
            -- If PARTY exists but is wrong type (like bigint), drop and recreate it
            IF @PartyDataType = 'bigint' OR @PartyDataType = 'int'
            BEGIN
                PRINT 'WARNING: PARTY column is numeric type, dropping and recreating as NVARCHAR'
                SET @SQL = 'ALTER TABLE FAJITA.dbo.' + QUOTENAME(@TableName) + ' DROP COLUMN PARTY'
                EXEC sp_executesql @SQL
                SET @SQL = 'ALTER TABLE FAJITA.dbo.' + QUOTENAME(@TableName) + ' ADD PARTY NVARCHAR(50)'
                EXEC sp_executesql @SQL
                PRINT 'Recreated PARTY column as NVARCHAR(50)'
            END
        END

        -- Get total rows in table
        SET @SQL = 'SELECT @Count = COUNT(*) FROM FAJITA.dbo.' + QUOTENAME(@TableName)
        EXEC sp_executesql @SQL, N'@Count INT OUTPUT', @Count = @TotalRows OUTPUT

        -- Update PARTY based on RPARTYROLLUP mapping
        -- RPARTYROLLUP is a text column
        SET @SQL = '
        UPDATE FAJITA.dbo.' + QUOTENAME(@TableName) + '
        SET PARTY = CASE
            WHEN UPPER(LTRIM(RTRIM(RPARTYROLLUP))) = ''MODELED REPUBLICAN'' THEN ''R''
            WHEN UPPER(LTRIM(RTRIM(RPARTYROLLUP))) = ''MODELED DEMOCRAT'' THEN ''D''
            WHEN UPPER(LTRIM(RTRIM(RPARTYROLLUP))) = ''MODELED INDEPENDENT/UNAFFILIATED'' THEN ''I''
            WHEN UPPER(LTRIM(RTRIM(RPARTYROLLUP))) = ''REPUBLICAN'' THEN ''R''
            WHEN UPPER(LTRIM(RTRIM(RPARTYROLLUP))) = ''DEMOCRAT'' THEN ''D''
            WHEN UPPER(LTRIM(RTRIM(RPARTYROLLUP))) = ''INDEPENDENT/OTHER'' THEN ''I''
            WHEN UPPER(LTRIM(RTRIM(RPARTYROLLUP))) = ''UNAFFILIATED/DTS'' THEN ''U''
            WHEN UPPER(LTRIM(RTRIM(RPARTYROLLUP))) = ''N/A'' THEN ''U''
            WHEN UPPER(LTRIM(RTRIM(RPARTYROLLUP))) = ''NA'' THEN ''U''
            ELSE PARTY
        END
        WHERE RPARTYROLLUP IS NOT NULL
        AND RPARTYROLLUP != ''''
        '

        PRINT 'Executing SQL: ' + @SQL
        EXEC sp_executesql @SQL
        SET @RowsUpdated = @@ROWCOUNT

        PRINT 'Updated ' + CAST(@RowsUpdated AS NVARCHAR(10)) + ' rows with PARTY from RPARTYROLLUP'

        -- Return results
        SELECT
            'SUCCESS' as Status,
            @TableName as TableName,
            @RowsUpdated as RowsUpdated,
            @TotalRows as TotalRows,
            'Successfully calculated PARTY from RPARTYROLLUP for ' + CAST(@RowsUpdated AS NVARCHAR(10)) + ' rows (Data type: ' + ISNULL(@DataType, 'unknown') + ')' as Message

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
