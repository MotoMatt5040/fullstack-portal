import React, { useState } from 'react';
// Note: We remove <Link> if it's no longer used elsewhere
// import { Link } from 'react-router-dom';
import { useUserManagementLogic } from './useUserManagementLogic'; // Your custom hook
import { Modal } from '../../components/Modal';
import UserForm from '../secure/AddUser';
import UpdateUserRoles from '../users/UpdateUserRoles'; // Import the update form
import './UserManagement.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPencilAlt } from '@fortawesome/free-solid-svg-icons';

// Define the shape of a user object if not already defined
interface User {
  email: string;
  roles: string[];
}

const UserManagement = () => {
  const {
    isLoading,
    isSuccess,
    isError,
    error,
    searchTerm,
    setSearchTerm,
    filteredUsers,
  } = useUserManagementLogic();

  // State for the "Add User" modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // --- NEW: State for the "Update User" modal ---
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Handler to open the update modal with the selected user's data
  const handleOpenUpdateModal = (user: User) => {
    setEditingUser(user);
    setIsUpdateModalOpen(true);
  };

  const handleModalClose = () => {
    setIsAddModalOpen(false);
    setIsUpdateModalOpen(false);
    setEditingUser(null); // Clear the user being edited
  };

  let content;

  if (isLoading) content = <p>Loading users...</p>;
  // @ts-ignore
  if (isError) content = <p className="errmsg">{error?.data?.message || 'An error occurred'}</p>;

  if (isSuccess) {
    const tableContent =
      filteredUsers.length > 0 ? (
        filteredUsers.map((user: User) => (
          <tr key={user.email} className="table__row user">
            <td className="table__cell">{user.email}</td>
            <td className="table__cell">{user.roles.join(', ')}</td>
            <td className="table__cell">
              {/* --- MODIFIED: Changed from Link to a button --- */}
              <button onClick={() => handleOpenUpdateModal(user)} className="edit-button">
                <FontAwesomeIcon icon={faPencilAlt} /> Edit
              </button>
            </td>
          </tr>
        ))
      ) : (
        <tr>
          <td className="table__cell" colSpan={3} style={{ textAlign: 'center' }}>
            No users found.
          </td>
        </tr>
      );

    content = (
      <>
        <div className="user-management-header">
          <h1 className="user-management-title">User Management</h1>
          <button onClick={() => setIsAddModalOpen(true)} className="add-user-button">
            <FontAwesomeIcon icon={faPlus} /> Add New User
          </button>
        </div>
        <div className="user-management-controls">
          <input
            type="text"
            placeholder="Search by email..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoComplete="new-password" // Keep the autofill fix
          />
        </div>
        <div className="table-container">
          <table className="table table--users">
            <thead className="table__thead">
              <tr>
                <th scope="col" className="table__th user__email">Email</th>
                <th scope="col" className="table__th user__roles">Roles</th>
                <th scope="col" className="table__th user__actions">Actions</th>
              </tr>
            </thead>
            <tbody>{tableContent}</tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <section className="user-management-container">
      {content}

      {/* --- MODAL 1: Add User --- */}
      <Modal isOpen={isAddModalOpen} onClose={handleModalClose}>
        <UserForm onSuccess={handleModalClose} />
      </Modal>

      {/* --- MODAL 2: Update User Roles --- */}
      {/* Ensure editingUser is not null before rendering */}
      {editingUser && (
        <Modal isOpen={isUpdateModalOpen} onClose={handleModalClose}>
          <UpdateUserRoles userToUpdate={editingUser} onSuccess={handleModalClose} />
        </Modal>
      )}
    </section>
  );
};

export default UserManagement;