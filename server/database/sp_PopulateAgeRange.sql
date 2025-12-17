USE [FAJITA]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_PopulateAgeRange]
    @TableName NVARCHAR(128)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @SQL NVARCHAR(MAX)
    DECLARE @TotalWithIAge INT = 0
    DECLARE @RecordsWithAgeRange INT = 0
    DECLARE @RecordsWithoutAgeRange INT = 0
    DECLARE @AgeRangeColumnExists INT = 0
    DECLARE @IAgeColumnExists INT = 0

    BEGIN TRY
        -- Check if IAGE column exists
        SELECT @IAgeColumnExists = COUNT(*)
        FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = @TableName
        AND COLUMN_NAME = 'IAGE'

        IF @IAgeColumnExists = 0
        BEGIN
            SELECT
                'SKIPPED' as Status,
                @TableName as TableName,
                0 as TotalWithIAge,
                0 as RecordsWithAgeRange,
                0 as RecordsWithoutAgeRange,
                'IAGE column does not exist in table' as Message
            RETURN
        END

        -- Check if AGERANGE column exists, if not create it
        SELECT @AgeRangeColumnExists = COUNT(*)
        FROM FAJITA.INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = @TableName
        AND COLUMN_NAME = 'AGERANGE'

        IF @AgeRangeColumnExists = 0
        BEGIN
            SET @SQL = 'ALTER TABLE FAJITA.dbo.' + QUOTENAME(@TableName) + ' ADD AGERANGE INT NULL'
            EXEC sp_executesql @SQL
            PRINT 'Created AGERANGE column'
        END

        -- Get count of records with IAGE
        SET @SQL = 'SELECT @Count = COUNT(*) FROM FAJITA.dbo.' + QUOTENAME(@TableName) + ' WHERE IAGE IS NOT NULL'
        EXEC sp_executesql @SQL, N'@Count INT OUTPUT', @Count = @TotalWithIAge OUTPUT

        -- Populate AGERANGE using CASE statement based on standard age ranges
        SET @SQL = '
        UPDATE FAJITA.dbo.' + QUOTENAME(@TableName) + '
        SET AGERANGE = CASE
            WHEN TRY_CAST(IAGE AS INT) BETWEEN 18 AND 24 THEN 1
            WHEN TRY_CAST(IAGE AS INT) BETWEEN 25 AND 29 THEN 2
            WHEN TRY_CAST(IAGE AS INT) BETWEEN 30 AND 34 THEN 3
            WHEN TRY_CAST(IAGE AS INT) BETWEEN 35 AND 39 THEN 4
            WHEN TRY_CAST(IAGE AS INT) BETWEEN 40 AND 44 THEN 5
            WHEN TRY_CAST(IAGE AS INT) BETWEEN 45 AND 49 THEN 6
            WHEN TRY_CAST(IAGE AS INT) BETWEEN 50 AND 54 THEN 7
            WHEN TRY_CAST(IAGE AS INT) BETWEEN 55 AND 59 THEN 8
            WHEN TRY_CAST(IAGE AS INT) BETWEEN 60 AND 64 THEN 9
            WHEN TRY_CAST(IAGE AS INT) BETWEEN 65 AND 69 THEN 10
            WHEN TRY_CAST(IAGE AS INT) BETWEEN 70 AND 74 THEN 11
            WHEN TRY_CAST(IAGE AS INT) BETWEEN 75 AND 79 THEN 12
            WHEN TRY_CAST(IAGE AS INT) BETWEEN 80 AND 84 THEN 13
            WHEN TRY_CAST(IAGE AS INT) >= 85 THEN 14
            ELSE NULL
        END
        WHERE IAGE IS NOT NULL
        AND IAGE != ''''
        '

        EXEC sp_executesql @SQL

        PRINT 'Populated AGERANGE using standard age range mapping'

        -- Get counts after population
        SET @SQL = 'SELECT @WithRange = COUNT(*) FROM FAJITA.dbo.' + QUOTENAME(@TableName) + ' WHERE AGERANGE IS NOT NULL'
        EXEC sp_executesql @SQL, N'@WithRange INT OUTPUT', @WithRange = @RecordsWithAgeRange OUTPUT

        SET @SQL = 'SELECT @WithoutRange = COUNT(*) FROM FAJITA.dbo.' + QUOTENAME(@TableName) + ' WHERE IAGE IS NOT NULL AND AGERANGE IS NULL'
        EXEC sp_executesql @SQL, N'@WithoutRange INT OUTPUT', @WithoutRange = @RecordsWithoutAgeRange OUTPUT

        -- Return results
        SELECT
            'SUCCESS' as Status,
            @TableName as TableName,
            @TotalWithIAge as TotalWithIAge,
            @RecordsWithAgeRange as RecordsWithAgeRange,
            @RecordsWithoutAgeRange as RecordsWithoutAgeRange,
            'Successfully populated AGERANGE for ' + CAST(@RecordsWithAgeRange AS NVARCHAR(10)) + ' records (' + CAST(@RecordsWithoutAgeRange AS NVARCHAR(10)) + ' records without match)' as Message

    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE()
        DECLARE @ErrorLine INT = ERROR_LINE()

        SELECT
            'ERROR' as Status,
            @TableName as TableName,
            0 as TotalWithIAge,
            0 as RecordsWithAgeRange,
            0 as RecordsWithoutAgeRange,
            'Error at line ' + CAST(@ErrorLine AS NVARCHAR(10)) + ': ' + @ErrorMessage as Message

        RAISERROR (@ErrorMessage, 16, 1)
    END CATCH
END
GO
