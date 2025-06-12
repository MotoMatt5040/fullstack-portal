import React, { useState } from 'react';

type RowData = {
  Objective: number | string;
  'Obj%': number | string;
  Frequency: number | string;
  'Freq%': number | string;
  // 'G%': number | string;
  // '%': number | string;
  // 'S%': number | string;
  // 'CG%': number | string;
  // 'C%': number | string;
  // 'To Do': number | string;
  Label: string;
  StratumId: number;
  TotalObjective: number | string;
};

type QuotaData = {
  [key: string]: {
    [category: string]: RowData;
  };
};

interface Props {
  id?: string;
  quotaData: QuotaData;
  // subHeaders: string[];
  // visibleColumns: Record<
  //   string,
  //   {
  //     active: boolean;
  //     subColumns: Record<string, boolean>;
  //   }
  // >;
  isInternalUser?: boolean;
  visibleStypes?: string[];
}

const QuotaManagementTable: React.FC<Props> = ({
  id,
  quotaData,
  visibleStypes,
}) => {
  const [hovered, setHovered] = useState<{
    groupKey: string;
    headerKey: string;
    subKey: string;
  } | null>(null);

  return (
    <table id={id} className='quota-management-table'>
      {Object.entries(visibleStypes).flatMap(([group, subGroups]) =>
        Object.entries(subGroups).map(([subGroup, cols]) => {
          const colsArray = Array.isArray(cols) ? cols : [cols];
          return (
            <colgroup
              key={`colgroup-${group}-${subGroup}`}
              className={`colgroup ${subGroup
                .toLowerCase()
                .replace(/\s+/g, '-')}`}
              data-main-group={group}
              data-sub-group={subGroup}
            >
              {colsArray.map((col, i) => (
                <col
                  key={`${group}-${subGroup}-${col}-${i}`}
                  className={`col-${col.toLowerCase().replace(/\s+/g, '-')}`}
                  data-main-group={group}
                  data-sub-group={subGroup}
                  data-column={col}
                />
              ))}
            </colgroup>
          );
        })
      )}
      <thead>
        <tr>
          {Object.entries(visibleStypes).map(([group, subGroups]) => {
            const colspan = Object.values(subGroups).reduce((acc, cols) => {
              const colsArray = Array.isArray(cols) ? cols : [cols];
              return acc + colsArray.length;
            }, 0);
            return (
              <th key={`r1-${group}`} colSpan={colspan}>
                {group.startsWith('blankSpace') ? '' : group}
              </th>
            );
          })}
        </tr>
        <tr>
          {Object.entries(visibleStypes).flatMap(([group, subGroups]) =>
            Object.entries(subGroups).map(([subGroup, cols]) => {
              const colsArray = Array.isArray(cols) ? cols : [cols];
              return (
                <th key={`r2-${group}-${subGroup}`} colSpan={colsArray.length}>
                  {subGroup.startsWith('blankSpace') ? '' : subGroup}
                </th>
              );
            })
          )}
        </tr>
        <tr>
          {Object.entries(visibleStypes).flatMap(([group, subGroups]) =>
            Object.entries(subGroups).flatMap(([subGroup, cols]) => {
              const colsArray = Array.isArray(cols) ? cols : [cols];
              return colsArray.map((col) => {
                // Map column names to display names
                const getDisplayName = (columnName: string) => {
                  switch (columnName) {
                    case 'Status':
                      return 'S';
                    default:
                      return columnName;
                  }
                };

                return (
                  <th key={`r3-${group}-${subGroup}-${col}`}>
                    {getDisplayName(col)}
                  </th>
                );
              });
            })
          )}
        </tr>
      </thead>
      <tbody>
        {quotaData &&
          Object.entries(quotaData).map(([rowKey, rowData]) => {
            return (
              <tr key={rowKey}>
                {Object.entries(visibleStypes).flatMap(([group, subGroups]) =>
                  Object.entries(subGroups).flatMap(([subGroup, cols]) => {
                    // Add this defensive check
                    const colsArray = Array.isArray(cols) ? cols : [cols];
                    return colsArray.map((col) => {
                      let cellData;

                      if (group.startsWith('blankSpace')) {
                        // Handle special case for row labels - get from total.total or just total
                        cellData = rowData.Total?.Total || rowData.Total;
                        // console.log('BlankSpace cellData:', cellData, 'for col:', col);
                      } else {
                        // Check if this group exists in the row data
                        if (!rowData[group]) {
                          // If the group doesn't exist, render empty cell
                          return (
                            <td key={`${rowKey}-${group}-${subGroup}-${col}`}>
                              -
                            </td>
                          );
                        }

                        // Check if this subGroup exists within the group
                        if (!rowData[group][subGroup]) {
                          return (
                            <td key={`${rowKey}-${group}-${subGroup}-${col}`}>
                              -
                            </td>
                          );
                        }

                        cellData = rowData[group][subGroup];
                      }

                      if (!cellData) {
                        return (
                          <td key={`${rowKey}-${group}-${subGroup}-${col}`}>
                            -
                          </td>
                        );
                      }

                      // Map column names to data keys
                      let value;
                      switch (col) {
                        case 'Label':
                          value = cellData.Label;
                          break;
                        case 'Obj':
                          value = cellData.TotalObjective;
                          break;
                        case 'Obj%':
                          value = cellData['Obj%'];
                          break;
                        case 'Freq':
                          value = cellData.Frequency;
                          break;
                        case 'Freq%':
                          value = cellData['Freq%'];
                          break;
                        case 'To Do':
                          value = cellData['To Do'];
                          break;
                        default:
                          value = cellData[col];
                      }

                      const className = `cell-${col
                        .toLowerCase()
                        .replace(/\s+/g, '-')} ${
                          value === 'O'
                            ? 'open'
                            : value === 'C'
                            ? 'closed'
                            : value === 'H'
                            ? 'half-open'
                            : ''
                        }`;

                      switch (value) {
                        case undefined:
                        case null:
                        case 0:
                        // case 0.0:
                        case '0':
                        case '0.0':
                          value = '-';
                          break;
                        default:
                          value = String(value);
                      }

                      return (
                        <td
                          key={`${rowKey}-${group}-${subGroup}-${col}`}
                          className={className}
                        >
                          {value}
                        </td>
                      );
                    });
                  })
                )}
              </tr>
            );
          })}
      </tbody>
    </table>
  );
};

export default QuotaManagementTable;
