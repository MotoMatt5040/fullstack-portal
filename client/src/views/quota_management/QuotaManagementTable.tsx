import React, { memo, useMemo } from 'react';

// Types
interface RowData {
  Objective?: number | string;
  'Obj%'?: number | string;
  Frequency?: number | string;
  'Freq%'?: number | string;
  'To Do'?: number | string;
  Label?: string;
  StratumId?: number;
  TotalObjective?: number | string;
  Status?: string;
  [key: string]: any;
}

interface QuotaData {
  [key: string]: {
    [category: string]: RowData;
  };
}

interface VisibleStypes {
  [key: string]: {
    [subKey: string]: string | string[];
  };
}

interface Props {
  id?: string;
  quotaData: QuotaData;
  visibleStypes: VisibleStypes;
  isInternalUser?: boolean;
}

// Constants
const COLUMN_DISPLAY_NAMES: Record<string, string> = {
  Status: 'S',
  Objective: 'Obj',
  'Obj%': 'Obj%',
  Frequency: 'Freq',
  'Freq%': 'Freq%',
  'To Do': 'To Do',
  Label: 'Label',
};

const EMPTY_VALUE_INDICATORS = [
  undefined,
  null,
  0,
  '0',
  '0.0',
  '',
];

// Utility functions
const getDisplayName = (columnName: string): string => {
  return COLUMN_DISPLAY_NAMES[columnName] || columnName;
};

const getColumnValue = (cellData: RowData, col: string): string => {
  switch (col) {
    case 'Label':
      return cellData.Label || '';
    case 'Obj':
      return cellData.TotalObjective?.toString() || '';
    case 'Obj%':
      return cellData['Obj%']?.toString() || '';
    case 'Freq':
      return cellData.Frequency?.toString() || '';
    case 'Freq%':
      return cellData['Freq%']?.toString() || '';
    case 'To Do':
      return cellData['To Do']?.toString() || '';
    default:
      return cellData[col]?.toString() || '';
  }
};

const formatCellValue = (value: string): string => {
  return EMPTY_VALUE_INDICATORS.includes(value as any) ? '' : value;
};

const getCellClassName = (header: string, value: string, subGroup: string): string => {
  let className = `cell-${header.toLowerCase().replace(/\s+/g, '-')}`;

  if (subGroup === 'Total') {
    className += ' total-column';
  }

  // Add specific classes for the Status column
  if (header === 'S') {
    className += ' cell-status';
    if (value === 'C') {
      className += ' closed';
    } else if (value === 'O') {
      className += ' open';
    } else if (value === 'H') {
      className += ' half-open';
    }
  }

  if (value.includes('*')) {
    className += ' bold';
  }

  // Add the value as a class
  className += ` ${value}`;

  return className;
};

// Types for TableCell props
interface TableCellProps {
  rowKey: string;
  group: string;
  subGroup: string;
  col: string;
  cellData: RowData | null;
  extraClassName?: string; // Added new prop
}

// Memoized cell component
const TableCell = memo<TableCellProps>(({ rowKey, group, subGroup, col, cellData, extraClassName }) => { // Destructure the new prop
  const value = useMemo(() => {
    if (!cellData) return '';
    const rawValue = getColumnValue(cellData, col);
    return formatCellValue(rawValue);
  }, [cellData, col]);

  const className = useMemo(() => {
    const headerName = getDisplayName(col);
    // Combine the dynamically generated class with the extra one
    return `${getCellClassName(headerName, value, subGroup)} ${extraClassName || ''}`;
  }, [col, value, subGroup, extraClassName]); // Add extraClassName to the dependency array

  return (
    <td
      key={`${rowKey}-${group}-${subGroup}-${col}`}
      className={className.trim()} // Use trim() to remove any trailing space
    >
      {value}
    </td>
  );
});

TableCell.displayName = 'TableCell';

// Memoized table row component
const TableRow = memo<{
  rowKey: string;
  rowData: QuotaData[string];
  visibleStypes: VisibleStypes;
}>(({ rowKey, rowData, visibleStypes }) => {
  const cells = useMemo(() => {
    // These flags will track if we've already added the border for a group in this row
    let isFirstInPhoneGroup = true;
    let isFirstInWebGroup = true;

    return Object.entries(visibleStypes).flatMap(([group, subGroups]) =>
      Object.entries(subGroups).flatMap(([subGroup, cols]) => {
        const colsArray = Array.isArray(cols) ? cols : [cols];
        return colsArray.map((col) => {
          let cellData: RowData | null = null;
          let extraClassName = '';

          // Check if this is the first column for the 'Phone' or 'Web' group
          if (group === 'Phone' && isFirstInPhoneGroup) {
            extraClassName = 'group-border-left';
            isFirstInPhoneGroup = false; // Ensure it's only applied once per group per row
          } else if (group === 'Web' && isFirstInWebGroup) {
            extraClassName = 'group-border-left';
            isFirstInWebGroup = false; // Ensure it's only applied once per group per row
          }
          
          if (group.startsWith('blankSpace') || group.startsWith('Project')) {
            cellData = rowData.Total?.Total || rowData.Total || null;
          } else {
            if (rowData[group]?.[subGroup]) {
              cellData = rowData[group][subGroup];
            }
          }

          return (
            <TableCell
              key={`${rowKey}-${group}-${subGroup}-${col}`}
              rowKey={rowKey}
              group={group}
              subGroup={subGroup}
              col={col}
              cellData={cellData}
              extraClassName={extraClassName} // Pass the class to TableCell
            />
          );
        });
      })
    );
  }, [rowKey, rowData, visibleStypes]);

  return <tr key={rowKey}>{cells}</tr>;
});

