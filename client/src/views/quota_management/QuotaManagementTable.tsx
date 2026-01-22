import React, { memo, useMemo, useState, useCallback, useEffect } from 'react';

// Status thresholds helper
const getStatusFromPercent = (percent: number): string => {
  if (percent >= 110) return 'over';      // Purple - exceeded target
  if (percent >= 100) return 'complete';  // Red - met objective
  return 'behind';                        // Green - not yet met
};

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
  showVisualIndicators?: boolean;
  visibleColumns?: string[];
  visibleModes?: string[];
}

// Default visible columns and modes
const DEFAULT_VISIBLE_COLUMNS = ['Status', 'Obj', 'Obj%', 'Freq', 'Freq%', 'To Do'];
const DEFAULT_VISIBLE_MODES = ['Phone', 'Web'];

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

const LABEL_MAX_LENGTH = 25;

// Utility functions
const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
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
  extraClassName?: string;
  activeTooltip: string | null;
  onTooltipToggle: (cellId: string | null) => void;
}

// Memoized cell component
const TableCell = memo<TableCellProps>(({ rowKey, group, subGroup, col, cellData, extraClassName, activeTooltip, onTooltipToggle }) => {
  const { displayValue, fullValue, isLabel, isTruncated } = useMemo(() => {
    if (!cellData) return { displayValue: '', fullValue: '', isLabel: false, isTruncated: false };
    const rawValue = getColumnValue(cellData, col);
    const formattedValue = formatCellValue(rawValue);
    const isLabelCol = col === 'Label';
    const truncated = isLabelCol && formattedValue.length > LABEL_MAX_LENGTH;

    // For Status column in Total subGroup, show only colors (no letter)
    const isStatusInTotal = col === 'Status' && subGroup === 'Total';

    return {
      displayValue: isStatusInTotal ? '' : (isLabelCol ? truncateText(formattedValue, LABEL_MAX_LENGTH) : formattedValue),
      fullValue: formattedValue,
      isLabel: isLabelCol,
      isTruncated: truncated,
    };
  }, [cellData, col, subGroup]);

  const cellId = `${rowKey}-${group}-${subGroup}-${col}`;
  const isTooltipVisible = activeTooltip === cellId;

  const className = useMemo(() => {
    const headerName = getDisplayName(col);
    // Use fullValue for class calculation so Status colors work even when displayValue is empty
    let cls = `${getCellClassName(headerName, fullValue, subGroup)} ${extraClassName || ''}`;
    if (isTruncated) {
      cls += ' truncated';
    }
    return cls;
  }, [col, fullValue, subGroup, extraClassName, isTruncated]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isTruncated) {
      e.stopPropagation();
      onTooltipToggle(isTooltipVisible ? null : cellId);
    }
  }, [isTruncated, isTooltipVisible, cellId, onTooltipToggle]);

  return (
    <td
      key={cellId}
      className={className.trim()}
      onClick={handleClick}
    >
      {displayValue}
      {isTruncated && isTooltipVisible && (
        <div className="label-tooltip">
          {fullValue}
        </div>
      )}
    </td>
  );
});

TableCell.displayName = 'TableCell';

// Progress bar cell component for Total Freq% column
const ProgressCell = memo<{
  value: string;
  objective: number;
  frequency: number;
  className: string;
}>(({ value, objective, frequency, className }) => {
  const percent = objective > 0 ? (frequency / objective) * 100 : 0;
  const status = getStatusFromPercent(percent);

  return (
    <td className={`${className} cell-with-progress`}>
      <div className={`cell-progress-wrapper status-${status}`}>
        <span className="cell-progress-value">{value}</span>
        <div className="cell-progress-bar">
          <div
            className="cell-progress-fill"
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      </div>
    </td>
  );
});

ProgressCell.displayName = 'ProgressCell';

// Memoized table row component
const TableRow = memo<{
  rowKey: string;
  rowData: QuotaData[string];
  visibleStypes: VisibleStypes;
  activeTooltip: string | null;
  onTooltipToggle: (cellId: string | null) => void;
  showVisualIndicators?: boolean;
}>(({ rowKey, rowData, visibleStypes, activeTooltip, onTooltipToggle, showVisualIndicators = false }) => {
  // Calculate row status based on Total data (only for rows with actual data)
  const rowStatus = useMemo(() => {
    if (!showVisualIndicators) return null;
    const totalData = rowData?.Total?.Total || rowData?.Total || {};
    const objective = parseInt(totalData.TotalObjective) || 0;
    const frequency = parseInt(totalData.Frequency) || 0;
    // Only show status if both objective and frequency have meaningful values
    if (objective > 0 && frequency > 0) {
      const percent = (frequency / objective) * 100;
      return getStatusFromPercent(percent);
    }
    return null;
  }, [rowData, showVisualIndicators]);

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

          // Render progress bar for Total Freq% column (only if visual indicators enabled and has actual data)
          const isProjectTotal = (group.startsWith('blankSpace') || group.startsWith('Project')) && subGroup === 'Total' && col === 'Freq%';
          if (showVisualIndicators && isProjectTotal && cellData) {
            const objective = parseInt(cellData.TotalObjective as string) || 0;
            const frequency = parseInt(cellData.Frequency as string) || 0;
            const freqPercent = cellData['Freq%']?.toString() || '';
            const headerName = getDisplayName(col);
            const baseClassName = `${getCellClassName(headerName, freqPercent, subGroup)} ${extraClassName || ''}`;

            // Only show progress bar if there's meaningful data (not header rows)
            if (objective > 0 && frequency > 0) {
              return (
                <ProgressCell
                  key={`${rowKey}-${group}-${subGroup}-${col}`}
                  value={freqPercent}
                  objective={objective}
                  frequency={frequency}
                  className={baseClassName}
                />
              );
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
              extraClassName={extraClassName}
              activeTooltip={activeTooltip}
              onTooltipToggle={onTooltipToggle}
            />
          );
        });
      })
    );
  }, [rowKey, rowData, visibleStypes, activeTooltip, onTooltipToggle, showVisualIndicators]);

  const rowClassName = rowStatus ? `row-status-${rowStatus}` : '';

  return <tr key={rowKey} className={rowClassName}>{cells}</tr>;
});

TableRow.displayName = 'TableRow';

// Main component
const QuotaManagementTable: React.FC<Props> = memo(({
  id,
  quotaData,
  visibleStypes,
  showVisualIndicators = false,
  visibleColumns = DEFAULT_VISIBLE_COLUMNS,
  visibleModes = DEFAULT_VISIBLE_MODES,
}) => {
  // State for tracking which tooltip is active
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Callback to toggle tooltip
  const handleTooltipToggle = useCallback((cellId: string | null) => {
    setActiveTooltip(cellId);
  }, []);

  // Close tooltip when clicking outside
  useEffect(() => {
    if (!activeTooltip) return;

    const handleClickOutside = () => {
      setActiveTooltip(null);
    };

    // Use timeout to prevent immediate close from the same click
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeTooltip]);

  // Filter visibleStypes based on visibleColumns and visibleModes
  const filteredStypes = useMemo(() => {
    const result: VisibleStypes = {};

    Object.entries(visibleStypes).forEach(([group, subGroups]) => {
      // Filter out mode groups (Phone/Web) if not in visibleModes
      // Keep blankSpace and Project groups always visible
      const isBlankOrProject = group.startsWith('blankSpace') || group.startsWith('Project');
      const isModeGroup = group === 'Phone' || group === 'Web';

      if (isModeGroup && !visibleModes.includes(group)) {
        return; // Skip this group
      }

      const filteredSubGroups: { [subKey: string]: string | string[] } = {};

      Object.entries(subGroups).forEach(([subGroup, cols]) => {
        const colsArray = Array.isArray(cols) ? cols : [cols];
        // Label column is always visible, filter other columns
        const filteredCols = colsArray.filter(col =>
          col === 'Label' || visibleColumns.includes(col)
        );

        if (filteredCols.length > 0) {
          filteredSubGroups[subGroup] = filteredCols.length === 1 ? filteredCols[0] : filteredCols;
        }
      });

      if (Object.keys(filteredSubGroups).length > 0) {
        result[group] = filteredSubGroups;
      }
    });

    return result;
  }, [visibleStypes, visibleColumns, visibleModes]);

  // Memoized column groups for better performance
  const columnGroups = useMemo(() => {
    return Object.entries(filteredStypes).flatMap(([group, subGroups]) =>
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
  }, [filteredStypes]);

  // Memoized header rows
  const headerRows = useMemo(() => {
    // First header row - main groups
    const firstRow = Object.entries(filteredStypes).map(([group, subGroups]) => {
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
    const secondRow = Object.entries(filteredStypes).flatMap(([group, subGroups]) =>
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
    const thirdRow = Object.entries(filteredStypes).flatMap(([group, subGroups]) => {
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
  }, [filteredStypes]);

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
        visibleStypes={filteredStypes}
        activeTooltip={activeTooltip}
        onTooltipToggle={handleTooltipToggle}
        showVisualIndicators={showVisualIndicators}
      />
    ));
  }, [quotaData, filteredStypes, activeTooltip, handleTooltipToggle, showVisualIndicators]);

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