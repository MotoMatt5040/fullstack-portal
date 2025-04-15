import React, { useState } from 'react';
import './css/MyTable.css';

const MyTable = ({ className = 'MyTable', data, columnKeyMap, reverseThresholds = ['offCph'], isLive = false }) => {

  const columnHeaders = Object.keys(columnKeyMap);
  const [sortConfig, setSortConfig] = useState([]);

  const handleSort = (header) => {
    const key = columnKeyMap[header];
    setSortConfig((prev) => {
      const existing = prev.find((s) => s.key === key);
      if (existing) {
        if (existing.direction === 'asc') {
          return prev.map((s) => s.key === key ? { key, direction: 'desc' } : s);
        } else if (existing.direction === 'desc') {
          return prev.filter((s) => s.key !== key); // remove the sort entirely
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

  const highlightCellColor = (cellValue, threshold, columnName) => {
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

  return (
    <table className={className}>
      <thead>
        <tr>
          {columnHeaders.map((header) => (
            <th key={header} onClick={() => handleSort(header)} style={{ cursor: 'pointer' }}>
              {header}
              {(() => {
  const sortEntry = sortConfig.find(sc => sc.key === columnKeyMap[header]);
  if (!sortEntry) return null;
  return sortEntry.direction === 'asc' ? ' ▲' : ' ▼';
})()}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sortedData.map((row, index) => (
          <tr key={index}>
            {columnHeaders.map((header) => {
              const key = columnKeyMap[header];
              const cellValue = row?.[key] ?? 'N/A';
              const thresholdKey = `${key}Threshold`;
              const threshold = row?.[thresholdKey];
              const cellClass = threshold ? highlightCellColor(cellValue, threshold, key) : '';
              const blinkingClass = isLive ? 'blinking' : '';
              return (
                <td className={`${header} ${cellClass} ${blinkingClass}`} key={header}>
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