TableRow.displayName = 'TableRow';

// Main component
const QuotaManagementTable: React.FC<Props> = memo(({
  id,
  quotaData,
  visibleStypes,
}) => {
  // Memoized column groups for better performance
  const columnGroups = useMemo(() => {
    return Object.entries(visibleStypes).flatMap(([group, subGroups]) =>
      Object.entries(subGroups).map(([subGroup, cols]) => {
        const colsArray = Array.isArray(cols) ? cols : [cols];
        
        return {
          key: `colgroup-${group}-${subGroup}`,
          className: `colgroup ${subGroup.toLowerCase().replace(/\s+/g, '-')}`,
          mainGroup: group,
          subGroup: subGroup,
          columns: colsArray.map((col, i) => ({
            key: `${group}-${subGroup}-${col}-${i}`,
            className: `col-${col.toLowerCase().replace(/\s+/g, '-')}`,
            column: col,
          })),
        };
      })
    );
  }, [visibleStypes]);

  // Memoized header rows
  const headerRows = useMemo(() => {
    // First header row - main groups
    const firstRow = Object.entries(visibleStypes).map(([group, subGroups]) => {
      const colspan = Object.values(subGroups).reduce((acc, cols) => {
        const colsArray = Array.isArray(cols) ? cols : [cols];
        return acc + colsArray.length;
      }, 0);
      
      return {
        key: `r1-${group}`,
        colspan,
        label: group.startsWith('blankSpace') ? '' : group,
      };
    });

    // Second header row - sub groups
    const secondRow = Object.entries(visibleStypes).flatMap(([group, subGroups]) =>
      Object.entries(subGroups).map(([subGroup, cols]) => {
        const colsArray = Array.isArray(cols) ? cols : [cols];
        return {
          key: `r2-${group}-${subGroup}`,
          colspan: colsArray.length,
          label: subGroup.startsWith('blankSpace') ? '' : subGroup,
        };
      })
    );

    // Third header row - individual columns
    const thirdRow = Object.entries(visibleStypes).flatMap(([group, subGroups]) => {
      // Flag to track the first column within each main group
      let isFirstInGroup = true;
      return Object.entries(subGroups).flatMap(([subGroup, cols]) => {
        const colsArray = Array.isArray(cols) ? cols : [cols];
        return colsArray.map((col) => {
          let className = '';
          // If it's the first column of 'Phone' or 'Web', assign the class
          if ((group === 'Phone' || group === 'Web') && isFirstInGroup) {
            className = 'group-border-left';
            isFirstInGroup = false; // Unset the flag for subsequent columns in this group
          }
          return {
            key: `r3-${group}-${subGroup}-${col}`,
            label: getDisplayName(col),
            className: className, // Add className to the returned object
          };
        });
      });
    });

    return { firstRow, secondRow, thirdRow };
  }, [visibleStypes]);

  // Memoized table rows
  const tableRows = useMemo(() => {
    if (!quotaData || Object.keys(quotaData).length === 0) {
      return null;
    }

    return Object.entries(quotaData).map(([rowKey, rowData]) => (
      <TableRow
        key={rowKey}
        rowKey={rowKey}
        rowData={rowData}
        visibleStypes={visibleStypes}
      />
    ));
  }, [quotaData, visibleStypes]);

  // Don't render if no data
  if (!quotaData || Object.keys(quotaData).length === 0) {
    return (
      <div className="quota-table-empty">
        <p>No quota data available. Please select a project.</p>
      </div>
    );
  }

  return (
    <table id={id} className="quota-management-table">
      {/* Column groups for styling */}
      {columnGroups.map((group) => (
        <colgroup
          key={group.key}
          className={group.className}
          data-main-group={group.mainGroup}
          data-sub-group={group.subGroup}
        >
          {group.columns.map((col) => (
            <col
              key={col.key}
              className={col.className}
              data-main-group={group.mainGroup}
              data-sub-group={group.subGroup}
              data-column={col.column}
            />
          ))}
        </colgroup>
      ))}

      {/* Table headers */}
      <thead>
        {/* First header row - main groups */}
        <tr>
          {headerRows.firstRow.map((header) => (
            <th key={header.key} colSpan={header.colspan}>
              {header.label}
            </th>
          ))}
        </tr>

        {/* Second header row - sub groups */}
        <tr>
          {headerRows.secondRow.map((header) => (
            <th key={header.key} colSpan={header.colspan}>
              {header.label}
            </th>
          ))}
        </tr>

        {/* Third header row - individual columns */}
        <tr>
          {headerRows.thirdRow.map((header) => (
            <th key={header.key} className={header.className}> {/* Use the className here */}
              {header.label}
            </th>
          ))}
        </tr>
      </thead>

      {/* Table body */}
      <tbody>
        {tableRows}
      </tbody>
    </table>
  );
});

QuotaManagementTable.displayName = 'QuotaManagementTable';

export default QuotaManagementTable;