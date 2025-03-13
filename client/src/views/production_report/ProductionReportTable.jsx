import React from 'react';
import './productionReportTable.css';

const ProductionReportTable = ({ data }) => {

  const handleCellClick = (eid) => {
    console.log('cell: ', eid);
  };

  const handleRowClick = (eid) => {
    console.log('row: ', eid);
  };

  return (
    <section>
      <table>
        <thead>
          <tr>
            <th>EID</th>
            <th>Ref Name</th>
            <th>Rec Loc</th>
            <th>Tenure</th>
            <th>Hrs</th>
            <th>Connect Time</th>
            <th>Pause Time</th>
            <th>CMS</th>
            <th>Intal</th>
            <th>MPH</th>
            <th>Total Dials</th>
          </tr>
        </thead>
        <tbody>
          {data.map((project) => ( // determine if making the whole row, or individual columns clickable is a better idea
            <tr className="clickable-row" onClick = {() => handleRowClick(project.eid)} key={project.eid}>
              <td onClick={() => handleCellClick(project.eid)} style={{ cursor: 'pointer', color: 'blue' }}>
                {project.eid}
              </td>
              {/* <td>{project.eid}</td> */}
              <td>{project.refname}</td>
              <td>{project.recloc}</td>
              <td>{project.tenure}</td>
              <td>{project.hrs}</td>
              <td>{project.connecttime}</td>
              <td>{project.pausetime}</td>
              <td>{project.cms}</td>
              <td>{project.intal}</td>
              <td>{project.mph}</td>
              <td>{project.totaldials}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

export default ProductionReportTable;
