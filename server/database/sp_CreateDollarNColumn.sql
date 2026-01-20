USE [FAJITA]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_CreateDollarNColumn]
    @TableName NVARCHAR(255),
    @FileType NVARCHAR(10) = NULL  -- NEW: 'landline' or 'cell'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @SQL NVARCHAR(MAX);
    DECLARE @RowsUpdated INT = 0;

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

        -- Check if $N column exists, if not add it
        IF NOT EXISTS (
            SELECT 1
            FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
            AND TABLE_NAME = @TableName
            AND COLUMN_NAME = '$N'
        )
        BEGIN
            SET @SQL = 'ALTER TABLE FAJITA.dbo.[' + @TableName + '] ADD [$N] NVARCHAR(50) NULL';
            EXEC sp_executesql @SQL;
            PRINT 'Added $N column to table ' + @TableName;
        END

        -- Update $N column based on @FileType or VTYPE
        -- If @FileType is provided, use it to determine source column
        -- Otherwise fall back to VTYPE logic
        IF @FileType IS NOT NULL
        BEGIN
            PRINT 'Using FileType parameter: ' + @FileType;

            SET @SQL = '
            UPDATE FAJITA.dbo.[' + @TableName + ']
            SET [$N] = CASE
                WHEN ''' + @FileType + ''' = ''landline'' THEN LAND
                WHEN ''' + @FileType + ''' = ''cell'' THEN CELL
                ELSE NULL
            END';
        END
        ELSE
        BEGIN
            PRINT 'Using VTYPE column for $N population';

            -- Check if VTYPE column exists
            IF NOT EXISTS (
                SELECT 1
                FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = 'dbo'
                AND TABLE_NAME = @TableName
                AND COLUMN_NAME = 'VTYPE'
            )
            BEGIN
                RAISERROR('VTYPE column does not exist in table %s and no FileType parameter provided', 16, 1, @TableName);
                RETURN;
            END

            SET @SQL = '
            UPDATE FAJITA.dbo.[' + @TableName + ']
            SET [$N] = CASE
                WHEN VTYPE = 1 THEN LAND
                WHEN VTYPE = 2 THEN CELL
                ELSE NULL
            END';
        END

        EXEC sp_executesql @SQL;

        -- Get count of updated rows
        SET @SQL = 'SELECT @Count = COUNT(*) FROM FAJITA.dbo.[' + @TableName + '] WHERE [$N] IS NOT NULL';
        EXEC sp_executesql @SQL, N'@Count INT OUTPUT', @Count = @RowsUpdated OUTPUT;

        PRINT '$N column updated for ' + CAST(@RowsUpdated AS VARCHAR(10)) + ' rows in table ' + @TableName;

        -- Return result for application
        SELECT
            @TableName as TableName,
            @RowsUpdated as RowsUpdated,
            '$N column created and populated successfully' as Message;

    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO
