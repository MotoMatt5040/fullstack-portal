// CallID Services Unit Tests
const sql = require('mssql');

// Mock the database connection module
jest.mock('../../config/dbConn');
const withDbConnection = require('../../config/dbConn');

// Import the service functions
const {
  getDashboardMetrics,
  getCurrentActiveAssignments,
  getAllCallIDs,
  getCallIDById,
  createCallID,
  updateCallID,
  deleteCallID,
  getCallIDUsageHistory,
  getProjectCallIDs,
  assignCallIDToProject,
  endAssignment,
  getUtilizationMetrics,
  getAllStatusCodes,
  getAllStates,
  updateProjectSlot,
  removeProjectSlot,
} = require('../../services/CallIDServices');

describe('CallID Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== DASHBOARD QUERIES ====================

  describe('getDashboardMetrics', () => {
    it('should return dashboard metrics with correct structure', async () => {
      const mockResult = {
        totalCallIDs: 100,
        activeProjects: 5,
        availableNumbers: 75,
        statusBreakdown: [
          { StatusDescription: 'Available', Count: 75 },
          { StatusDescription: 'In Use', Count: 25 },
        ],
        stateDistribution: [
          { StateName: 'California', StateAbbr: 'CA', Count: 30 },
          { StateName: 'Texas', StateAbbr: 'TX', Count: 20 },
        ],
      };

      withDbConnection.mockResolvedValue(mockResult);

      const result = await getDashboardMetrics();

      expect(withDbConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          database: 'caligulad',
          fnName: 'getDashboardMetrics',
          attempts: 3,
        })
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle database errors', async () => {
      withDbConnection.mockRejectedValue(new Error('Database connection failed'));

      await expect(getDashboardMetrics()).rejects.toThrow('Database connection failed');
    });
  });

  describe('getCurrentActiveAssignments', () => {
    it('should return active assignments list', async () => {
      const mockAssignments = [
        {
          ProjectID: 12345,
          SlotName: 'CallIDL1',
          SlotNumber: 1,
          PhoneNumberID: 1,
          PhoneNumber: '5551234567',
          CallerName: 'Survey Research',
          Status: 2,
          StateAbbr: 'CA',
          StartDate: '2025-01-01',
          EndDate: '2025-12-31',
          DaysActive: 20,
        },
      ];

      withDbConnection.mockResolvedValue(mockAssignments);

      const result = await getCurrentActiveAssignments();

      expect(withDbConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          fnName: 'getCurrentActiveAssignments',
        })
      );
      expect(result).toEqual(mockAssignments);
    });
  });

  // ==================== INVENTORY QUERIES ====================

  describe('getAllCallIDs', () => {
    it('should return paginated call IDs with default filters', async () => {
      const mockResult = {
        data: [
          {
            PhoneNumberID: 1,
            PhoneNumber: '5551234567',
            Status: 1,
            StatusDescription: 'Available',
            CallerName: 'Survey Research',
            StateFIPS: '06',
            StateAbbr: 'CA',
          },
        ],
        pagination: {
          page: 1,
          limit: 50,
          totalCount: 100,
          totalPages: 2,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      };

      withDbConnection.mockResolvedValue(mockResult);

      const result = await getAllCallIDs();

      expect(withDbConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          fnName: 'getAllCallIDs',
        })
      );
      expect(result.data).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
    });

    it('should apply status filter', async () => {
      const mockResult = {
        data: [],
        pagination: { page: 1, limit: 50, totalCount: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
      };

      withDbConnection.mockResolvedValue(mockResult);

      await getAllCallIDs({ status: 1 });

      expect(withDbConnection).toHaveBeenCalled();
    });

    it('should apply inUse filter', async () => {
      const mockResult = {
        data: [],
        pagination: { page: 1, limit: 50, totalCount: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
      };

      withDbConnection.mockResolvedValue(mockResult);

      await getAllCallIDs({ inUse: 'true' });

      expect(withDbConnection).toHaveBeenCalled();
    });
  });

  describe('getCallIDById', () => {
    it('should return a single call ID by ID', async () => {
      const mockCallID = {
        PhoneNumberID: 1,
        PhoneNumber: '5551234567',
        Status: 1,
        StatusDescription: 'Available',
        CallerName: 'Survey Research',
        StateFIPS: '06',
        StateAbbr: 'CA',
        StateName: 'California',
        CurrentlyInUse: 0,
      };

      withDbConnection.mockResolvedValue(mockCallID);

      const result = await getCallIDById(1);

      expect(withDbConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          fnName: 'getCallIDById',
        })
      );
      expect(result.PhoneNumberID).toBe(1);
    });

    it('should return undefined for non-existent ID', async () => {
      withDbConnection.mockResolvedValue(undefined);

      const result = await getCallIDById(99999);

      expect(result).toBeUndefined();
    });
  });

  describe('createCallID', () => {
    it('should create a new call ID', async () => {
      const newCallID = {
        phoneNumber: '5559876543',
        status: 1,
        callerName: 'New Survey',
        stateFIPS: '48',
      };

      const mockCreatedCallID = {
        PhoneNumberID: 2,
        PhoneNumber: '5559876543',
        Status: 1,
        CallerName: 'New Survey',
        StateFIPS: '48',
        StateAbbr: 'TX',
      };

      withDbConnection.mockResolvedValue(mockCreatedCallID);

      const result = await createCallID(newCallID);

      expect(withDbConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          fnName: 'createCallID',
        })
      );
      expect(result.PhoneNumber).toBe('5559876543');
    });
  });

  describe('updateCallID', () => {
    it('should update an existing call ID', async () => {
      const updates = { Status: 2, CallerName: 'Updated Name' };
      const mockUpdatedCallID = {
        PhoneNumberID: 1,
        PhoneNumber: '5551234567',
        Status: 2,
        CallerName: 'Updated Name',
      };

      withDbConnection.mockResolvedValue(mockUpdatedCallID);

      const result = await updateCallID(1, updates);

      expect(withDbConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          fnName: 'updateCallID',
        })
      );
      expect(result.Status).toBe(2);
      expect(result.CallerName).toBe('Updated Name');
    });

    it('should throw error for invalid field updates', async () => {
      withDbConnection.mockImplementation(async ({ queryFn }) => {
        // Simulate the validation logic
        throw new Error('No valid fields to update');
      });

      await expect(updateCallID(1, { invalidField: 'value' })).rejects.toThrow();
    });
  });

  describe('deleteCallID', () => {
    it('should delete a call ID successfully', async () => {
      const mockResult = { Success: 1, Message: 'Call ID deleted successfully' };
      withDbConnection.mockResolvedValue(mockResult);

      const result = await deleteCallID(1);

      expect(withDbConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          fnName: 'deleteCallID',
        })
      );
      expect(result.Success).toBe(1);
    });

    it('should fail to delete call ID in use', async () => {
      const mockResult = { Success: 0, Message: 'Cannot delete call ID that is currently in use' };
      withDbConnection.mockResolvedValue(mockResult);

      const result = await deleteCallID(1);

      expect(result.Success).toBe(0);
      expect(result.Message).toContain('currently in use');
    });
  });

  // ==================== USAGE/ASSIGNMENT QUERIES ====================

  describe('getCallIDUsageHistory', () => {
    it('should return usage history for a call ID', async () => {
      const mockHistory = [
        {
          ProjectID: 12345,
          PhoneNumberID: 1,
          PhoneNumber: '5551234567',
          StartDate: '2025-01-01',
          EndDate: '2025-03-31',
          SlotName: 'CallIDL1',
          DurationDays: 90,
          Status: 'Ended',
        },
      ];

      withDbConnection.mockResolvedValue(mockHistory);

      const result = await getCallIDUsageHistory(1);

      expect(withDbConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          fnName: 'getCallIDUsageHistory',
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].SlotName).toBe('CallIDL1');
    });
  });

  describe('getProjectCallIDs', () => {
    it('should return call IDs for a project', async () => {
      const mockProjectCallIDs = [
        {
          ProjectID: 12345,
          CallIDL1: 1,
          CallIDL2: 2,
          CallIDC1: null,
          CallIDC2: null,
          PhoneNumberL1: '5551234567',
          PhoneNumberL2: '5559876543',
        },
      ];

      withDbConnection.mockResolvedValue(mockProjectCallIDs);

      const result = await getProjectCallIDs(12345);

      expect(withDbConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          fnName: 'getProjectCallIDs',
        })
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('assignCallIDToProject', () => {
    it('should assign a call ID to a project', async () => {
      const mockResult = { Success: 1, Message: 'Assignment created successfully' };
      withDbConnection.mockResolvedValue(mockResult);

      const result = await assignCallIDToProject({
        projectId: 12345,
        phoneNumberId: 1,
        callIdSlot: 1,
      });

      expect(withDbConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          fnName: 'assignCallIDToProject',
        })
      );
      expect(result.Success).toBe(1);
    });
  });

  describe('endAssignment', () => {
    it('should end an assignment successfully', async () => {
      const mockResult = { Success: 1, Message: 'Assignment ended successfully' };
      withDbConnection.mockResolvedValue(mockResult);

      const result = await endAssignment(12345, 1);

      expect(withDbConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          fnName: 'endAssignment',
        })
      );
      expect(result.Success).toBe(1);
    });
  });

  // ==================== ANALYTICS QUERIES ====================

  describe('getUtilizationMetrics', () => {
    it('should return utilization metrics', async () => {
      const mockMetrics = {
        totalNumbers: 100,
        inUseNumbers: 25,
        availableNumbers: 75,
        utilizationRate: 25.0,
        avgDurationDays: 45,
      };

      withDbConnection.mockResolvedValue(mockMetrics);

      const result = await getUtilizationMetrics();

      expect(withDbConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          fnName: 'getUtilizationMetrics',
        })
      );
      expect(result.utilizationRate).toBe(25.0);
    });
  });

  // ==================== LOOKUP/UTILITY QUERIES ====================

  describe('getAllStatusCodes', () => {
    it('should return all status codes', async () => {
      const mockStatusCodes = [
        { StatusCode: 1, StatusDescription: 'Available' },
        { StatusCode: 2, StatusDescription: 'In Use' },
        { StatusCode: 3, StatusDescription: 'Removed' },
        { StatusCode: 4, StatusDescription: 'Flagged as Spam' },
      ];

      withDbConnection.mockResolvedValue(mockStatusCodes);

      const result = await getAllStatusCodes();

      expect(withDbConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          fnName: 'getAllStatusCodes',
        })
      );
      expect(result).toHaveLength(4);
    });
  });

  describe('getAllStates', () => {
    it('should return all states', async () => {
      const mockStates = [
        { StateFIPS: '06', StateAbbr: 'CA', StateName: 'California' },
        { StateFIPS: '48', StateAbbr: 'TX', StateName: 'Texas' },
      ];

      withDbConnection.mockResolvedValue(mockStates);

      const result = await getAllStates();

      expect(withDbConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          fnName: 'getAllStates',
        })
      );
      expect(result).toHaveLength(2);
    });
  });

  // ==================== SLOT MANAGEMENT ====================

  describe('updateProjectSlot', () => {
    it('should update a project slot successfully', async () => {
      const mockResult = { Success: 1, Message: 'Slot updated successfully', Action: 'UPDATE', RowsAffected: 1 };
      withDbConnection.mockResolvedValue(mockResult);

      const result = await updateProjectSlot(12345, 'CallIDL1', 1);

      expect(withDbConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          fnName: 'updateProjectSlot',
        })
      );
      expect(result.Success).toBe(1);
    });

    it('should throw error for invalid slot name', async () => {
      await expect(updateProjectSlot(12345, 'InvalidSlot', 1)).rejects.toThrow('Invalid slot name');
    });
  });

  describe('removeProjectSlot', () => {
    it('should remove a project slot successfully', async () => {
      const mockResult = { Success: 1, Message: 'Slot cleared successfully' };
      withDbConnection.mockResolvedValue(mockResult);

      const result = await removeProjectSlot(12345, 'CallIDL1');

      expect(withDbConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          fnName: 'removeProjectSlot',
        })
      );
      expect(result.Success).toBe(1);
    });

    it('should throw error for invalid slot name', async () => {
      await expect(removeProjectSlot(12345, 'InvalidSlot')).rejects.toThrow('Invalid slot name');
    });
  });
});
