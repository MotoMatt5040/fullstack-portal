USE [FAJITA]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_FormatRDateColumn]
    @TableName NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @SQL NVARCHAR(MAX);
    DECLARE @RowsUpdated INT = 0;
    DECLARE @ColumnExists INT = 0;
    DECLARE @DataType NVARCHAR(128);

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

        -- Check if RDATE column exists and get its data type
        SELECT @ColumnExists = COUNT(*),
               @DataType = MAX(DATA_TYPE)
        FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = @TableName
        AND COLUMN_NAME = 'RDATE'

        IF @ColumnExists = 0
        BEGIN
            SELECT
                'SKIPPED' as Status,
                @TableName as TableName,
                0 as RowsUpdated,
                'RDATE column does not exist in table' as Message
            RETURN
        END

        PRINT 'RDATE column exists with type: ' + ISNULL(@DataType, 'unknown')
        PRINT 'Converting RDATE from mm/d/yyyy 0:00 format to yyyymmdd format...'

        -- Convert RDATE from mm/d/yyyy 0:00 to yyyymmdd
        -- Handle various date formats that might exist
        SET @SQL = '
        UPDATE FAJITA.dbo.[' + @TableName + ']
        SET RDATE =
            CASE
                -- If already in yyyymmdd format (8 digits, no slashes), leave it
                WHEN RDATE LIKE ''[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]''
                    AND RDATE NOT LIKE ''%/%''
                    AND RDATE NOT LIKE ''% %''
                    THEN RDATE

                -- If in mm/d/yyyy or mm/dd/yyyy format, convert it
                WHEN RDATE LIKE ''%/%''
                    THEN FORMAT(
                        TRY_CAST(
                            SUBSTRING(RDATE, 1, CHARINDEX('' '', RDATE + '' '') - 1)
                            AS DATE
                        ),
                        ''yyyyMMdd''
                    )

                -- If NULL or empty, leave as is
                ELSE RDATE
            END
        WHERE RDATE IS NOT NULL
        AND RDATE != ''''
        AND (
            -- Only update if it needs conversion (has slashes or spaces)
            RDATE LIKE ''%/%''
            OR RDATE LIKE ''% %''
        )';

        EXEC sp_executesql @SQL
        SET @RowsUpdated = @@ROWCOUNT

        PRINT 'RDATE format conversion complete for ' + CAST(@RowsUpdated AS VARCHAR(10)) + ' rows'

        -- Return results
        SELECT
            'SUCCESS' as Status,
            @TableName as TableName,
            @RowsUpdated as RowsUpdated,
            'RDATE column formatted successfully (mm/d/yyyy -> yyyymmdd) for ' + CAST(@RowsUpdated AS VARCHAR(10)) + ' rows' as Message

    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorLine INT = ERROR_LINE();

        SELECT
            'ERROR' as Status,
            @TableName as TableName,
            0 as RowsUpdated,
            'Error at line ' + CAST(@ErrorLine AS NVARCHAR(10)) + ': ' + @ErrorMessage as Message

        RAISERROR (@ErrorMessage, 16, 1)
    END CATCH
END
GO
