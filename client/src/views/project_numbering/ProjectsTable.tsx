import React from 'react';
import { FaEdit, FaTrash, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';

const ProjectsTable = ({
  projects,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
}) => {
  const getSortIcon = (column) => {
    if (sortBy !== column) {
      return <FaSort className="sort-icon inactive" />;
    }
    return sortOrder === 'ASC' ? (
      <FaSortUp className="sort-icon active" />
    ) : (
      <FaSortDown className="sort-icon active" />
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    } catch {
      return dateString;
    }
  };

  const getProjectTypeName = (projectType) => {
    const projectTypeMap = {
      1: 'Landline',
      2: 'Cell',
      3: 'Web',
      4: 'Phone',
      5: 'Mix',
    };
    return projectTypeMap[projectType] || '-';
  };

  const getRowClass = (startDate) => {
    if (!startDate) return '';
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const projectDate = new Date(startDate);
    
    if (projectDate.toDateString() === today.toDateString()) {
      return 'row-today';
    } else if (projectDate.toDateString() === yesterday.toDateString()) {
      return 'row-yesterday';
    }
    return '';
  };

  if (isLoading) {
    return (
      <div className="table-loading">
        <div className="spinner"></div>
        <p>Loading projects...</p>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="table-empty">
        <p>No projects found</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="projects-table">
        <thead>
          <tr>
            <th className="col-actions">Actions</th>
            <th className="col-sortable" onClick={() => onSort('projectID')}>
              # {getSortIcon('projectID')}
            </th>
            <th className="col-sortable" onClick={() => onSort('clientProjectID')}>
              Client Proj ID {getSortIcon('clientProjectID')}
            </th>
            <th className="col-sortable col-name" onClick={() => onSort('projectName')}>
              Project Name {getSortIcon('projectName')}
            </th>
            <th className="col-sortable" onClick={() => onSort('NSize')}>
              N= {getSortIcon('NSize')}
            </th>
            {/* <th className="col-sortable" onClick={() => onSort('clientTime')}>
              Client Time {getSortIcon('clientTime')}
            </th>
            <th className="col-sortable" onClick={() => onSort('promarkTime')}>
              Promark Time {getSortIcon('promarkTime')}
            </th> */}
            <th className="col-sortable" onClick={() => onSort('projectType')}>
              Type {getSortIcon('projectType')}
            </th>
            <th className="col-sortable" onClick={() => onSort('dataProcessing')}>
              DP {getSortIcon('dataProcessing')}
            </th>
            <th className="col-sortable" onClick={() => onSort('multiCallID')}>
              Multi Call {getSortIcon('multiCallID')}
            </th>
            <th className="col-sortable" onClick={() => onSort('startDate')}>
              Start Date {getSortIcon('startDate')}
            </th>
            <th className="col-sortable" onClick={() => onSort('endDate')}>
              End Date {getSortIcon('endDate')}
            </th>
            <th className="col-sortable" onClick={() => onSort('client')}>
              Client {getSortIcon('client')}
            </th>
            <th className="col-sortable" onClick={() => onSort('contactName')}>
              Contact {getSortIcon('contactName')}
            </th>
            <th>Contact #</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.projectID} className={getRowClass(project.startDate)}>
              <td className="col-actions">
                <div className="action-buttons">
                  <button
                    className="btn-icon btn-edit"
                    onClick={() => onEdit(project)}
                    title="Edit Project"
                  >
                    <FaEdit />
                  </button>
                  <button
                    className="btn-icon btn-delete"
                    onClick={() => onDelete(project)}
                    title="Delete Project"
                  >
                    <FaTrash />
                  </button>
                </div>
              </td>
              <td>{project.projectID}</td>
              <td>{project.clientProjectID || '-'}</td>
              <td className="col-name">{project.projectName}</td>
              <td>{project.NSize || '-'}</td>
              {/* <td>{project.clientTime || '-'}</td> */}
              {/* <td>{project.promarkTime || '-'}</td> */}
              <td>{getProjectTypeName(project.projectType)}</td>
              <td>
                <span className={`badge ${project.dataProcessing ? 'badge-yes' : 'badge-no'}`}>
                  {project.dataProcessing ? 'Yes' : 'No'}
                </span>
              </td>
              <td>
                <span className={`badge ${project.multiCallID ? 'badge-yes' : 'badge-no'}`}>
                  {project.multiCallID ? 'Yes' : 'No'}
                </span>
              </td>
              <td>{formatDate(project.startDate)}</td>
              <td>{formatDate(project.endDate)}</td>
              <td>{project.client || '-'}</td>
              <td>{project.contactName || '-'}</td>
              <td>{project.contactNumber || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProjectsTable;