import React from 'react';
import ExcelJS from 'exceljs';
import saveAs from 'file-saver';

import './css/MyButton.css';

interface ExportExcelButtonProps {
	tableId: string;
}

// export numbers as numbers
// macro for formatting

const ExportExcelButton: React.FC<ExportExcelButtonProps> = ({
	tableId,
}) => {
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
			row.getCell(colIndex).value = th.innerText;

			if (colSpan > 1) {
				worksheet.mergeCells(rowIndex + 1, colIndex, rowIndex + 1, colIndex + colSpan - 1);
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
	worksheet.addRow(rowData);
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
