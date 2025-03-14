import React, { useState } from 'react';

import { useAddUserRolesMutation, useRemoveUserRolesMutation } from '../../features/usersApiSlice';

const UpdateUserRoles = () => {
  const [email, setEmail] = useState('');
  const [selectedRoles, setSelectedRoles] = useState([]);

  // Define mutation hooks for adding and removing user roles
  const [addUserRoles, { isLoading: isAdding, isError: isAddingError, error: addError }] = useAddUserRolesMutation();
  const [removeUserRoles, { isLoading: isRemoving, isError: isRemovingError, error: removeError }] = useRemoveUserRolesMutation();

  const handleRoleChange = (e) => {
    const { value, checked } = e.target;
    const roleValue = parseInt(value, 10); // Parse the role value as an integer
    setSelectedRoles((prevSelectedRoles) =>
      checked
        ? [...prevSelectedRoles, roleValue] // Add role to selected roles
        : prevSelectedRoles.filter((role) => role !== roleValue) // Remove role from selected roles
    );
  };

  const handleAddRoles = async (e) => {
    e.preventDefault();
    try {
      await addUserRoles({ email, roles: selectedRoles }).unwrap();
      console.log('User roles added successfully');
    } catch (err) {
      console.error('Failed to add user roles:', err);
    }
  };

  const handleRemoveRoles = async (e) => {
    e.preventDefault();
    try {
      await removeUserRoles({ email, roles: selectedRoles }).unwrap();
      console.log('User roles removed successfully');
    } catch (err) {
      console.error('Failed to remove user roles:', err);
    }
  };

  return (
    <form>
      <h2>Add or Remove User Roles</h2>
      <label>
        Email:&nbsp;
        <input
          type="email"
          onChange={(e) => setEmail(e.target.value)}
          value={email}
          required
        />
      </label>
      <div>
        <label>
          <input
            type="checkbox"
            value="1" // Role 1 as integer 1
            onChange={handleRoleChange}
            checked={selectedRoles.includes(1)} // Check if role 1 is selected
          />
          &nbsp;Admin
        </label>
        <br />

        <label>
          <input
            type="checkbox"
            value="2" // Role 2 as integer 2
            onChange={handleRoleChange}
            checked={selectedRoles.includes(2)} // Check if role 2 is selected
          />
          &nbsp;Manager
        </label>
        <br />

        <label>
          <input
            type="checkbox"
            value="3" // Role 3 as integer 3
            onChange={handleRoleChange}
            checked={selectedRoles.includes(3)} // Check if role 3 is selected
          />
          &nbsp;External
        </label>
      </div>
      <p>----------</p>
      
      <button type="submit" onClick={handleAddRoles} disabled={isAdding || isRemoving}>
        {isAdding ? 'Adding Roles...' : 'Add Roles'}
      </button>

      &nbsp;OR&nbsp;

      <button type="submit" onClick={handleRemoveRoles} disabled={isAdding || isRemoving}>
        {isRemoving ? 'Removing Roles...' : 'Remove Roles'}
      </button>

      {isAddingError && <p>Error adding roles: {addError.message}</p>}
      {isRemovingError && <p>Error removing roles: {removeError.message}</p>}
    </form>
  );
};

export default UpdateUserRoles;
