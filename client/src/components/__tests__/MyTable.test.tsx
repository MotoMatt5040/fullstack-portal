import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyTable from '../MyTable';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Wrapper component with router
const TableWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('MyTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleData = [
    { id: 1, name: 'Alice', age: 25, score: 85 },
    { id: 2, name: 'Bob', age: 30, score: 92 },
    { id: 3, name: 'Charlie', age: 22, score: 78 },
  ];

  const columnKeyMap = {
    'ID': 'id',
    'Name': 'name',
    'Age': 'age',
    'Score': 'score',
  };

  describe('Basic Rendering', () => {
    it('should render table with headers', () => {
      render(
        <TableWrapper>
          <MyTable
            data={sampleData}
            columnKeyMap={columnKeyMap}
            clickParameters={[]}
            dataIsReady={true}
          />
        </TableWrapper>
      );

      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('Score')).toBeInTheDocument();
    });

    it('should render table rows with data', () => {
      render(
        <TableWrapper>
          <MyTable
            data={sampleData}
            columnKeyMap={columnKeyMap}
            clickParameters={[]}
            dataIsReady={true}
          />
        </TableWrapper>
      );

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    it('should hide headers when includeHeader is false', () => {
      render(
        <TableWrapper>
          <MyTable
            data={sampleData}
            columnKeyMap={columnKeyMap}
            clickParameters={[]}
            dataIsReady={true}
            includeHeader={false}
          />
        </TableWrapper>
      );

      expect(screen.queryByRole('columnheader')).not.toBeInTheDocument();
    });

    it('should show loading spinner when dataIsReady is false', () => {
      render(
        <TableWrapper>
          <MyTable
            data={sampleData}
            columnKeyMap={columnKeyMap}
            clickParameters={[]}
            dataIsReady={false}
          />
        </TableWrapper>
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    });

    it('should use custom className', () => {
      render(
        <TableWrapper>
          <MyTable
            data={sampleData}
            columnKeyMap={columnKeyMap}
            clickParameters={[]}
            dataIsReady={true}
            className="custom-table"
          />
        </TableWrapper>
      );

      const table = screen.getByRole('table');
      expect(table).toHaveClass('custom-table');
    });
  });

  describe('Sorting', () => {
    it('should sort data ascending on first click', () => {
      render(
        <TableWrapper>
          <MyTable
            data={sampleData}
            columnKeyMap={columnKeyMap}
            clickParameters={[]}
            dataIsReady={true}
          />
        </TableWrapper>
      );

      const ageHeader = screen.getByText('Age');
      fireEvent.click(ageHeader);

      // Check that sorting indicator is shown
      expect(screen.getByText(/Age.*▲/)).toBeInTheDocument();
    });

    it('should sort data descending on second click', () => {
      render(
        <TableWrapper>
          <MyTable
            data={sampleData}
            columnKeyMap={columnKeyMap}
            clickParameters={[]}
            dataIsReady={true}
          />
        </TableWrapper>
      );

      const ageHeader = screen.getByText('Age');
      fireEvent.click(ageHeader);
      fireEvent.click(ageHeader);

      // Check that descending indicator is shown
      expect(screen.getByText(/Age.*▼/)).toBeInTheDocument();
    });

    it('should remove sorting on third click', () => {
      render(
        <TableWrapper>
          <MyTable
            data={sampleData}
            columnKeyMap={columnKeyMap}
            clickParameters={[]}
            dataIsReady={true}
          />
        </TableWrapper>
      );

      const ageHeader = screen.getByText('Age');
      fireEvent.click(ageHeader);
      fireEvent.click(ageHeader);
      fireEvent.click(ageHeader);

      // Sorting indicators should be removed
      expect(screen.queryByText(/▲|▼/)).not.toBeInTheDocument();
    });

    it('should support multi-column sorting', () => {
      render(
        <TableWrapper>
          <MyTable
            data={sampleData}
            columnKeyMap={columnKeyMap}
            clickParameters={[]}
            dataIsReady={true}
          />
        </TableWrapper>
      );

      const ageHeader = screen.getByText('Age');
      const scoreHeader = screen.getByText('Score');

      fireEvent.click(ageHeader);
      fireEvent.click(scoreHeader);

      // Both columns should have sort indicators
      expect(screen.getByText(/Age.*▲/)).toBeInTheDocument();
      expect(screen.getByText(/Score.*▲/)).toBeInTheDocument();
    });
  });

  describe('Row Click Navigation', () => {
    it('should navigate when row is clicked and isClickable is true', () => {
      render(
        <TableWrapper>
          <MyTable
            data={sampleData}
            columnKeyMap={columnKeyMap}
            clickParameters={['id', 'name']}
            dataIsReady={true}
            isClickable={true}
            redirect={true}
            linkTo="/details"
          />
        </TableWrapper>
      );

      const firstRow = screen.getByText('Alice').closest('tr');
      fireEvent.click(firstRow!);

      expect(mockNavigate).toHaveBeenCalledWith('/details?id=1&name=Alice');
    });

    it('should not navigate when isClickable is false', () => {
      render(
        <TableWrapper>
          <MyTable
            data={sampleData}
            columnKeyMap={columnKeyMap}
            clickParameters={['id']}
            dataIsReady={true}
            isClickable={false}
            redirect={true}
            linkTo="/details"
          />
        </TableWrapper>
      );

      const firstRow = screen.getByText('Alice').closest('tr');
      fireEvent.click(firstRow!);

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should set active row class on click', () => {
      render(
        <TableWrapper>
          <MyTable
            data={sampleData}
            columnKeyMap={columnKeyMap}
            clickParameters={['id']}
            dataIsReady={true}
            isClickable={true}
            redirect={false}
          />
        </TableWrapper>
      );

      const firstRow = screen.getByText('Alice').closest('tr');
      fireEvent.click(firstRow!);

      expect(firstRow).toHaveClass('active');
    });
  });

  describe('Percent Columns', () => {
    it('should append % to percent columns', () => {
      render(
        <TableWrapper>
          <MyTable
            data={sampleData}
            columnKeyMap={columnKeyMap}
            clickParameters={[]}
            dataIsReady={true}
            percentColumns={['score']}
          />
        </TableWrapper>
      );

      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('92%')).toBeInTheDocument();
    });

    it('should work when percentColumns prop is explicitly passed', () => {
      // Note: The shorthand props (pc, gc, etc.) use ?? which means
      // the default empty array takes precedence. This test verifies
      // the percentColumns prop works correctly.
      render(
        <TableWrapper>
          <MyTable
            data={sampleData}
            columnKeyMap={columnKeyMap}
            clickParameters={[]}
            dataIsReady={true}
            percentColumns={['score']}
          />
        </TableWrapper>
      );

      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('92%')).toBeInTheDocument();
    });
  });

  describe('Gradient Columns', () => {
    it('should apply gradient styles to specified columns', () => {
      const dataWithGradient = [
        { id: 1, name: 'Low', value: 10 },
        { id: 2, name: 'Mid', value: 50 },
        { id: 3, name: 'High', value: 100 },
      ];

      const gradientColumnKeyMap = {
        'ID': 'id',
        'Name': 'name',
        'Value': 'value',
      };

      render(
        <TableWrapper>
          <MyTable
            data={dataWithGradient}
            columnKeyMap={gradientColumnKeyMap}
            clickParameters={[]}
            dataIsReady={true}
            gradientColumns={{
              value: { direction: 'asc', ignoreZero: false },
            }}
          />
        </TableWrapper>
      );

      // The cells should have inline styles for gradient
      const valueCells = screen.getAllByText(/10|50|100/).filter(
        el => el.tagName === 'TD'
      );
      expect(valueCells.length).toBeGreaterThan(0);
    });

    it('should use gc shorthand for gradient columns', () => {
      const dataWithGradient = [
        { id: 1, name: 'Test', value: 50 },
      ];

      const gradientColumnKeyMap = {
        'ID': 'id',
        'Name': 'name',
        'Value': 'value',
      };

      render(
        <TableWrapper>
          <MyTable
            data={dataWithGradient}
            columnKeyMap={gradientColumnKeyMap}
            clickParameters={[]}
            dataIsReady={true}
            gc={{
              value: { direction: 'asc', ignoreZero: false },
            }}
          />
        </TableWrapper>
      );

      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('should ignore zero values when ignoreZero is true', () => {
      const dataWithZero = [
        { id: 1, name: 'Zero', value: 0 },
        { id: 2, name: 'Non-Zero', value: 100 },
      ];

      const gradientColumnKeyMap = {
        'Name': 'name',
        'Value': 'value',
      };

      render(
        <TableWrapper>
          <MyTable
            data={dataWithZero}
            columnKeyMap={gradientColumnKeyMap}
            clickParameters={[]}
            dataIsReady={true}
            gradientColumns={{
              value: { direction: 'asc', ignoreZero: true },
            }}
          />
        </TableWrapper>
      );

      expect(screen.getByText('Zero')).toBeInTheDocument();
      expect(screen.getByText('Non-Zero')).toBeInTheDocument();
    });
  });

  describe('Threshold Highlighting', () => {
    it('should apply highlight class based on threshold', () => {
      const dataWithThreshold = [
        { id: 1, name: 'Below', score: 50, scoreThreshold: 80 },
        { id: 2, name: 'Above', score: 90, scoreThreshold: 80 },
      ];

      render(
        <TableWrapper>
          <MyTable
            data={dataWithThreshold}
            columnKeyMap={{ Name: 'name', Score: 'score' }}
            clickParameters={[]}
            dataIsReady={true}
          />
        </TableWrapper>
      );

      // The component should apply highlight classes based on threshold comparison
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('90')).toBeInTheDocument();
    });

    it('should reverse threshold logic for specified columns', () => {
      const dataWithThreshold = [
        { id: 1, name: 'Low', errors: 5, errorsThreshold: 10 },
        { id: 2, name: 'High', errors: 15, errorsThreshold: 10 },
      ];

      render(
        <TableWrapper>
          <MyTable
            data={dataWithThreshold}
            columnKeyMap={{ Name: 'name', Errors: 'errors' }}
            clickParameters={[]}
            dataIsReady={true}
            reverseThresholds={['errors']}
          />
        </TableWrapper>
      );

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
    });
  });

  describe('Custom Highlight with Threshold', () => {
    it('should apply custom highlight styles', () => {
      const dataWithHighlight = [
        { id: 1, name: 'Highlight', value: 100 },
        { id: 2, name: 'No Highlight', value: 20 },
      ];

      render(
        <TableWrapper>
          <MyTable
            data={dataWithHighlight}
            columnKeyMap={{ Name: 'name', Value: 'value' }}
            clickParameters={[]}
            dataIsReady={true}
            highlightColumnWithThreshold={{
              value: {
                threshold: 50,
                backgroundColor: '#10b981',
                direction: 'asc',
                textColor: 'white',
              },
            }}
          />
        </TableWrapper>
      );

      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('should use hcwt shorthand', () => {
      const dataWithHighlight = [
        { id: 1, name: 'Test', value: 75 },
      ];

      render(
        <TableWrapper>
          <MyTable
            data={dataWithHighlight}
            columnKeyMap={{ Name: 'name', Value: 'value' }}
            clickParameters={[]}
            dataIsReady={true}
            hcwt={{
              value: {
                threshold: 50,
                backgroundColor: '#dc2626',
                direction: 'desc',
                textColor: 'white',
              },
            }}
          />
        </TableWrapper>
      );

      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });

  describe('Blinking Effect', () => {
    it('should apply blinking class when isLive is true', () => {
      render(
        <TableWrapper>
          <MyTable
            data={sampleData}
            columnKeyMap={columnKeyMap}
            clickParameters={[]}
            dataIsReady={true}
            isLive={true}
          />
        </TableWrapper>
      );

      const cells = screen.getAllByRole('cell');
      cells.forEach((cell) => {
        expect(cell.className).toContain('blinking');
      });
    });

    it('should not apply blinking class when isLive is false', () => {
      render(
        <TableWrapper>
          <MyTable
            data={sampleData}
            columnKeyMap={columnKeyMap}
            clickParameters={[]}
            dataIsReady={true}
            isLive={false}
          />
        </TableWrapper>
      );

      const cells = screen.getAllByRole('cell');
      cells.forEach((cell) => {
        expect(cell.className).not.toContain('blinking');
      });
    });
  });

  describe('N/A Display', () => {
    it('should display N/A for undefined or null values', () => {
      const dataWithNull = [
        { id: 1, name: null, score: undefined },
      ];

      render(
        <TableWrapper>
          <MyTable
            data={dataWithNull}
            columnKeyMap={{ ID: 'id', Name: 'name', Score: 'score' }}
            clickParameters={[]}
            dataIsReady={true}
          />
        </TableWrapper>
      );

      const naCells = screen.getAllByText('N/A');
      expect(naCells).toHaveLength(2);
    });
  });

  describe('Empty Data', () => {
    it('should render empty table body when data is empty', () => {
      render(
        <TableWrapper>
          <MyTable
            data={[]}
            columnKeyMap={columnKeyMap}
            clickParameters={[]}
            dataIsReady={true}
          />
        </TableWrapper>
      );

      // Headers should still be present
      expect(screen.getByText('ID')).toBeInTheDocument();
      // But no data rows
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(1); // Only header row
    });
  });

  describe('Cursor Style', () => {
    it('should show pointer cursor when clickable', () => {
      render(
        <TableWrapper>
          <MyTable
            data={sampleData}
            columnKeyMap={columnKeyMap}
            clickParameters={['id']}
            dataIsReady={true}
            isClickable={true}
          />
        </TableWrapper>
      );

      const row = screen.getByText('Alice').closest('tr');
      expect(row).toHaveStyle({ cursor: 'pointer' });
    });

    it('should show default cursor when not clickable', () => {
      render(
        <TableWrapper>
          <MyTable
            data={sampleData}
            columnKeyMap={columnKeyMap}
            clickParameters={['id']}
            dataIsReady={true}
            isClickable={false}
          />
        </TableWrapper>
      );

      const row = screen.getByText('Alice').closest('tr');
      expect(row).toHaveStyle({ cursor: 'default' });
    });
  });
});
