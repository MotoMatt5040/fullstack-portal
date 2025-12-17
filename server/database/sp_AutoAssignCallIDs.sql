/*
  Stored Procedure: sp_AutoAssignCallIDs

  Description: Automatically assigns up to 4 CallIDs to a project based on the most common
               area codes found in the sample data. Uses appropriate phone column based on
               client type (PHONE for Tarrance, LAND/CELL otherwise).

               For non-Tarrance clients, combines LAND and CELL columns to get all phone
               numbers without duplicates for area code analysis.

  Parameters:
    @TableName NVARCHAR(128) - The sample table name to analyze
    @ProjectID INT - The project ID to assign CallIDs to
    @ClientID INT - The client ID (102 = Tarrance uses PHONE column)

  Returns:
    Result set with assignment details and area codes found

  Notes:
    - Tarrance (ClientID = 102) uses PHONE column
    - Other clients use LAND and CELL columns combined (union without duplicates)
    - Falls back to PHONE if LAND/CELL don't exist
    - Dates are now retrieved from the Projects table, not stored in CallIDUsage
*/
CREATE OR ALTER PROCEDURE [dbo].[sp_AutoAssignCallIDs]
    @TableName NVARCHAR(128),
    @ProjectID INT,
    @ClientID INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @SQL NVARCHAR(MAX)
    DECLARE @StartDate DATE
    DECLARE @EndDate DATE
    DECLARE @ProjectName NVARCHAR(255)
    DECLARE @UsePhoneColumn BIT = 0
    DECLARE @HasLand BIT = 0
    DECLARE @HasCell BIT = 0
    DECLARE @HasPhone BIT = 0
    DECLARE @ErrorMessage NVARCHAR(500)

    -- Create temp tables for results
    CREATE TABLE #AreaCodes (
        AreaCode CHAR(3),
        Count INT,
        Priority INT IDENTITY(1,1)
    )

    CREATE TABLE #AvailableCallIDs (
        PhoneNumberID INT,
        PhoneNumber NVARCHAR(10),
        CallerName NVARCHAR(25),
        StateFIPS CHAR(2),
        StateAbbr CHAR(2),
        AreaCode CHAR(3),
        Priority INT
    )

    CREATE TABLE #Assignments (
        SlotName NVARCHAR(10),
        PhoneNumberID INT,
        PhoneNumber NVARCHAR(10),
        AreaCode CHAR(3),
        StateAbbr CHAR(2)
    )

    BEGIN TRY
        -- Step 1: Get project details (clientID passed as parameter)
        SELECT
            @ProjectName = projectName,
            @StartDate = ISNULL(startDate, CAST(GETDATE() AS DATE)),
            @EndDate = ISNULL(endDate, DATEADD(DAY, 30, GETDATE()))
        FROM FAJITA.dbo.Projects
        WHERE projectID = @ProjectID

        IF @ProjectName IS NULL
        BEGIN
            SET @ErrorMessage = 'Project ' + CAST(@ProjectID AS NVARCHAR(20)) + ' not found in Projects table'
            RAISERROR(@ErrorMessage, 16, 1)
            RETURN
        END

        -- Determine if we should use PHONE column based on clientID (passed as parameter)
        -- Tarrance (ClientID = 102) uses PHONE column
        IF @ClientID = 102
            SET @UsePhoneColumn = 1

        -- Step 2: Check which phone columns exist
        SELECT
            @HasLand = SUM(CASE WHEN COLUMN_NAME = 'LAND' THEN 1 ELSE 0 END),
            @HasCell = SUM(CASE WHEN COLUMN_NAME = 'CELL' THEN 1 ELSE 0 END),
            @HasPhone = SUM(CASE WHEN COLUMN_NAME = 'PHONE' THEN 1 ELSE 0 END)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @TableName

        -- Validate we have at least one phone column
        IF @UsePhoneColumn = 1 AND @HasPhone = 0
        BEGIN
            SET @ErrorMessage = 'PHONE column not found in table ' + @TableName
            RAISERROR(@ErrorMessage, 16, 1)
            RETURN
        END

        IF @UsePhoneColumn = 0 AND @HasLand = 0 AND @HasCell = 0
        BEGIN
            -- Fallback to PHONE if no LAND/CELL
            IF @HasPhone = 1
            BEGIN
                SET @UsePhoneColumn = 1  -- Use PHONE column as fallback
            END
            ELSE
            BEGIN
                SET @ErrorMessage = 'No LAND, CELL, or PHONE columns found in table ' + @TableName
                RAISERROR(@ErrorMessage, 16, 1)
                RETURN
            END
        END

        -- Step 3: Extract top 10 area codes
        IF @UsePhoneColumn = 1
        BEGIN
            -- Use PHONE column (Tarrance or fallback)
            SET @SQL = '
                INSERT INTO #AreaCodes (AreaCode, Count)
                SELECT TOP 10
                    LEFT(PHONE, 3) as AreaCode,
                    COUNT(*) as Count
                FROM FAJITA.dbo.[' + @TableName + ']
                WHERE PHONE IS NOT NULL
                    AND LEN(PHONE) >= 10
                    AND LEFT(PHONE, 1) NOT IN (''0'', ''1'')
                    AND LEN(LEFT(PHONE, 3)) = 3
                GROUP BY LEFT(PHONE, 3)
                ORDER BY COUNT(*) DESC'
        END
        ELSE
        BEGIN
            -- Use LAND and/or CELL columns combined (UNION to avoid duplicates)
            -- This ensures we get all unique phone numbers from both columns for area code analysis
            SET @SQL = '
                INSERT INTO #AreaCodes (AreaCode, Count)
                SELECT TOP 10 LEFT(PhoneNumber, 3) as AreaCode, COUNT(*) as Count
                FROM (
                    -- Get all unique phone numbers from LAND and CELL columns
                    SELECT DISTINCT PhoneNumber
                    FROM ('

            IF @HasLand = 1
            BEGIN
                SET @SQL = @SQL + '
                        SELECT LAND as PhoneNumber
                        FROM FAJITA.dbo.[' + @TableName + ']
                        WHERE LAND IS NOT NULL
                            AND LEN(LAND) >= 10
                            AND LEFT(LAND, 1) NOT IN (''0'', ''1'')'

                IF @HasCell = 1
                    SET @SQL = @SQL + '
                        UNION
                        '
            END

            IF @HasCell = 1
            BEGIN
                SET @SQL = @SQL + '
                        SELECT CELL as PhoneNumber
                        FROM FAJITA.dbo.[' + @TableName + ']
                        WHERE CELL IS NOT NULL
                            AND LEN(CELL) >= 10
                            AND LEFT(CELL, 1) NOT IN (''0'', ''1'')'
            END

            SET @SQL = @SQL + '
                    ) AS AllPhones
                ) AS UniquePhones
                WHERE LEN(LEFT(PhoneNumber, 3)) = 3
                GROUP BY LEFT(PhoneNumber, 3)
                ORDER BY COUNT(*) DESC'
        END

        EXEC sp_executesql @SQL

        -- Check if any area codes were found
        IF NOT EXISTS (SELECT 1 FROM #AreaCodes)
        BEGIN
            SELECT
                0 as Success,
                'No valid area codes found in sample data' as Message,
                @ProjectID as ProjectID,
                @ProjectName as ProjectName,
                @StartDate as StartDate,
                @EndDate as EndDate

            SELECT AreaCode, Count FROM #AreaCodes ORDER BY Priority
            SELECT SlotName, PhoneNumberID, PhoneNumber, AreaCode, StateAbbr FROM #Assignments
            RETURN
        END

        -- Step 4: Find CallIDs matching area codes (prioritized by frequency)
        -- CallIDs can be assigned to multiple projects simultaneously
        INSERT INTO #AvailableCallIDs (PhoneNumberID, PhoneNumber, CallerName, StateFIPS, StateAbbr, AreaCode, Priority)
        SELECT TOP 4
            c.PhoneNumberID,
            c.PhoneNumber,
            c.CallerName,
            c.StateFIPS,
            s.StateAbbr,
            LEFT(c.PhoneNumber, 3) as AreaCode,
            ac.Priority
        FROM FAJITA.dbo.CallIDs c
        INNER JOIN FAJITA.dbo.States s ON c.StateFIPS = s.StateFIPS
        INNER JOIN #AreaCodes ac ON LEFT(c.PhoneNumber, 3) = ac.AreaCode
        WHERE c.Status IN (1, 2)  -- Available or In Use (CallIDs can be shared across projects)
        ORDER BY ac.Priority, c.PhoneNumber

        -- Check if any CallIDs were found
        IF NOT EXISTS (SELECT 1 FROM #AvailableCallIDs)
        BEGIN
            SELECT
                0 as Success,
                'No CallIDs found matching the sample area codes' as Message,
                @ProjectID as ProjectID,
                @ProjectName as ProjectName,
                @StartDate as StartDate,
                @EndDate as EndDate

            SELECT AreaCode, Count FROM #AreaCodes ORDER BY Priority
            SELECT SlotName, PhoneNumberID, PhoneNumber, AreaCode, StateAbbr FROM #Assignments
            RETURN
        END

        -- Step 5: Assign CallIDs to slots
        DECLARE @L1 INT, @L2 INT, @C1 INT, @C2 INT
        DECLARE @Slot1Phone NVARCHAR(10), @Slot2Phone NVARCHAR(10), @Slot3Phone NVARCHAR(10), @Slot4Phone NVARCHAR(10)
        DECLARE @Slot1Area CHAR(3), @Slot2Area CHAR(3), @Slot3Area CHAR(3), @Slot4Area CHAR(3)
        DECLARE @Slot1State CHAR(2), @Slot2State CHAR(2), @Slot3State CHAR(2), @Slot4State CHAR(2)

        -- Get the 4 CallIDs in priority order
        SELECT
            @L1 = MAX(CASE WHEN rn = 1 THEN PhoneNumberID END),
            @Slot1Phone = MAX(CASE WHEN rn = 1 THEN PhoneNumber END),
            @Slot1Area = MAX(CASE WHEN rn = 1 THEN AreaCode END),
            @Slot1State = MAX(CASE WHEN rn = 1 THEN StateAbbr END),

            @L2 = MAX(CASE WHEN rn = 2 THEN PhoneNumberID END),
            @Slot2Phone = MAX(CASE WHEN rn = 2 THEN PhoneNumber END),
            @Slot2Area = MAX(CASE WHEN rn = 2 THEN AreaCode END),
            @Slot2State = MAX(CASE WHEN rn = 2 THEN StateAbbr END),

            @C1 = MAX(CASE WHEN rn = 3 THEN PhoneNumberID END),
            @Slot3Phone = MAX(CASE WHEN rn = 3 THEN PhoneNumber END),
            @Slot3Area = MAX(CASE WHEN rn = 3 THEN AreaCode END),
            @Slot3State = MAX(CASE WHEN rn = 3 THEN StateAbbr END),

            @C2 = MAX(CASE WHEN rn = 4 THEN PhoneNumberID END),
            @Slot4Phone = MAX(CASE WHEN rn = 4 THEN PhoneNumber END),
            @Slot4Area = MAX(CASE WHEN rn = 4 THEN AreaCode END),
            @Slot4State = MAX(CASE WHEN rn = 4 THEN StateAbbr END)
        FROM (
            SELECT *, ROW_NUMBER() OVER (ORDER BY Priority, PhoneNumber) as rn
            FROM #AvailableCallIDs
        ) x

        -- Record assignments
        IF @L1 IS NOT NULL INSERT INTO #Assignments VALUES ('L1', @L1, @Slot1Phone, @Slot1Area, @Slot1State)
        IF @L2 IS NOT NULL INSERT INTO #Assignments VALUES ('L2', @L2, @Slot2Phone, @Slot2Area, @Slot2State)
        IF @C1 IS NOT NULL INSERT INTO #Assignments VALUES ('C1', @C1, @Slot3Phone, @Slot3Area, @Slot3State)
        IF @C2 IS NOT NULL INSERT INTO #Assignments VALUES ('C2', @C2, @Slot4Phone, @Slot4Area, @Slot4State)

        -- Step 6: Insert or Update CallIDUsage (dates are now in Projects table, not CallIDUsage)
        IF EXISTS (SELECT 1 FROM FAJITA.dbo.CallIDUsage WHERE ProjectID = @ProjectID)
        BEGIN
            -- Update existing row
            UPDATE FAJITA.dbo.CallIDUsage
            SET CallIDL1 = ISNULL(@L1, CallIDL1),
                CallIDL2 = ISNULL(@L2, CallIDL2),
                CallIDC1 = ISNULL(@C1, CallIDC1),
                CallIDC2 = ISNULL(@C2, CallIDC2)
            WHERE ProjectID = @ProjectID
        END
        ELSE
        BEGIN
            -- Insert new row (no StartDate/EndDate - dates are in Projects table)
            INSERT INTO FAJITA.dbo.CallIDUsage (ProjectID, CallIDL1, CallIDL2, CallIDC1, CallIDC2)
            VALUES (@ProjectID, @L1, @L2, @C1, @C2)
        END

        -- Step 7: Update CallID status to In Use (2) - only if currently Available (1)
        UPDATE FAJITA.dbo.CallIDs
        SET Status = 2, DateUpdated = GETDATE()
        WHERE PhoneNumberID IN (@L1, @L2, @C1, @C2)
            AND PhoneNumberID IS NOT NULL
            AND Status = 1

        -- Step 8: Update the sample table's CallID columns with actual phone numbers
        SET @SQL = 'UPDATE FAJITA.dbo.[' + @TableName + '] SET '

        -- Build SET clause dynamically based on which CallIDs were assigned
        -- Use comma prefix approach to avoid trailing comma issues
        DECLARE @SetClauses NVARCHAR(MAX) = ''

        IF @Slot1Phone IS NOT NULL
            SET @SetClauses = 'CALLIDL1 = ''' + @Slot1Phone + ''''
        IF @Slot2Phone IS NOT NULL
            SET @SetClauses = @SetClauses + CASE WHEN LEN(@SetClauses) > 0 THEN ', ' ELSE '' END + 'CALLIDL2 = ''' + @Slot2Phone + ''''
        IF @Slot3Phone IS NOT NULL
            SET @SetClauses = @SetClauses + CASE WHEN LEN(@SetClauses) > 0 THEN ', ' ELSE '' END + 'CALLIDC1 = ''' + @Slot3Phone + ''''
        IF @Slot4Phone IS NOT NULL
            SET @SetClauses = @SetClauses + CASE WHEN LEN(@SetClauses) > 0 THEN ', ' ELSE '' END + 'CALLIDC2 = ''' + @Slot4Phone + ''''

        -- Only execute if we have something to update
        IF LEN(@SetClauses) > 0
        BEGIN
            SET @SQL = @SQL + @SetClauses
            PRINT 'Executing: ' + @SQL
            EXEC sp_executesql @SQL
        END

        -- Return success result
        DECLARE @AssignedCount INT = (SELECT COUNT(*) FROM #Assignments)
        DECLARE @Warning NVARCHAR(200) = NULL

        IF @AssignedCount < 4
            SET @Warning = 'Only ' + CAST(@AssignedCount AS NVARCHAR(10)) + ' CallIDs available (4 requested). Some slots may be empty.'

        SELECT
            1 as Success,
            'Successfully assigned ' + CAST(@AssignedCount AS NVARCHAR(10)) + ' CallIDs to project ' + CAST(@ProjectID AS NVARCHAR(20)) as Message,
            @ProjectID as ProjectID,
            @ProjectName as ProjectName,
            @StartDate as StartDate,
            @EndDate as EndDate,
            @Warning as Warning

        -- Return area codes
        SELECT AreaCode, Count FROM #AreaCodes ORDER BY Priority

        -- Return assignments
        SELECT SlotName, PhoneNumberID, PhoneNumber, AreaCode, StateAbbr FROM #Assignments ORDER BY SlotName

    END TRY
    BEGIN CATCH
        SELECT
            0 as Success,
            ERROR_MESSAGE() as Message,
            @ProjectID as ProjectID,
            @ProjectName as ProjectName,
            NULL as StartDate,
            NULL as EndDate,
            NULL as Warning

        SELECT AreaCode, Count FROM #AreaCodes ORDER BY Priority
        SELECT SlotName, PhoneNumberID, PhoneNumber, AreaCode, StateAbbr FROM #Assignments
    END CATCH

    -- Cleanup
    DROP TABLE IF EXISTS #AreaCodes
    DROP TABLE IF EXISTS #AvailableCallIDs
    DROP TABLE IF EXISTS #Assignments
END
GO
