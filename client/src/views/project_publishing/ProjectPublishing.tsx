import React from 'react';
import useProjectPublishingLogic from './useProjectPublishingLogic';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faChevronDown, faChevronRight, faExpandArrowsAlt, faCompressArrowsAlt } from '@fortawesome/free-solid-svg-icons';
import './ProjectPublishing.css';

// Define the shape of a published project
interface PublishedProject {
  uuid: string;
  email: string;
  projectid: string;
  clientid: number;
  clientname: string;
}

interface GroupedProject {
  projectid: string;
  clientname: string;
  users: PublishedProject[];
  userCount: number;
}

const ProjectPublishing: React.FC = () => {
  const {
    filteredProjects,
    isLoading,
    isSuccess,
    isError,
    error,
    searchTerm,
    setSearchTerm,
    handleRefresh,
    toggleProjectExpansion,
    isProjectExpanded,
    expandAll,
    collapseAll,
  } = useProjectPublishingLogic();

  let content;

  if (isLoading) content = <p>Loading published projects...</p>;

  if (isError) {
    content = (
      <div className="error-container">
        <p className="errmsg">
          {/* @ts-ignore */}
          {error?.data?.message || 'An error occurred while loading projects'}
        </p>
        <button onClick={handleRefresh} className="retry-button">
          <FontAwesomeIcon icon={faSync} /> Try Again
        </button>
      </div>
    );
  }

  if (isSuccess) {
    const tableContent = filteredProjects && filteredProjects.length > 0 ? (
      filteredProjects.map((project: GroupedProject) => {
        const projectKey = `${project.projectid}-${project.clientname}`;
        const isExpanded = isProjectExpanded(projectKey);
        
        return (
          <React.Fragment key={projectKey}>
            {/* Main project row */}
            <tr 
              className="table__row project-row" 
              onClick={() => toggleProjectExpansion(projectKey)}
            >
              <td className="table__cell project-toggle">
                <FontAwesomeIcon 
                  icon={isExpanded ? faChevronDown : faChevronRight} 
                  className="toggle-icon"
                />
                {project.projectid}
              </td>
              <td className="table__cell">{project.clientname}</td>
              <td className="table__cell user-count">
                {project.userCount} user{project.userCount !== 1 ? 's' : ''}
              </td>
            </tr>
            
            {/* Expanded user rows */}
            {isExpanded && project.users.map((user: PublishedProject, index: number) => (
              <tr key={`${user.uuid}-${user.projectid}-${index}`} className="table__row user-row">
                <td className="table__cell user-email">
                  <span className="user-indent">└─ {user.email}</span>
                </td>
                <td className="table__cell user-client">
                  <span className="user-uuid">{user.uuid}</span>
                </td>
                <td className="table__cell user-count-placeholder"></td>
              </tr>
            ))}
          </React.Fragment>
        );
      })
    ) : (
      <tr>
        <td className="table__cell" colSpan={3} style={{ textAlign: 'center' }}>
          {searchTerm ? 'No projects found matching your search.' : 'No published projects found.'}
        </td>
      </tr>
    );

    content = (
      <>
        <div className="project-publishing-header">
          <h1 className="project-publishing-title">Project Publishing</h1>
          <div className="header-actions">
            <button onClick={expandAll} className="expand-button" title="Expand All">
              <FontAwesomeIcon icon={faExpandArrowsAlt} /> Expand All
            </button>
            <button onClick={collapseAll} className="collapse-button" title="Collapse All">
              <FontAwesomeIcon icon={faCompressArrowsAlt} /> Collapse All
            </button>
            <button onClick={handleRefresh} className="refresh-button">
              <FontAwesomeIcon icon={faSync} /> Refresh
            </button>
          </div>
        </div>
        <div className="project-publishing-controls">
          <input
            type="text"
            placeholder="Search by project ID, client name, or user email..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        {searchTerm && filteredProjects && (
          <div className="results-summary">
            <p>
              Showing {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} for "{searchTerm}"
            </p>
          </div>
        )}
        <div className="table-container">
          <table className="table table--projects">
            <thead className="table__thead">
              <tr>
                <th scope="col" className="table__th project__id">Project ID</th>
                <th scope="col" className="table__th project__client">Client Name</th>
                <th scope="col" className="table__th project__users">Users</th>
              </tr>
            </thead>
            <tbody>{tableContent}</tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <section className="project-publishing-container">
      {content}
    </section>
  );
};

export default ProjectPublishing;