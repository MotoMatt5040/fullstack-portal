import React from 'react';
import ExcelJS from 'exceljs';
import saveAs from 'file-saver';

interface ExportExcelButtonProps {
  tableId: string;
  // fileName?: string;
}

const ExportExcelButton: React.FC<ExportExcelButtonProps> = ({
  tableId,
  // fileName,
}) => {
  const exportExcel = async () => {
    console.log(tableId)
    const table = document.getElementById(tableId) as HTMLTableElement | null;
    const fileName = tableId
    console.log(table)
    if (!table) {
      alert('Table not found');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet 1');

    const headers = Array.from(table.querySelectorAll('thead th')).map(
      (th) => th.innerText
    );
    worksheet.addRow(headers);

    const rows = Array.from(table.querySelectorAll('tbody tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td')).map((td) => td.innerText)
    );
    rows.forEach((row) => worksheet.addRow(row));

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, fileName);
  };

  return <button onClick={exportExcel}>Export to Excel</button>;
};

export default ExportExcelButton;
