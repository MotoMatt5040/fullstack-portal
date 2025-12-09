import React, { useState, useMemo } from 'react';
import { useUserManagementLogic } from './useUserManagementLogic';
import { Modal } from '../../components/Modal';
import UserForm from '../secure/AddUser';
import UpdateUserRoles from '../users/UpdateUserRoles';
import ConfirmationModal from '../../components/ConfirmationModal';
import Icon from '@mdi/react';
import {
  mdiAccountGroup,
  mdiPlus,
  mdiPencil,
  mdiTrashCan,
  mdiChevronDown,
  mdiChevronRight,
  mdiArrowExpandAll,
  mdiArrowCollapseAll,
  mdiRefresh,
  mdiMagnify,
  mdiAccountCircle,
  mdiDomain,
} from '@mdi/js';
import './UserManagement.css';

interface User {
  email: string;
  roles: string[];
  clientname: string;
}

const getRoleBadgeClass = (role: string): string => {
  const roleLower = role.toLowerCase();
  if (roleLower === 'admin') return 'admin';
  if (roleLower === 'external') return 'external';
  if (roleLower === 'manager') return 'manager';
  if (roleLower === 'executive') return 'executive';
  return '';
};

const UserManagement = () => {
  const {
    isLoading,
    isSuccess,
    isError,
    error,
    searchTerm,
    setSearchTerm,
    filteredClients,
    toggleClientExpansion,
    isClientExpanded,
    expandAll,
    collapseAll,
    isDeleting,
    handleDeleteUser,
  } = useUserManagementLogic();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Calculate stats
  const stats = useMemo(() => {
    const totalClients = filteredClients.length;
    const totalUsers = filteredClients.reduce((sum, client) => sum + client.users.length, 0);
    return { totalClients, totalUsers };
  }, [filteredClients]);

  const handleOpenDeleteModal = (user: User) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setUserToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (userToDelete) {
      await handleDeleteUser(userToDelete.email);
      handleCloseDeleteModal();
    }
  };

  const handleOpenUpdateModal = (user: User) => {
    setEditingUser(user);
    setIsUpdateModalOpen(true);
  };

  const handleModalClose = () => {
    setIsAddModalOpen(false);
    setIsUpdateModalOpen(false);
    setEditingUser(null);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className='user-management'>
        <div className='user-management-loading'>
          <div className='user-management-loading-spinner'>
            <div className='user-management-spinner'></div>
            <span>Loading users...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className='user-management'>
        <div className='user-management-error'>
          {/* @ts-ignore */}
          {error?.data?.message || 'An error occurred while loading users'}
        </div>
      </div>
    );
  }

  return (
    <div className='user-management'>
      {/* Header */}
      <div className='user-management-header'>
        <div className='user-management-header-left'>
          <h1>
            <Icon path={mdiAccountGroup} size={1} />
            User Management
          </h1>
          <p className='user-management-subtitle'>Manage users and their roles</p>
        </div>
      </div>

      {/* Controls */}
      <div className='user-management-controls'>
        <div className='user-management-controls-left'>
          <div className='user-management-search-wrapper'>
            <Icon path={mdiMagnify} size={0.75} className='user-management-search-icon' />
            <input
              type='text'
              placeholder='Search by client or email...'
              className='user-management-search'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete='off'
            />
          </div>
        </div>
        <div className='user-management-controls-right'>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className='user-management-btn user-management-btn-primary'
            title='Add New User'
          >
            <Icon path={mdiPlus} size={0.75} />
            <span>Add User</span>
          </button>
          <button
            onClick={expandAll}
            className='user-management-btn user-management-btn-icon'
            title='Expand All'
          >
            <Icon path={mdiArrowExpandAll} size={0.75} />
          </button>
          <button
            onClick={collapseAll}
            className='user-management-btn user-management-btn-icon'
            title='Collapse All'
          >
            <Icon path={mdiArrowCollapseAll} size={0.75} />
          </button>
          <button
            onClick={handleRefresh}
            className='user-management-btn user-management-btn-icon'
            title='Refresh'
          >
            <Icon path={mdiRefresh} size={0.75} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className='user-management-stats'>
        <div className='user-management-stat'>
          <span className='user-management-stat-value'>{stats.totalClients}</span>
          <span className='user-management-stat-label'>Clients</span>
        </div>
        <div className='user-management-stat'>
          <span className='user-management-stat-value'>{stats.totalUsers}</span>
          <span className='user-management-stat-label'>Users</span>
        </div>
      </div>

      {/* Data Section */}
      <div className='user-management-data-section'>
        <div className='user-management-data-header'>
          <h2 className='user-management-data-title'>
            <Icon path={mdiDomain} size={0.875} />
            Clients & Users
          </h2>
        </div>

        {filteredClients.length === 0 ? (
          <div className='user-management-empty'>
            No clients or users found matching your search.
          </div>
        ) : (
          <div className='user-management-table-scroller'>
            <table className='user-management-table'>
              <thead>
                <tr>
                  <th>Client / User</th>
                  <th>Roles</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => {
                  const isExpanded = isClientExpanded(client.clientname);
                  return (
                    <React.Fragment key={client.clientname}>
                      {/* Client Row */}
                      <tr
                        className='user-management-client-row'
                        onClick={() => toggleClientExpansion(client.clientname)}
                      >
                        <td>
                          <div className='user-management-client-name'>
                            <Icon
                              path={isExpanded ? mdiChevronDown : mdiChevronRight}
                              size={0.75}
                              className='user-management-toggle-icon'
                            />
                            {client.clientname}
                          </div>
                        </td>
                        <td>
                          <span className='user-management-user-count'>
                            {client.userCount} user{client.userCount !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td></td>
                      </tr>

                      {/* User Rows */}
                      {isExpanded &&
                        client.users.map((user) => (
                          <tr key={user.email} className='user-management-user-row'>
                            <td>
                              <div className='user-management-user-email'>
                                <Icon
                                  path={mdiAccountCircle}
                                  size={0.75}
                                  className='user-management-user-email-icon'
                                />
                                <span className='user-management-user-email-text'>
                                  {user.email}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div className='user-management-roles'>
                                {user.roles.map((role) => (
                                  <span
                                    key={role}
                                    className={`user-management-role-badge ${getRoleBadgeClass(role)}`}
                                  >
                                    {role}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <div className='user-management-actions'>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenUpdateModal(user);
                                  }}
                                  className='user-management-action-btn edit'
                                  title='Edit User'
                                >
                                  <Icon path={mdiPencil} size={0.625} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDeleteModal(user);
                                  }}
                                  className='user-management-action-btn delete'
                                  title='Delete User'
                                >
                                  <Icon path={mdiTrashCan} size={0.625} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal isOpen={isAddModalOpen} onClose={handleModalClose}>
        <UserForm onSuccess={handleModalClose} />
      </Modal>

      {/* Edit User Modal */}
      {editingUser && (
        <Modal isOpen={isUpdateModalOpen} onClose={handleModalClose}>
          {/* @ts-ignore */}
          <UpdateUserRoles userToUpdate={editingUser} onSuccess={handleModalClose} />
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDelete}
          title='Confirm User Deletion'
          message={
            <>
              Are you sure you want to permanently delete the user{' '}
              <strong>{userToDelete.email}</strong>?
              <br />
              This action cannot be undone.
            </>
          }
          confirmButtonText='Delete User'
          isConfirming={isDeleting}
        />
      )}
    </div>
  );
};

export default UserManagement;
