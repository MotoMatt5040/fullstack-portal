import React from 'react';
import './css/MyTable.css';

const MyTable = ({ className = 'MyTable', data, columnKeyMap, reverseThresholds = ['offCph'] }) => {

  const columnHeaders = Object.keys(columnKeyMap);

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
            <th key={header}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => {
          return (
            <tr key={index}>
              {columnHeaders.map((header) => {
                const key = columnKeyMap[header]; 
                const cellValue = row?.[key] ?? 'N/A';
                const thresholdKey = `${columnKeyMap[header]}Threshold`;  
                const threshold = row?.[thresholdKey]; 
                const cellClass = threshold ? highlightCellColor(cellValue, threshold, columnKeyMap[header]) : '';
                return (
                  <td className={`${header} ${cellClass}`} key={header}>
                    {cellValue}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default MyTable;
