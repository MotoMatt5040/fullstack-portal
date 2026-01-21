USE [FAJITA]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_SplitIntoLandlineAndCell]
    @SourceTableName NVARCHAR(255),
    @AgeThreshold INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @SQL NVARCHAR(MAX)
    DECLARE @LandlineTableName NVARCHAR(255)
    DECLARE @CellTableName NVARCHAR(255)
    DECLARE @LandlineCount INT = 0
    DECLARE @CellCount INT = 0
    DECLARE @TotalCount INT = 0

    BEGIN TRY
        -- Generate table names
        SET @LandlineTableName = @SourceTableName + '_LANDLINE'
        SET @CellTableName = @SourceTableName + '_CELL'

        PRINT 'Starting split of table: ' + @SourceTableName
        PRINT 'Age threshold: ' + CAST(@AgeThreshold AS VARCHAR(10))
        PRINT 'Landline table: ' + @LandlineTableName
        PRINT 'Cell table: ' + @CellTableName

        -- Drop existing tables if they exist
        IF OBJECT_ID('FAJITA.dbo.' + QUOTENAME(@LandlineTableName), 'U') IS NOT NULL
        BEGIN
            SET @SQL = 'DROP TABLE FAJITA.dbo.' + QUOTENAME(@LandlineTableName)
            EXEC sp_executesql @SQL
            PRINT 'Dropped existing landline table'
        END

        IF OBJECT_ID('FAJITA.dbo.' + QUOTENAME(@CellTableName), 'U') IS NOT NULL
        BEGIN
            SET @SQL = 'DROP TABLE FAJITA.dbo.' + QUOTENAME(@CellTableName)
            EXEC sp_executesql @SQL
            PRINT 'Dropped existing cell table'
        END

        -- Get total count
        SET @SQL = 'SELECT @Count = COUNT(*) FROM FAJITA.dbo.' + QUOTENAME(@SourceTableName)
        EXEC sp_executesql @SQL, N'@Count INT OUTPUT', @Count = @TotalCount OUTPUT

        -- Create landline table: SOURCE = 1 OR (SOURCE = 3 AND AGERANGE >= threshold)
        -- These are records that HAVE a landline number
        SET @SQL = '
        SELECT *
        INTO FAJITA.dbo.' + QUOTENAME(@LandlineTableName) + '
        FROM FAJITA.dbo.' + QUOTENAME(@SourceTableName) + '
        WHERE SOURCE = 1 OR (SOURCE = 3 AND AGERANGE >= ' + CAST(@AgeThreshold AS VARCHAR(10)) + ')'

        EXEC sp_executesql @SQL
        PRINT 'Created landline table (SOURCE = 1 OR SOURCE = 3 AND AGERANGE >= ' + CAST(@AgeThreshold AS VARCHAR(10)) + ')'

        -- Clear the CELL column in the landline table (these records should only use LAND)
        SET @SQL = '
        UPDATE FAJITA.dbo.' + QUOTENAME(@LandlineTableName) + '
        SET CELL = NULL
        WHERE SOURCE = 3'
        EXEC sp_executesql @SQL
        PRINT 'Cleared CELL column for SOURCE=3 records in landline table'

        -- Get landline count
        SET @SQL = 'SELECT @Count = COUNT(*) FROM FAJITA.dbo.' + QUOTENAME(@LandlineTableName)
        EXEC sp_executesql @SQL, N'@Count INT OUTPUT', @Count = @LandlineCount OUTPUT

        -- Drop landline table if empty (no rows matched the criteria)
        IF @LandlineCount = 0
        BEGIN
            SET @SQL = 'DROP TABLE FAJITA.dbo.' + QUOTENAME(@LandlineTableName)
            EXEC sp_executesql @SQL
            SET @LandlineTableName = NULL
            PRINT 'Dropped empty landline table (0 records matched criteria)'
        END

        -- Create cell table: SOURCE = 2 OR (SOURCE = 3 AND AGERANGE < threshold)
        -- These are records that HAVE a cell number
        SET @SQL = '
        SELECT *
        INTO FAJITA.dbo.' + QUOTENAME(@CellTableName) + '
        FROM FAJITA.dbo.' + QUOTENAME(@SourceTableName) + '
        WHERE SOURCE = 2 OR (SOURCE = 3 AND AGERANGE < ' + CAST(@AgeThreshold AS VARCHAR(10)) + ')'

        EXEC sp_executesql @SQL
        PRINT 'Created cell table (SOURCE = 2 OR SOURCE = 3 AND AGERANGE < ' + CAST(@AgeThreshold AS VARCHAR(10)) + ')'

        -- Clear the LAND column in the cell table (these records should only use CELL)
        SET @SQL = '
        UPDATE FAJITA.dbo.' + QUOTENAME(@CellTableName) + '
        SET LAND = NULL
        WHERE SOURCE = 3'
        EXEC sp_executesql @SQL
        PRINT 'Cleared LAND column for SOURCE=3 records in cell table'

        -- Get cell count
        SET @SQL = 'SELECT @Count = COUNT(*) FROM FAJITA.dbo.' + QUOTENAME(@CellTableName)
        EXEC sp_executesql @SQL, N'@Count INT OUTPUT', @Count = @CellCount OUTPUT

        -- Drop cell table if empty (no rows matched the criteria)
        IF @CellCount = 0
        BEGIN
            SET @SQL = 'DROP TABLE FAJITA.dbo.' + QUOTENAME(@CellTableName)
            EXEC sp_executesql @SQL
            SET @CellTableName = NULL
            PRINT 'Dropped empty cell table (0 records matched criteria)'
        END

        -- Return results
        SELECT
            'SUCCESS' as Status,
            @SourceTableName as SourceTableName,
            @LandlineTableName as LandlineTableName,
            @CellTableName as CellTableName,
            @TotalCount as TotalRecords,
            @LandlineCount as LandlineRecords,
            @CellCount as CellRecords,
            @AgeThreshold as AgeThreshold,
            'Successfully split table into landline (' + CAST(@LandlineCount AS NVARCHAR(10)) + ' records) and cell (' + CAST(@CellCount AS NVARCHAR(10)) + ' records)' as Message

    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE()
        DECLARE @ErrorLine INT = ERROR_LINE()

        SELECT
            'ERROR' as Status,
            @SourceTableName as SourceTableName,
            NULL as LandlineTableName,
            NULL as CellTableName,
            0 as TotalRecords,
            0 as LandlineRecords,
            0 as CellRecords,
            @AgeThreshold as AgeThreshold,
            'Error at line ' + CAST(@ErrorLine AS NVARCHAR(10)) + ': ' + @ErrorMessage as Message

        RAISERROR (@ErrorMessage, 16, 1)
    END CATCH
END
GO
