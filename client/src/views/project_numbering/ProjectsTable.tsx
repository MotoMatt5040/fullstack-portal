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
            <th className="col-sortable" onClick={() => onSort('number')}>
              # {getSortIcon('number')}
            </th>
            <th className="col-sortable" onClick={() => onSort('client_proj_id')}>
              Client Proj ID {getSortIcon('client_proj_id')}
            </th>
            <th className="col-sortable col-name" onClick={() => onSort('name')}>
              Project Name {getSortIcon('name')}
            </th>
            <th className="col-sortable" onClick={() => onSort('ne')}>
              N= {getSortIcon('ne')}
            </th>
            <th className="col-sortable" onClick={() => onSort('client_time')}>
              Client Time {getSortIcon('client_time')}
            </th>
            <th className="col-sortable" onClick={() => onSort('promark_time')}>
              Promark Time {getSortIcon('promark_time')}
            </th>
            <th className="col-sortable" onClick={() => onSort('DP')}>
              DP {getSortIcon('DP')}
            </th>
            <th className="col-sortable" onClick={() => onSort('start_date')}>
              Start Date {getSortIcon('start_date')}
            </th>
            <th className="col-sortable" onClick={() => onSort('end_date')}>
              End Date {getSortIcon('end_date')}
            </th>
            <th className="col-sortable" onClick={() => onSort('client')}>
              Client {getSortIcon('client')}
            </th>
            <th className="col-sortable" onClick={() => onSort('contact_name')}>
              Contact {getSortIcon('contact_name')}
            </th>
            <th>Contact #</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id} className={getRowClass(project.start_date)}>
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
              <td>{project.number}</td>
              <td>{project.client_proj_id || '-'}</td>
              <td className="col-name">{project.name}</td>
              <td>{project.ne || '-'}</td>
              <td>{project.client_time || '-'}</td>
              <td>{project.promark_time || '-'}</td>
              <td>
                <span className={`badge ${project.DP ? 'badge-yes' : 'badge-no'}`}>
                  {project.DP ? 'Yes' : 'No'}
                </span>
              </td>
              <td>{formatDate(project.start_date)}</td>
              <td>{formatDate(project.end_date)}</td>
              <td>{project.client || '-'}</td>
              <td>{project.contact_name || '-'}</td>
              <td>{project.contact_number || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProjectsTable;