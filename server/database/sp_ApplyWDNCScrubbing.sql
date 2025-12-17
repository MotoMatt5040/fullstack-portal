USE [FAJITA]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [dbo].[sp_ApplyWDNCScrubbing]
    @TableName NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @SQL NVARCHAR(MAX);
    DECLARE @RowsOriginal INT;
    DECLARE @RowsAfter INT;
    DECLARE @LandlinesCleared INT;
    DECLARE @RowsRemoved INT;
    DECLARE @SourceUpdatedToCell INT;

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

        -- Get original row count
        SET @SQL = N'SELECT @Count = COUNT(*) FROM FAJITA.dbo.' + QUOTENAME(@TableName);
        EXEC sp_executesql @SQL, N'@Count INT OUTPUT', @Count = @RowsOriginal OUTPUT;

        -- Clear LAND values and update SOURCE for SOURCE = 3 records that match WDNC
        -- If they have a CELL number, change SOURCE to 2 (cell only)
        SET @SQL = N'
        UPDATE FAJITA.dbo.' + QUOTENAME(@TableName) + N'
        SET LAND = NULL,
            SOURCE = CASE
                WHEN CELL IS NOT NULL AND LTRIM(RTRIM(CELL)) <> '''' AND LEN(LTRIM(RTRIM(CELL))) > 0
                THEN 2
                ELSE SOURCE
            END
        WHERE SOURCE = 3
        AND LAND IN (SELECT PhoneNumber FROM FAJITA.dbo.DNC)';

        EXEC sp_executesql @SQL;
        SET @LandlinesCleared = @@ROWCOUNT;

        -- Count how many were changed to SOURCE = 2
        SET @SQL = N'
        SELECT @Count = COUNT(*)
        FROM FAJITA.dbo.' + QUOTENAME(@TableName) + N'
        WHERE SOURCE = 2 AND LAND IS NULL';
        EXEC sp_executesql @SQL, N'@Count INT OUTPUT', @Count = @SourceUpdatedToCell OUTPUT;

        -- Remove records where SOURCE = 1 and LAND is in WDNC
        SET @SQL = N'
        DELETE FROM FAJITA.dbo.' + QUOTENAME(@TableName) + N'
        WHERE SOURCE = 1
        AND LAND IN (SELECT PhoneNumber FROM FAJITA.dbo.DNC)';

        EXEC sp_executesql @SQL;

        -- Get final row count
        SET @SQL = N'SELECT @Count = COUNT(*) FROM FAJITA.dbo.' + QUOTENAME(@TableName);
        EXEC sp_executesql @SQL, N'@Count INT OUTPUT', @Count = @RowsAfter OUTPUT;

        SET @RowsRemoved = @RowsOriginal - @RowsAfter;

        PRINT 'WDNC scrubbing completed for table ' + @TableName;
        PRINT '  - Original records: ' + CAST(@RowsOriginal AS VARCHAR(10));
        PRINT '  - Records removed: ' + CAST(@RowsRemoved AS VARCHAR(10));
        PRINT '  - Landlines cleared: ' + CAST(@LandlinesCleared AS VARCHAR(10));
        PRINT '  - Changed to cell-only (SOURCE=2): ' + CAST(@SourceUpdatedToCell AS VARCHAR(10));
        PRINT '  - Final records: ' + CAST(@RowsAfter AS VARCHAR(10));

        -- Return results for application
        SELECT
            @TableName AS TableName,
            @RowsOriginal AS RowsOriginal,
            @RowsAfter AS RowsAfter,
            @RowsRemoved AS RowsRemoved,
            @LandlinesCleared AS LandlinesCleared,
            @SourceUpdatedToCell AS SourceUpdatedToCell,
            'WDNC scrubbing applied successfully' as Message;

    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO
