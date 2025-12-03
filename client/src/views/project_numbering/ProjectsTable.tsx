import React from 'react';
import Icon from '@mdi/react';
import {
  mdiPencilOutline,
  mdiTrashCanOutline,
  mdiUnfoldMoreHorizontal,
  mdiChevronUp,
  mdiChevronDown
} from '@mdi/js';

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
      return <Icon path={mdiUnfoldMoreHorizontal} size={0.6} className="sort-icon inactive" />;
    }
    return sortOrder === 'ASC' ? (
      <Icon path={mdiChevronUp} size={0.6} className="sort-icon active" />
    ) : (
      <Icon path={mdiChevronDown} size={0.6} className="sort-icon active" />
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const [year, month, day] = dateString.split('T')[0].split('-');
      return `${month}/${day}/${year}`;
    } catch {
      return '-';
    }
  };

  const getModeDisplay = (modes) => {
    if (!modes || modes.length === 0) {
      return '-';
    }

    const hasPhone = modes.includes(1) || modes.includes(2);
    const hasWeb = modes.includes(3) || modes.includes(4) ||
                   modes.includes(5) || modes.includes(6);

    if (hasPhone && hasWeb) {
      return 'Mix';
    }

    if (hasPhone && !hasWeb) {
      return 'Phone';
    }

    if (hasWeb && !hasPhone) {
      return 'Web';
    }

    return '-';
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
            <th>Mode</th>
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
                    <Icon path={mdiPencilOutline} size={0.75} />
                  </button>
                  <button
                    className="btn-icon btn-delete"
                    onClick={() => onDelete(project)}
                    title="Delete Project"
                  >
                    <Icon path={mdiTrashCanOutline} size={0.75} />
                  </button>
                </div>
              </td>
              <td>{project.projectID}</td>
              <td>{project.clientProjectID || '-'}</td>
              <td className="col-name">{project.projectName}</td>
              <td>{project.NSize || '-'}</td>
              <td>{getModeDisplay(project.modes)}</td>
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
  );
};

export default ProjectsTable;
