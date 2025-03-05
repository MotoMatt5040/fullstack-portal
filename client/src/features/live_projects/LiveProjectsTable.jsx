import React from 'react';
import './liveProjectsTable.css';

const LiveProjectsTable = ({ data }) => {
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
          {data.map((project) => (
            <tr key={project.eid}>
              <td>{project.eid}</td>
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

export default LiveProjectsTable;
