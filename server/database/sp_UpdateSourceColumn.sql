USE [FAJITA]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_UpdateSourceColumn]
    @TableName NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @SQL NVARCHAR(MAX)
    DECLARE @RowsUpdated INT = 0
    DECLARE @LandOnlyCount INT = 0
    DECLARE @CellOnlyCount INT = 0
    DECLARE @BothCount INT = 0

    BEGIN TRY
        PRINT 'Updating SOURCE column in table: ' + @TableName

        -- Check if SOURCE column exists, if not add it
        IF NOT EXISTS (
            SELECT 1 FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo'
            AND TABLE_NAME = @TableName
            AND COLUMN_NAME = 'SOURCE'
        )
        BEGIN
            SET @SQL = 'ALTER TABLE FAJITA.dbo.' + QUOTENAME(@TableName) + ' ADD SOURCE INT DEFAULT 1'
            EXEC sp_executesql @SQL
        END

        -- Update SOURCE based on LAND and CELL values:
        -- SOURCE = 1: Has LAND but no CELL (landline only)
        -- SOURCE = 2: Has CELL but no LAND (cell only)
        -- SOURCE = 3: Has both LAND and CELL
        SET @SQL = N'
        UPDATE FAJITA.dbo.' + QUOTENAME(@TableName) + N'
        SET SOURCE = CASE
            -- Has LAND but CELL is blank/null -> Landline only
            WHEN (LAND IS NOT NULL AND LTRIM(RTRIM(LAND)) <> N'''' AND LEN(LTRIM(RTRIM(LAND))) > 0)
                 AND (CELL IS NULL OR LTRIM(RTRIM(CELL)) = N'''' OR LEN(LTRIM(RTRIM(CELL))) = 0)
                THEN 1
            -- Has CELL but LAND is blank/null -> Cell only
            WHEN (CELL IS NOT NULL AND LTRIM(RTRIM(CELL)) <> N'''' AND LEN(LTRIM(RTRIM(CELL))) > 0)
                 AND (LAND IS NULL OR LTRIM(RTRIM(LAND)) = N'''' OR LEN(LTRIM(RTRIM(LAND))) = 0)
                THEN 2
            -- Has both LAND and CELL -> Both
            WHEN (LAND IS NOT NULL AND LTRIM(RTRIM(LAND)) <> N'''' AND LEN(LTRIM(RTRIM(LAND))) > 0)
                 AND (CELL IS NOT NULL AND LTRIM(RTRIM(CELL)) <> N'''' AND LEN(LTRIM(RTRIM(CELL))) > 0)
                THEN 3
            -- Default to 1 if neither has valid data (shouldn''t happen but fallback)
            ELSE 1
        END'

        EXEC sp_executesql @SQL
        SET @RowsUpdated = @@ROWCOUNT

        -- Get counts for each SOURCE value
        SET @SQL = N'SELECT @LandOut = COUNT(*) FROM FAJITA.dbo.' + QUOTENAME(@TableName) + N' WHERE SOURCE = 1'
        EXEC sp_executesql @SQL, N'@LandOut INT OUTPUT', @LandOut = @LandOnlyCount OUTPUT

        SET @SQL = N'SELECT @CellOut = COUNT(*) FROM FAJITA.dbo.' + QUOTENAME(@TableName) + N' WHERE SOURCE = 2'
        EXEC sp_executesql @SQL, N'@CellOut INT OUTPUT', @CellOut = @CellOnlyCount OUTPUT

        SET @SQL = N'SELECT @BothOut = COUNT(*) FROM FAJITA.dbo.' + QUOTENAME(@TableName) + N' WHERE SOURCE = 3'
        EXEC sp_executesql @SQL, N'@BothOut INT OUTPUT', @BothOut = @BothCount OUTPUT

        PRINT 'SOURCE column updated:'
        PRINT '  - Landline only (SOURCE=1): ' + CAST(@LandOnlyCount AS VARCHAR(10))
        PRINT '  - Cell only (SOURCE=2): ' + CAST(@CellOnlyCount AS VARCHAR(10))
        PRINT '  - Both (SOURCE=3): ' + CAST(@BothCount AS VARCHAR(10))

        -- Return results
        SELECT
            'SUCCESS' as Status,
            @TableName as TableName,
            @RowsUpdated as RowsUpdated,
            @LandOnlyCount as LandlineOnlyCount,
            @CellOnlyCount as CellOnlyCount,
            @BothCount as BothCount,
            'SOURCE column updated: ' + CAST(@LandOnlyCount AS VARCHAR(10)) + ' landline only, ' +
            CAST(@CellOnlyCount AS VARCHAR(10)) + ' cell only, ' +
            CAST(@BothCount AS VARCHAR(10)) + ' both' as Message

    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE()
        DECLARE @ErrorLine INT = ERROR_LINE()

        SELECT
            'ERROR' as Status,
            @TableName as TableName,
            0 as RowsUpdated,
            0 as LandlineOnlyCount,
            0 as CellOnlyCount,
            0 as BothCount,
            'Error at line ' + CAST(@ErrorLine AS NVARCHAR(10)) + ': ' + @ErrorMessage as Message

        RAISERROR (@ErrorMessage, 16, 1)
    END CATCH
END
GO
