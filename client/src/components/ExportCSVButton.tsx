import React from 'react';

interface ExportCSVButtonProps {
  tableId: string;
}

const ExportCSVButton: React.FC<ExportCSVButtonProps> = ({ tableId }) => {
  const exportToCSV = () => {
    const table = document.getElementById(tableId) as HTMLTableElement | null;
    console.log(tableId)
    const fileName = `${tableId}.csv`;
    if (!table) {
      alert('Table not found');
      return;
    }

    let csv = '';
    const rows = table.querySelectorAll('tr');

    rows.forEach((row) => {
      const cells = Array.from(row.querySelectorAll('th, td')).map((cell) =>
        `"${cell.textContent?.trim().replace(/"/g, '""')}"`
      );
      csv += cells.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button className="button" onClick={exportToCSV}>
      Export to CSV
    </button>
  );
};

export default ExportCSVButton;
