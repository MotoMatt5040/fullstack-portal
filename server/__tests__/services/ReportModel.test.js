// ReportModel Services Unit Tests
const sql = require('mssql');

// Mock the database connection module
jest.mock('../../config/dbConn');
const withDbConnection = require('../../config/dbConn');

// Import the service functions
const {
  getLiveReportData,
  getLiveInterviewerData,
  getHistoricInterviewerData,
  getHistoricProjectReportData,
  getInterviewerProductionReportData,
  updateTargetMphAndCph,
} = require('../../services/ReportModel');

describe('ReportModel Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== LIVE REPORT DATA ====================

  describe('getLiveReportData', () => {
    it('should return live report data for all projects', async () => {
      const mockData = [
        {
          projectId: '12345',
          recDate: '2025-01-22',
          projName: 'Test Project',
          cms: 100,
          hrs: 10,
          cph: 10.0,
          gpcph: 12.0,
          mph: 8.5,
          al: 5.2,
        },
        {
          projectId: '67890',
          recDate: '2025-01-22',
          projName: 'Another Project',
          cms: 50,
          hrs: 5,
          cph: 10.0,
          gpcph: 11.0,
          mph: 7.5,
          al: 4.8,
        },
      ];

      withDbConnection.mockResolvedValue(mockData);

      const result = await getLiveReportData();

      expect(withDbConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          database: 'promark',
          fnName: 'getLiveSummaryData',
          attempts: 5,
          allowAbort: true,
          allowRetry: true,
        })
      );
      expect(result).toHaveLength(2);
      expect(result[0].projectId).toBe('12345');
    });

    it('should return live report data for specific project', async () => {
      const mockData = [
        {
          projectId: '12345',
          recDate: '2025-01-22',
          projName: 'Test Project',
          cms: 100,
          hrs: 10,
          cph: 10.0,
          gpcph: 12.0,
          mph: 8.5,
          al: 5.2,
        },
      ];

      withDbConnection.mockResolvedValue(mockData);

      const result = await getLiveReportData('12345');

      expect(withDbConnection).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].projectId).toBe('12345');
    });

    it('should return empty array when no data available', async () => {
      withDbConnection.mockResolvedValue([]);

      const result = await getLiveReportData();

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      withDbConnection.mockRejectedValue(new Error('Database connection failed'));

      await expect(getLiveReportData()).rejects.toThrow('Database connection failed');
    });
  });

  // ==================== LIVE INTERVIEWER DATA ====================

  describe('getLiveInterviewerData', () => {
    it('should return live interviewer data', async () => {
      const mockData = [
        {
          projectId: '12345',
          longName: 'New York',
          eid: 1001,
          myName: 'Doe, John',
          tenure: 2.5,
          hrs: 8.0,
          cms: 24,
          intAL: 5.2,
          cph: 3.0,
          mph: 7.5,
          pauseTime: 0.5,
          connectTime: 4.2,
          totalDials: 150,
          naam: 5,
        },
      ];

      withDbConnection.mockResolvedValue(mockData);

      const result = await getLiveInterviewerData();

      expect(withDbConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          fnName: 'getLiveInterviewerData',
          allowAbort: true,
          allowRetry: true,
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].myName).toBe('Doe, John');
    });

    it('should filter by project ID when provided', async () => {
      const mockData = [
        {
          projectId: '12345',
          longName: 'New York',
          eid: 1001,
          myName: 'Doe, John',
        },
      ];

      withDbConnection.mockResolvedValue(mockData);

      const result = await getLiveInterviewerData('12345');

      expect(withDbConnection).toHaveBeenCalled();
      expect(result[0].projectId).toBe('12345');
    });
  });

  // ==================== HISTORIC INTERVIEWER DATA ====================

  describe('getHistoricInterviewerData', () => {
    it('should return historic interviewer data with date range', async () => {
      const mockData = [
        {
          recDate: '2025-01-15',
          projectId: '12345',
          projname: 'Test Project',
          refname: 'John Doe',
          cms: 100,
          hrs: 10,
          cph: '10.00',
          gpcph: 12.0,
          mph: '8.50',
          al: 5.2,
        },
      ];

      withDbConnection.mockResolvedValue(mockData);

      const result = await getHistoricInterviewerData('12345', '2025-01-01', '2025-01-31');

      expect(withDbConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          fnName: 'getHistoricInterviewerData',
          allowAbort: false,
          allowRetry: false,
        })
      );
      expect(result).toHaveLength(1);
    });

    it('should return data without project ID filter', async () => {
      const mockData = [
        { projectId: '12345', projname: 'Project A' },
        { projectId: '67890', projname: 'Project B' },
      ];

      withDbConnection.mockResolvedValue(mockData);

      const result = await getHistoricInterviewerData(null, '2025-01-01', '2025-01-31');

      expect(result).toHaveLength(2);
    });
  });

  // ==================== HISTORIC PROJECT REPORT DATA ====================

  describe('getHistoricProjectReportData', () => {
    it('should return historic project report data', async () => {
      const mockData = [
        {
          recDate: '2025-01-15',
          projectId: '12345',
          projName: 'Test Project',
          cms: 500,
          hrs: 50,
          cph: 10.0,
          gpcph: 12.0,
          mph: 8.5,
          al: 5.2,
        },
      ];

      withDbConnection.mockResolvedValue(mockData);

      const result = await getHistoricProjectReportData('12345', '2025-01-01', '2025-01-31');

      expect(withDbConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          fnName: 'getHistoricProjectReportData',
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].projName).toBe('Test Project');
    });

    it('should handle empty date range', async () => {
      const mockData = [];
      withDbConnection.mockResolvedValue(mockData);

      const result = await getHistoricProjectReportData('12345', null, null);

      expect(result).toEqual([]);
    });
  });

  // ==================== INTERVIEWER PRODUCTION REPORT ====================

  describe('getInterviewerProductionReportData', () => {
    it('should return interviewer production data for specific date', async () => {
      const mockData = [
        {
          eid: 1001,
          refName: 'John Doe',
          recLoc: 1,
          tenure: 2.5,
          hrs: 8.0,
          connectTime: 4.2,
          pauseTime: 0.5,
          cms: 24,
          intal: 5.2,
          mph: 7.5,
          totalDials: 150,
          gpcph: 12.0,
          inc: 0.05,
          mean: 8.0,
          targetMph: 8.5,
          projName: 'Test Project',
        },
      ];

      withDbConnection.mockResolvedValue(mockData);

      const result = await getInterviewerProductionReportData('12345', '2025-01-22');

      expect(withDbConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          fnName: 'getInterviewerProductionReportData',
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].eid).toBe(1001);
    });

    it('should return empty array for no matching data', async () => {
      withDbConnection.mockResolvedValue([]);

      const result = await getInterviewerProductionReportData('99999', '2020-01-01');

      expect(result).toEqual([]);
    });
  });

  // ==================== UPDATE TARGET MPH AND CPH ====================

  describe('updateTargetMphAndCph', () => {
    it('should update target MPH and CPH successfully', async () => {
      withDbConnection.mockResolvedValue([1]); // rowsAffected

      const result = await updateTargetMphAndCph('12345', '2025-01-22', 8.5, 12.0, 'testuser');

      expect(withDbConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          fnName: 'updateTargetMph',
        })
      );
      expect(result).toEqual([1]);
    });

    it('should handle update failure', async () => {
      withDbConnection.mockResolvedValue([0]); // no rows affected

      const result = await updateTargetMphAndCph('99999', '2020-01-01', 8.5, 12.0, 'testuser');

      expect(result).toEqual([0]);
    });

    it('should handle database errors during update', async () => {
      withDbConnection.mockRejectedValue(new Error('Update failed'));

      await expect(
        updateTargetMphAndCph('12345', '2025-01-22', 8.5, 12.0, 'testuser')
      ).rejects.toThrow('Update failed');
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge Cases', () => {
    it('should handle null values in report data', async () => {
      const mockData = [
        {
          projectId: '12345',
          projName: null,
          cms: null,
          hrs: 0,
          cph: null,
        },
      ];

      withDbConnection.mockResolvedValue(mockData);

      const result = await getLiveReportData();

      expect(result).toHaveLength(1);
      expect(result[0].projName).toBeNull();
    });

    it('should handle special characters in project names', async () => {
      const mockData = [
        {
          projectId: '12345',
          projName: "Test's Project & More <special>",
          cms: 100,
        },
      ];

      withDbConnection.mockResolvedValue(mockData);

      const result = await getLiveReportData();

      expect(result[0].projName).toBe("Test's Project & More <special>");
    });

    it('should handle very large numbers', async () => {
      const mockData = [
        {
          projectId: '12345',
          cms: 999999999,
          hrs: 99999.99,
          cph: 10000.00,
        },
      ];

      withDbConnection.mockResolvedValue(mockData);

      const result = await getLiveReportData();

      expect(result[0].cms).toBe(999999999);
    });

    it('should handle zero values', async () => {
      const mockData = [
        {
          projectId: '12345',
          cms: 0,
          hrs: 0,
          cph: 0,
          mph: 0,
        },
      ];

      withDbConnection.mockResolvedValue(mockData);

      const result = await getLiveReportData();

      expect(result[0].cms).toBe(0);
      expect(result[0].cph).toBe(0);
    });
  });
});
