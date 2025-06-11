import React from 'react';
import ExcelJS from 'exceljs';
import saveAs from 'file-saver';

import './css/MyButton.css';

interface ExportExcelButtonProps {
  tableId: string;
}

const ExportExcelButton: React.FC<ExportExcelButtonProps> = ({ tableId }) => {
  const exportExcel = async () => {
    console.log(tableId);
    const table = document.getElementById(tableId) as HTMLTableElement | null;
    const fileName = tableId;
    console.log(table);
    if (!table) {
      alert('Table not found');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet 1');

    const theadRows = table.querySelectorAll('thead tr');
    theadRows.forEach((tr, rowIndex) => {
      const row = worksheet.getRow(rowIndex + 1);
      let colIndex = 1;

      tr.querySelectorAll('th').forEach((th) => {
        const colSpan = parseInt(th.getAttribute('colspan') || '1');
        const cell = row.getCell(colIndex);

        cell.value = th.innerText;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { bold: true };

        if (colSpan > 1) {
          const startCol = colIndex;
          const endCol = colIndex + colSpan - 1;
          worksheet.mergeCells(rowIndex + 1, startCol, rowIndex + 1, endCol);
        }

        colIndex += colSpan;
      });
    });

    const bodyRows = table.querySelectorAll('tbody tr');
    bodyRows.forEach((tr) => {
      const rowData = Array.from(tr.querySelectorAll('td')).map((td) => {
        const text = td.innerText.trim();
        const num = Number(text);
        return !isNaN(num) && text !== '' ? num : text;
      });

      const row = worksheet.addRow(rowData);

      row.eachCell((cell) => {
        const isNumeric = typeof cell.value === 'number';
        cell.alignment = {
          horizontal: isNumeric ? 'right' : 'left',
          vertical: 'middle',
          indent: isNumeric ? 1 : 0,
        };
      });
    });

    const firstHeaderRowNumber = 1;
    const lastHeaderRowNumber = theadRows.length;

    const firstHeaderRow = worksheet.getRow(firstHeaderRowNumber);
    const firstHeaderCellIndex = 1;
    const lastHeaderCellIndex = firstHeaderRow.cellCount;

    for (let i = firstHeaderCellIndex; i <= lastHeaderCellIndex; i++) {
      const topCell = worksheet.getRow(firstHeaderRowNumber).getCell(i);
      topCell.border = { ...(topCell.border || {}), top: { style: 'thick' } };

      const bottomCell = worksheet.getRow(lastHeaderRowNumber).getCell(i);
      bottomCell.border = {
        ...(bottomCell.border || {}),
        bottom: { style: 'thick' },
      };
    }

    for (let r = firstHeaderRowNumber; r <= lastHeaderRowNumber; r++) {
      const leftCell = worksheet.getRow(r).getCell(firstHeaderCellIndex);
      leftCell.border = {
        ...(leftCell.border || {}),
        left: { style: 'thick' },
      };

      const rightCell = worksheet.getRow(r).getCell(lastHeaderCellIndex);
      rightCell.border = {
        ...(rightCell.border || {}),
        right: { style: 'thick' },
      };
    }

    const totalRowNumber = lastHeaderRowNumber + 1; // assuming total row is next
    const totalRow = worksheet.getRow(totalRowNumber);

    const totalRowFirstCellIndex = 1;
    const totalRowLastCellIndex = totalRow.cellCount;

    const totalFirstCell = totalRow.getCell(totalRowFirstCellIndex);
    totalFirstCell.border = {
      ...(totalFirstCell.border || {}),
      top: { style: 'thick' },
      left: { style: 'thick' },
      bottom: { style: 'thick' },
    };

    const totalLastCell = totalRow.getCell(totalRowLastCellIndex);
    totalLastCell.border = {
      ...(totalLastCell.border || {}),
      top: { style: 'thick' },
      right: { style: 'thick' },
      bottom: { style: 'thick' },
    };

    for (let i = totalRowFirstCellIndex + 1; i < totalRowLastCellIndex; i++) {
      const cell = totalRow.getCell(i);
      cell.border = {
        ...(cell.border || {}),
        top: { style: 'thick' },
        bottom: { style: 'thick' },
      };
    }

    const startCol = 1;
    const endCol = worksheet.columnCount;

    const totalRows = worksheet.rowCount;
    const borderStyle = { style: 'thick' };

    const specialRows: number[] = [];
    for (let r = 1; r <= totalRows; r++) {
      const firstCellValue = worksheet.getRow(r).getCell(startCol).value;
      if (
        typeof firstCellValue === 'string' &&
        firstCellValue.includes('***')
      ) {
        specialRows.push(r);
      }
    }

    specialRows.push(totalRows + 1);

    for (let i = 0; i < specialRows.length - 1; i++) {
      const startRow = specialRows[i];
      const endRow = specialRows[i + 1] - 1;

      for (let r = startRow; r <= endRow; r++) {
        const row = worksheet.getRow(r);

        for (let c = startCol; c <= endCol; c++) {
          const cell = row.getCell(c);
          const border = cell.border || {};

          const left = c === startCol ? borderStyle : border.left;
          const right = c === endCol ? borderStyle : border.right;
          const top = r === startRow ? borderStyle : border.top;
          const bottom = r === endRow ? borderStyle : border.bottom;

          cell.border = {
            top,
            left,
            bottom,
            right,
          };
        }
      }
    }
    let colIndex = 1;

    theadRows[0].querySelectorAll('th').forEach((th) => {
      const colSpan = parseInt(th.getAttribute('colspan') || '1');
      const startCol = colIndex;
      const endCol = colIndex + colSpan - 1;

      for (let r = 1; r <= totalRows; r++) {
        const row = worksheet.getRow(r);

        const leftCell = row.getCell(startCol);
        leftCell.border = {
          ...(leftCell.border || {}),
          left: { style: 'thick' },
          top: leftCell.border?.top,
          bottom: leftCell.border?.bottom,
          right: leftCell.border?.right,
        };

        const rightCell = row.getCell(endCol);
        rightCell.border = {
          ...(rightCell.border || {}),
          right: { style: 'thick' },
          top: rightCell.border?.top,
          bottom: rightCell.border?.bottom,
          left: rightCell.border?.left,
        };
      }

      colIndex += colSpan;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, fileName);
  };

  return (
    <button className='button' onClick={exportExcel}>
      Export to Excel
    </button>
  );
};

export default ExportExcelButton;
