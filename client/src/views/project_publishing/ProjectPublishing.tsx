import React, { useState, useMemo } from 'react';
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
import { 
  useLazyGetUsersByClientQuery, 
  usePublishProjectToUsersMutation,
  useUnpublishProjectFromUsersMutation 
} from '../../features/projectPublishingApiSlice';

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
    projects,
    clients,
  } = useProjectPublishingLogic();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<GroupedProject | null>(null);
  const [getUsersByClient, { data: usersForClient }] = useLazyGetUsersByClientQuery();
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [publishProjectToUsers, { isLoading: isPublishing }] = usePublishProjectToUsersMutation();
  const [unpublishProjectFromUsers, { isLoading: isUnpublishing }] = useUnpublishProjectFromUsersMutation();

  const projectOptions = useMemo(
    () =>
      projects.map((p) => ({
        value: p.projectId,
        label: `${p.projectId} - ${p.projectName}`,
      })),
    [projects]
  );

  const clientOptions = useMemo(
    () =>
      clients.map((c) => ({
        value: c.clientId,
        label: c.clientName,
      })),
    [clients]
  );

  // Find the selected option objects
  const selectedProjectOption = useMemo(
    () =>
      projectOptions.find((option) => option.value === selectedProjectId) ||
      null,
    [projectOptions, selectedProjectId]
  );

  const selectedClientOption = useMemo(
    () =>
      clientOptions.find((option) => option.value === selectedClientId) || null,
    [clientOptions, selectedClientId]
  );

  const handleClientChange = (option: any) => {
    const clientId = option ? option.value : null;
    setSelectedClientId(clientId);
    setSelectedUsers([]);
    if (clientId) {
      getUsersByClient(clientId);
    }
  };

  const handleUserChange = (selectedOptions: any) => {
    setSelectedUsers(selectedOptions || []);
  };

  const userOptions = useMemo(() => {
    if (!usersForClient) return [];
    return usersForClient.map((user: any) => ({
      value: user.email,
      label: user.email,
    }));
  }, [usersForClient]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUsers([]);
    setSelectedProjectId(null);
    setSelectedClientId(null);
  };

  const handleOpenEditModal = (project: GroupedProject) => {
    setEditingProject(project);
    setIsEditModalOpen(true);
    
    // Find the client for this project
    const client = clients.find(c => c.clientName === project.clientname);
    if (client) {
      setSelectedClientId(client.clientId);
      getUsersByClient(client.clientId);
      
      // Pre-select currently published users
      const currentUsers = project.users.map(user => ({
        value: user.email,
        label: user.email,
      }));
      setSelectedUsers(currentUsers);
    }
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingProject(null);
    setSelectedUsers([]);
    setSelectedClientId(null);
  };

  const handlePublishProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProjectId || selectedUsers.length === 0) {
      alert('Please select a project and at least one user.');
      return;
    }

    const emails = selectedUsers.map(user => user.value);

    try {
      await publishProjectToUsers({ projectId: selectedProjectId, emails }).unwrap();
      handleCloseModal();
      handleRefresh();
    } catch (error) {
      console.error('Failed to publish project:', error);
    }
  };

  const handleUnpublishProjectInline = async (project: GroupedProject) => {
    const confirmUnpublish = window.confirm(
      `Are you sure you want to unpublish project "${project.projectid}" from all users in ${project.clientname}?`
    );

    if (confirmUnpublish) {
      try {
        const allEmails = project.users.map(user => user.email);
        await unpublishProjectFromUsers({ 
          projectId: project.projectid, 
          emails: allEmails 
        }).unwrap();
        handleRefresh();
      } catch (error) {
        console.error('Failed to unpublish project:', error);
      }
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingProject) return;

    const currentEmails = editingProject.users.map(user => user.email);
    const selectedEmails = selectedUsers.map(user => user.value);
    
    // Find users to add and remove
    const usersToAdd = selectedEmails.filter(email => !currentEmails.includes(email));
    const usersToRemove = currentEmails.filter(email => !selectedEmails.includes(email));

    try {
      // Add new users
      if (usersToAdd.length > 0) {
        await publishProjectToUsers({ 
          projectId: editingProject.projectid, 
          emails: usersToAdd 
        }).unwrap();
      }

      // Remove users
      if (usersToRemove.length > 0) {
        await unpublishProjectFromUsers({ 
          projectId: editingProject.projectid, 
          emails: usersToRemove 
        }).unwrap();
      }

      handleCloseEditModal();
      handleRefresh();
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const handleUnpublishProject = async () => {
    if (!editingProject) return;

    const confirmUnpublish = window.confirm(
      `Are you sure you want to unpublish project "${editingProject.projectid}" from all users?`
    );

    if (confirmUnpublish) {
      try {
        const allEmails = editingProject.users.map(user => user.email);
        await unpublishProjectFromUsers({ 
          projectId: editingProject.projectid, 
          emails: allEmails 
        }).unwrap();
        handleCloseEditModal();
        handleRefresh();
      } catch (error) {
        console.error('Failed to unpublish project:', error);
      }
    }
  };

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
        filteredProjects.map((project: GroupedProject) => {
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
                  {project.projectid}
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
                project.users.map((user: PublishedProject, index: number) => (
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
                onChange={(option) =>
                  setSelectedProjectId(option ? option.value : null)
                }
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
              <label htmlFor='client'>Client</label>
              <Select
                classNamePrefix='my-select'
                inputId='client'
                options={clientOptions}
                value={selectedClientOption}
                onChange={handleClientChange}
                placeholder='Select a Client'
                isClearable
                menuPortalTarget={document.body}
                styles={{
                  menuPortal: (base) => ({
                    ...base,
                    zIndex: 9999999,
                  }),
                }}
              />
            </div>

            {selectedClientId && usersForClient && (
              <div className='form-group'>
                <label htmlFor='users'>Users</label>
                <Select
                  classNamePrefix='my-select'
                  inputId='users'
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
            )}
          </div>
          <button
            type='submit'
            className='submit-button'
            disabled={!selectedProjectId || !selectedClientId || isPublishing}
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
                <p><strong>Project:</strong> {editingProject.projectid}</p>
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
                  disabled={isPublishing || isUnpublishing}
                >
                  {isPublishing || isUnpublishing ? 'Updating...' : 'Update Users'}
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