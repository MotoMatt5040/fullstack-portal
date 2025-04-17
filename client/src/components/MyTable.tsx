import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/MyTable.css';

interface MyTableProps {
  className?: string;
  data: Array<Record<string, any>>; // Array of objects with dynamic keys and values
  columnKeyMap: Record<string, string>; // Object mapping column names to keys
  clickParameters: string[]; // List of headers to be passed when row is clicked
  linkTo?: string; // Optional link to navigate to on row click (if applicable)
  reverseThresholds?: string[]; // List of column names with reversed thresholds
  isLive?: boolean; // Flag to determine if live data styling is applied
  isClickable?: boolean; // Flag to determine if row is clickable
}

const MyTable: React.FC<MyTableProps> = ({
  className = 'MyTable',
  data,
  columnKeyMap,
  clickParameters,
  linkTo,
  reverseThresholds = [],
  isLive = false,
  isClickable = false,
}) => {
  const navigate = useNavigate();
  const columnHeaders = Object.keys(columnKeyMap);
  const [sortConfig, setSortConfig] = useState<
    { key: string; direction: 'asc' | 'desc' }[]
  >([]);

  const handleSort = (header: string) => {
    const key = columnKeyMap[header];
    setSortConfig((prev) => {
      const existing = prev.find((s) => s.key === key);
      if (existing) {
        if (existing.direction === 'asc') {
          return prev.map((s) =>
            s.key === key ? { key, direction: 'desc' } : s
          );
        } else if (existing.direction === 'desc') {
          return prev.filter((s) => s.key !== key);
        }
      } else {
        return [...prev, { key, direction: 'asc' }];
      }
      return prev;
    });
  };

  const sortedData = [...data].sort((a, b) => {
    for (let { key, direction } of sortConfig) {
      const valA = a[key];
      const valB = b[key];
      if (valA !== valB) {
        if (typeof valA === 'number' && typeof valB === 'number') {
          return direction === 'asc' ? valA - valB : valB - valA;
        } else {
          return direction === 'asc'
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
        }
      }
    }
    return 0;
  });

  const highlightCellColor = (cellValue: any, threshold: number, columnName: string) => {
    const isReversed = reverseThresholds.includes(columnName);

    if (isReversed) {
      if (cellValue > threshold * 1.1) {
        return 'highlight-red';
      } else if (cellValue > threshold * 0.95) {
        return 'highlight-yellow';
      } else if (cellValue < threshold * 0.9) {
        return 'highlight-green';
      }
    } else {
      if (cellValue < threshold * 0.9) {
        return 'highlight-red';
      } else if (cellValue < threshold * 0.95) {
        return 'highlight-yellow';
      } else if (cellValue > threshold * 1.1) {
        return 'highlight-green';
      }
    }
    return '';
  };

  const handleRowClick = (row: any) => {
    if (linkTo) {
      if (clickParameters && Array.isArray(clickParameters)) {
        // Prepare query parameters from the clicked row based on `clickParameters`
        const queryParams = clickParameters.reduce((acc, param) => {
          if (row[param]) {
            acc[param] = row[param];
          }
          return acc;
        }, {} as Record<string, string>);

        // Create query string from parameters
        const queryString = new URLSearchParams(queryParams).toString();
        console.log(`${linkTo}?${queryString}`)

        // Navigate to the provided link, appending the query string
        // return;
        navigate(`${linkTo}?${queryString}`);
      }
    }
  };

  return (
    <table className={className}>
      <thead>
        <tr>
          {columnHeaders.map((header) => (
            <th
              key={header}
              onClick={() => handleSort(header)}
              style={{ cursor: 'pointer' }}
            >
              {header}
              {(() => {
                const sortEntry = sortConfig.find(
                  (sc) => sc.key === columnKeyMap[header]
                );
                if (!sortEntry) return null;
                return sortEntry.direction === 'asc' ? ' ▲' : ' ▼';
              })()}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sortedData.map((row, index) => (
          <tr
            key={index}
            onClick={isClickable ? () => handleRowClick(row) : undefined}
            style={{ cursor: isClickable ? 'pointer' : 'default' }}
          >
            {columnHeaders.map((header) => {
              const key = columnKeyMap[header];
              const cellValue = row?.[key] ?? 'N/A';
              const thresholdKey = `${key}Threshold`;
              const threshold = row?.[thresholdKey];
              const cellClass = threshold
                ? highlightCellColor(cellValue, threshold, key)
                : '';
              const blinkingClass = isLive ? 'blinking' : '';
              return (
                <td
                  className={`${header} ${cellClass} ${blinkingClass}`}
                  key={header}
                >
                  {cellValue}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default MyTable;
