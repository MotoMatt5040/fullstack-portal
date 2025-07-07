import React from 'react';
import useProjectPublishingLogic from './useProjectPublishingLogic';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSync,
  faChevronDown,
  faChevronRight,
  faExpandArrowsAlt,
  faCompressArrowsAlt,
  faPlus,
  faEdit,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { Modal } from '../../components/Modal';
import Select from 'react-select';
import './ProjectPublishing.css';

const ProjectPublishing: React.FC = () => {
  const {
    // Data
    filteredProjects,
    allUsers,
    
    // Loading states
    isLoading,
    isSuccess,
    isError,
    error,
    isPublishing,
    
    // Search functionality
    searchTerm,
    setSearchTerm,
    
    // Expansion functionality
    toggleProjectExpansion,
    isProjectExpanded,
    expandAll,
    collapseAll,
    
    // Modal state
    isModalOpen,
    isEditModalOpen,
    editingProject,
    
    // Select options and state
    projectOptions,
    clientOptions,
    userOptions,
    allUserOptions,
    selectedProjectOption,
    selectedClientOption,
    selectedUsers,
    usersForClient,
    
    // Handlers
    handleRefresh,
    handleOpenModal,
    handleCloseModal,
    handleOpenEditModal,
    handleCloseEditModal,
    handleProjectChange,
    handleClientChange,
    handleUserChange,
    handlePublishProject,
    handleUnpublishProjectInline,
    handleUpdateProject,
  } = useProjectPublishingLogic();

  let content;

  if (isLoading) content = <p>Loading published projects...</p>;

  if (isError) {
    content = (
      <div className='error-container'>
        <p className='errmsg'>
          {/* @ts-ignore */}
          {error?.data?.message || 'An error occurred while loading projects'}
        </p>
        <button onClick={handleRefresh} className='retry-button'>
          <FontAwesomeIcon icon={faSync} /> Try Again
        </button>
      </div>
    );
  }

  if (isSuccess) {
    const tableContent =
      filteredProjects && filteredProjects.length > 0 ? (
        filteredProjects.map((project: any) => {
          const projectKey = `${project.projectid}-${project.clientname}`;
          const isExpanded = isProjectExpanded(projectKey);

          return (
            <React.Fragment key={projectKey}>
              {/* Main project row */}
              <tr className='table__row project-row'>
                <td 
                  className='table__cell project-toggle'
                  onClick={() => toggleProjectExpansion(projectKey)}
                >
                  <FontAwesomeIcon
                    icon={isExpanded ? faChevronDown : faChevronRight}
                    className='toggle-icon'
                  />
                  {project.projectid} - {project.projectname}
                </td>
                <td 
                  className='table__cell'
                  onClick={() => toggleProjectExpansion(projectKey)}
                >
                  {project.clientname}
                </td>
                <td 
                  className='table__cell user-count'
                  onClick={() => toggleProjectExpansion(projectKey)}
                >
                  {project.userCount} user{project.userCount !== 1 ? 's' : ''}
                </td>
                <td className='table__cell actions-cell'>
                  <div className='action-buttons'>
                    <button
                      className='edit-button'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(project);
                      }}
                      title='Edit project users'
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button
                      className='unpublish-button-inline'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnpublishProjectInline(project);
                      }}
                      title='Unpublish project from all users'
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </td>
              </tr>

              {/* Expanded user rows */}
              {isExpanded &&
                project.users.map((user: any, index: number) => (
                  <tr
                    key={`${user.uuid}-${user.projectid}-${index}`}
                    className='table__row user-row'
                  >
                    <td className='table__cell user-email'>
                      <span className='user-indent'>└─ {user.email}</span>
                    </td>
                    <td className='table__cell user-client'>
                      <span className='user-uuid'>{user.uuid}</span>
                    </td>
                    <td className='table__cell user-count-placeholder'></td>
                    <td className='table__cell actions-cell'></td>
                  </tr>
                ))}
            </React.Fragment>
          );
        })
      ) : (
        <tr>
          <td
            className='table__cell'
            colSpan={4}
            style={{ textAlign: 'center' }}
          >
            {searchTerm
              ? 'No projects found matching your search.'
              : 'No published projects found.'}
          </td>
        </tr>
      );

    content = (
      <>
        <div className='project-publishing-header'>
          <h1 className='project-publishing-title'>Project Publishing</h1>
          <div className='header-actions'>
            <button onClick={handleOpenModal} className='add-user-button'>
              <FontAwesomeIcon icon={faPlus} /> Publish Project
            </button>
            <button
              onClick={expandAll}
              className='expand-button'
              title='Expand All'
            >
              <FontAwesomeIcon icon={faExpandArrowsAlt} /> Expand All
            </button>
            <button
              onClick={collapseAll}
              className='collapse-button'
              title='Collapse All'
            >
              <FontAwesomeIcon icon={faCompressArrowsAlt} /> Collapse All
            </button>
            <button onClick={handleRefresh} className='refresh-button'>
              <FontAwesomeIcon icon={faSync} /> Refresh
            </button>
          </div>
        </div>
        <div className='project-publishing-controls'>
          <input
            type='text'
            placeholder='Search by project ID, client name, or user email...'
            className='search-input'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoComplete='new-password'
          />
        </div>
        {searchTerm && filteredProjects && (
          <div className='results-summary'>
            <p>
              Showing {filteredProjects.length} project
              {filteredProjects.length !== 1 ? 's' : ''} for "{searchTerm}"
            </p>
          </div>
        )}
        <div className='table-container'>
          <table className='table table--projects'>
            <thead className='table__thead'>
              <tr>
                <th scope='col' className='table__th project__id'>
                  Project ID
                </th>
                <th scope='col' className='table__th project__client'>
                  Client Name
                </th>
                <th scope='col' className='table__th project__users'>
                  Users
                </th>
                <th scope='col' className='table__th project__actions'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>{tableContent}</tbody>
          </table>
        </div>
      </>
    );
  }

  // Determine which user options to show based on client selection
  const getCurrentUserOptions = () => {
    if (selectedClientOption && usersForClient) {
      return userOptions; // Client-filtered users
    }
    return allUserOptions; // All users
  };

  return (
    <section className='project-publishing-container'>
      {content}
      
      {/* Publish Project Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <form onSubmit={handlePublishProject} noValidate>
          <h2>Publish Project</h2>
          <div className='form-grid'>
            <div className='form-group'>
              <label htmlFor='project-id'>Project ID</label>
              <Select
                classNamePrefix='my-select'
                inputId='project-id'
                options={projectOptions}
                value={selectedProjectOption}
                onChange={handleProjectChange}
                placeholder='Select a Project'
                isClearable
                menuPortalTarget={document.body}
                styles={{
                  menuPortal: (base) => ({
                    ...base,
                    zIndex: 999,
                  }),
                }}
              />
            </div>
            <div className='form-group'>
              <label htmlFor='client'>Client (Optional Filter)</label>
              <Select
                classNamePrefix='my-select'
                inputId='client'
                options={clientOptions}
                value={selectedClientOption}
                onChange={handleClientChange}
                placeholder='Select a Client to Filter Users (Optional)'
                isClearable
                menuPortalTarget={document.body}
                styles={{
                  menuPortal: (base) => ({
                    ...base,
                    zIndex: 9999999,
                  }),
                }}
              />
              <small className="form-help-text">
                {selectedClientOption 
                  ? 'Showing users for selected client only' 
                  : 'Showing all users - select a client above to filter'}
              </small>
            </div>

            <div className='form-group'>
              <label htmlFor='users'>
                Users {selectedClientOption ? `(${selectedClientOption.label})` : '(All)'}
              </label>
              <Select
                classNamePrefix='my-select'
                inputId='users'
                options={getCurrentUserOptions()}
                value={selectedUsers}
                onChange={handleUserChange}
                placeholder={selectedClientOption ? 'Select users from client' : 'Select users (all available)'}
                isMulti
                closeMenuOnSelect={false}
                menuPortalTarget={document.body}
                styles={{
                  menuPortal: (base) => ({
                    ...base,
                    zIndex: 9999999,
                  }),
                }}
              />
            </div>
          </div>
          <button
            type='submit'
            className='submit-button'
            disabled={isPublishing}
          >
            {isPublishing ? 'Publishing...' : 'Publish Project'}
          </button>
        </form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal isOpen={isEditModalOpen} onClose={handleCloseEditModal}>
        <form onSubmit={handleUpdateProject} noValidate>
          <h2>Edit Project Publishing</h2>
          {editingProject && (
            <>
              <div className='project-info'>
                <p><strong>Project:</strong> {editingProject.projectid} - {editingProject.projectname}</p>
                <p><strong>Client:</strong> {editingProject.clientname}</p>
              </div>
              
              <div className='form-group'>
                <label htmlFor='edit-users'>Users</label>
                <Select
                  classNamePrefix='my-select'
                  inputId='edit-users'
                  options={userOptions}
                  value={selectedUsers}
                  onChange={handleUserChange}
                  placeholder='Select users'
                  isMulti
                  closeMenuOnSelect={false}
                  menuPortalTarget={document.body}
                  styles={{
                    menuPortal: (base) => ({
                      ...base,
                      zIndex: 9999999,
                    }),
                  }}
                />
              </div>
              
              <div className='modal-actions'>
                <button
                  type='submit'
                  className='submit-button'
                  disabled={isPublishing}
                >
                  {isPublishing ? 'Updating...' : 'Update Users'}
                </button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </section>
  );
};

export default ProjectPublishing;