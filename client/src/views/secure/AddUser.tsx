import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux'; // 1. IMPORT useSelector
// import ROLES_LIST from '../../ROLES_LIST.json'; // 2. REMOVE the static JSON import

import MyToggle from '../../components/MyToggle';
import {
  useAddUserMutation,
  useGetClientsQuery,
} from '../../features/usersApiSlice';
import { selectRoles } from '../../features/roles/rolesSlice';
import './AddUser.css';
import Select from 'react-select';

interface UserFormProps {
  onSuccess?: () => void;
}

const EXCLUSIVE_ROLES = ['Admin', 'External'] as const;

const UserForm: React.FC<UserFormProps> = ({ onSuccess }) => {
  const rolesFromStore = useSelector(selectRoles);

  const { data: clients = [], isFetching: fetchingClients } = useGetClientsQuery();
  const [addUser, { isLoading: addUserIsLoading, error: addUserError }] = useAddUserMutation();

  const [email, setEmail] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const availableRoles = useMemo(
    (): Role[] =>
      // Use rolesFromStore instead of ROLES_LIST
      Object.entries(rolesFromStore).map(([name, id]) => ({
        id: Number(id),
        name,
      })),
    [rolesFromStore] // Add dependency on rolesFromStore
  );

  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({});

  // useEffect to initialize toggleStates when roles are loaded.
  // This is crucial because rolesFromStore is initially empty.
  useEffect(() => {
    if (availableRoles.length > 0) {
      setToggleStates(
        Object.fromEntries(availableRoles.map((role) => [role.name, false]))
      );
    }
  }, [availableRoles]);


  // Memoized client options 
  const clientOptions = useMemo((): ClientOption[] => {
    if (fetchingClients || !clients) return [];
    return clients.map((client: Client) => ({
      value: client.clientId,
      label: client.clientName,
    }));
  }, [clients, fetchingClients]);


  // Reset form - update dependency array
  const resetForm = useCallback(() => {
    setEmail('');
    setSelectedClientId(null);
    if (availableRoles.length > 0) {
        setToggleStates(
            Object.fromEntries(availableRoles.map((role) => [role.name, false]))
        );
    }
  }, [availableRoles]); // Add availableRoles dependency


  // The rest of your component logic (handleToggleClick, validateForm, handleSubmit, etc.)
  // does not need to be changed. Just ensure their useCallback dependency arrays
  // are correct if they rely on `availableRoles`. `validateForm` and `handleSubmit` already look correct.
  // ... (handleToggleClick)
  // ... (validateForm)
  // ... (handleSubmit)
  // ... (handleClientChange, selectedClientOption)
  // ... (JSX for the form)

  // NOTE: The rest of the file is included below for completeness but contains no other changes.
  
  const handleToggleClick = useCallback((roleName: string) => {
    setToggleStates((prev) => {
      const newState = { ...prev };
      const isExclusive = EXCLUSIVE_ROLES.includes(roleName as any);

      if (isExclusive) {
        Object.keys(newState).forEach((key) => {
          newState[key] = false;
        });
        newState[roleName] = !prev[roleName];
      } else {
        EXCLUSIVE_ROLES.forEach((role) => {
          newState[role] = false;
        });
        newState[roleName] = !prev[roleName];
      }

      return newState;
    });
  }, []);

  const validateForm = useCallback((): string | null => {
    if (!email.trim()) return 'Email is required';
    
    const selectedRoles = availableRoles.filter((role) => toggleStates[role.name]);
    if (selectedRoles.length === 0) return 'Please select at least one role';
    
    if (toggleStates['External'] && !selectedClientId) {
      return 'Please select a client for external users';
    }

    return null;
  }, [email, toggleStates, selectedClientId, availableRoles]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }

    const roleIds = availableRoles
      .filter((role) => toggleStates[role.name])
      .map((role) => role.id);

    const userData: UserFormData = {
      email: email.trim(),
      external: toggleStates['External'],
      roles: roleIds,
      clientId: selectedClientId,
    };

    try {
      await addUser(userData).unwrap();
      setSuccessMessage('User added successfully!');
      resetForm();
      
      setTimeout(() => {
        setSuccessMessage('');
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
    } catch (err: any) {
      console.error('Error adding user:', err);
      alert(err?.data?.message || 'Failed to add user. Please try again.');
    }
  }, [validateForm, availableRoles, toggleStates, email, selectedClientId, addUser, resetForm, onSuccess]);

  const handleClientChange = useCallback((selected: ClientOption | null) => {
    setSelectedClientId(selected?.value || null);
  }, []);

  const selectedClientOption = useMemo(
    () => clientOptions.find((opt) => opt.value === selectedClientId) || null,
    [clientOptions, selectedClientId]
  );
  
  return (
    <>
      <form className="add-user-form" onSubmit={handleSubmit}>
        <label className="add-user-label" htmlFor="email">
          Email:
        </label>
        <input
          id="email"
          className="add-user-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={addUserIsLoading}
        />

        <br />
        <br />

        <div className="password-info">
          <p><em>Note: A secure password will be automatically generated and sent via email.</em></p>
        </div>

        <br />

        <label className="add-user-label">Roles:</label>
        <div className="role-toggle-group">
          {availableRoles.map((role) => (
            <MyToggle
              key={role.id}
              label={role.name}
              active={toggleStates[role.name]}
              onClick={() => handleToggleClick(role.name)}
              disabled={addUserIsLoading}
            />
          ))}
        </div>

        {toggleStates['External'] && (
          <div>
            <br />
            <label htmlFor="client-select">Client:</label>
            <Select
              inputId="client-select"
              className="client-select"
              options={clientOptions}
              value={selectedClientOption}
              onChange={handleClientChange}
              isDisabled={addUserIsLoading || fetchingClients}
              placeholder={fetchingClients ? "Loading clients..." : "Select..."}
              isClearable
              closeMenuOnSelect
              isLoading={fetchingClients}
            />
          </div>
        )}

        <br />
        <br />

        <button 
          className="add-user-submit" 
          type="submit"
          disabled={addUserIsLoading}
        >
          {addUserIsLoading ? 'Creating User...' : 'Create User & Send Email'}
        </button>
      </form>

      {successMessage && (
        <div className="success-message" role="alert">
          {successMessage}
        </div>
      )}

      {addUserError && (
        <div className="error-message" role="alert">
          {/* @ts-ignore */}
          Error: {addUserError?.data?.message || 'Failed to add user'}
        </div>
      )}
    </>
  );
};

export default UserForm;