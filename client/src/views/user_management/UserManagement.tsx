import React, { useState } from 'react';
import { useUserManagementLogic } from './useUserManagementLogic';
import { Modal } from '../../components/Modal';
import UserForm from '../secure/AddUser';
import UpdateUserRoles from '../users/UpdateUserRoles';
import ConfirmationModal from '../../components/ConfirmationModal';
import './UserManagement.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faPencilAlt,
  faChevronDown,
  faChevronRight,
  faExpandArrowsAlt,
  faCompressArrowsAlt,
  faSync,
  faTrashAlt,
} from '@fortawesome/free-solid-svg-icons';

interface User {
  email: string;
  roles: string[];
  clientname: string;
}

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
    // This would typically be a function from your logic hook to refetch data
    window.location.reload();
  };

  let content;

  if (isLoading) content = <p>Loading users...</p>;

  if (isError) {
    content = (
      <div className='error-container'>
        {/* @ts-ignore */}
        <p className='errmsg'>{error?.data?.message || 'An error occurred'}</p>
      </div>
    );
  }

  if (isSuccess) {
    const tableContent =
      filteredClients.length > 0 ? (
        filteredClients.map((client) => {
          const isExpanded = isClientExpanded(client.clientname);
          return (
            <React.Fragment key={client.clientname}>
              <tr
                className='table__row client-row'
                onClick={() => toggleClientExpansion(client.clientname)}
              >
                <td className='table__cell client-name'>
                  <FontAwesomeIcon
                    icon={isExpanded ? faChevronDown : faChevronRight}
                    className='toggle-icon'
                  />
                  {client.clientname}
                </td>
                <td className='table__cell user-count'>
                  {client.userCount} user{client.userCount !== 1 ? 's' : ''}
                </td>
                <td className='table__cell actions-cell'></td>
              </tr>
              {isExpanded &&
                client.users.map((user) => (
                  <tr key={user.email} className='table__row user-row'>
                    <td className='table__cell user-email'>
                      <span className='user-indent'>└─ {user.email}</span>
                    </td>
                    <td className='table__cell'>{user.roles.join(', ')}</td>
                    <td className='table__cell actions-cell'>
                      <button
                        onClick={() => handleOpenUpdateModal(user)}
                        className='edit-button'
                      >
                        <FontAwesomeIcon icon={faPencilAlt} /> Edit
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(user)}
                        className='delete-button'
                      >
                        <FontAwesomeIcon icon={faTrashAlt} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
            </React.Fragment>
          );
        })
      ) : (
        <tr>
          <td
            className='table__cell'
            colSpan={3}
            style={{ textAlign: 'center' }}
          >
            No clients or users found.
          </td>
        </tr>
      );

    content = (
      <>
        <div className='user-management-header'>
          <h1 className='user-management-title'>User Management</h1>
          <div className='header-actions'>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className='add-user-button'
            >
              <FontAwesomeIcon icon={faPlus} /> Add New User
            </button>
            <button
              onClick={expandAll}
              className='expand-button'
              title='Expand All'
            >
              <FontAwesomeIcon icon={faExpandArrowsAlt} />
            </button>
            <button
              onClick={collapseAll}
              className='collapse-button'
              title='Collapse All'
            >
              <FontAwesomeIcon icon={faCompressArrowsAlt} />
            </button>
            <button onClick={handleRefresh} className='refresh-button'>
              <FontAwesomeIcon icon={faSync} />
            </button>
          </div>
        </div>
        <div className='user-management-controls'>
          <input
            type='text'
            placeholder='Search by client or email...'
            className='search-input'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoComplete='new-password'
          />
        </div>
        <div className='table-container'>
          <table className='table table--users'>
            <thead className='table__thead'>
              <tr>
                <th scope='col' className='table__th client__name_header'>
                  Client
                </th>
                <th scope='col' className='table__th user__roles_header'>
                  Users / Roles
                </th>
                <th scope='col' className='table__th user__actions_header'>
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
    <section className='user-management-container'>
      {content}

      <Modal isOpen={isAddModalOpen} onClose={handleModalClose}>
        <UserForm onSuccess={handleModalClose} />
      </Modal>

      {editingUser && (
        <Modal isOpen={isUpdateModalOpen} onClose={handleModalClose}>
          {/* @ts-ignore */}
          <UpdateUserRoles
            userToUpdate={editingUser}
            onSuccess={handleModalClose}
          />
        </Modal>
      )}

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
    </section>
  );
};

export default UserManagement;
