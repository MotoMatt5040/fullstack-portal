import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import MyToggle from '../../components/MyToggle';
import {
  useAddUserMutation,
  useGetClientsQuery,
} from '../../features/usersApiSlice';
import { selectRoles } from '../../features/roles/rolesSlice';
import { selectUser } from '../../features/auth/authSlice';
import './AddUser.css';
import Select from 'react-select';

interface UserFormProps {
  onSuccess?: () => void;
}

const EXCLUSIVE_ROLES = ['Admin', 'External'] as const;

const UserForm: React.FC<UserFormProps> = ({ onSuccess }) => {
  const rolesFromStore = useSelector(selectRoles);
  const currentUser = useSelector(selectUser); // Get current user from the store

  const { data: clients = [], isFetching: fetchingClients } = useGetClientsQuery();
  const [addUser, { isLoading: addUserIsLoading, error: addUserError }] = useAddUserMutation();

  const [email, setEmail] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [userType, setUserType] = useState('internal'); // 'internal' or 'external'

  const availableRoles = useMemo((): Role[] => {
    const allRoles: Role[] = Object.entries(rolesFromStore).map(([name, id]) => ({
        id: Number(id),
        name,
    }));

    if (!currentUser) return [];

    // Check if current user has Admin role
    const currentUserRoleIds = currentUser.roles || [];
    const adminRoleId = rolesFromStore['Admin'];
    const isAdmin = currentUserRoleIds.includes(adminRoleId);
    
    if (isAdmin) {
        return allRoles; // Admins can see all roles
    }

    // Get the highest role ID of the current user
    const highestUserRoleId = currentUserRoleIds.length > 0 ? Math.max(...currentUserRoleIds) : -1;

    // Filter roles to only show roles with a higher ID (lower priority)
    return allRoles.filter(role => role.id > highestUserRoleId);

  }, [rolesFromStore, currentUser]);

  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (availableRoles.length > 0) {
      setToggleStates(
        Object.fromEntries(availableRoles.map((role) => [role.name, false]))
      );
    }
  }, [availableRoles]);

  const clientOptions = useMemo((): ClientOption[] => {
    if (fetchingClients || !clients) return [];
    return clients.map((client: Client) => ({
      value: client.clientId,
      label: client.clientName,
    }));
  }, [clients, fetchingClients]);

  const resetForm = useCallback(() => {
    setEmail('');
    setSelectedClientId(null);
    if (availableRoles.length > 0) {
        setToggleStates(
            Object.fromEntries(availableRoles.map((role) => [role.name, false]))
        );
    }
  }, [availableRoles]);

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

    if (userType === 'internal') {
        const selectedRoles = availableRoles.filter((role) => toggleStates[role.name]);
        if (selectedRoles.length === 0) return 'Please select at least one role';
    } else { // external
        if (!selectedClientId) {
            return 'Please select a client for external users';
        }
    }
    return null;
  }, [email, toggleStates, selectedClientId, availableRoles, userType]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }

    const isExternal = userType === 'external';
    
    const roleIds = isExternal 
        ? [rolesFromStore['External']] 
        : availableRoles
            .filter((role) => toggleStates[role.name])
            .map((role) => role.id);

    const userData: UserFormData = {
      email: email.trim(),
      external: isExternal,
      roles: roleIds,
      clientId: isExternal ? selectedClientId : null,
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
  }, [validateForm, availableRoles, toggleStates, email, selectedClientId, addUser, resetForm, onSuccess, userType, rolesFromStore]);

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
        <div className="user-type-toggle">
            <MyToggle
                label="Internal"
                active={userType === 'internal'}
                onClick={() => setUserType('internal')}
            />
            <MyToggle
                label="External"
                active={userType === 'external'}
                onClick={() => setUserType('external')}
            />
        </div>

        <label className="add-user-label" htmlFor="email">
          Email:
        </label>
        <input
          id="email"
          className="add-user-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          required
          disabled={addUserIsLoading}
        />

        <div className="password-info">
          <p><em>Note: A secure password will be automatically generated and sent via email.</em></p>
        </div>

        {userType === 'internal' ? (
          <div>
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
          </div>
        ) : (
          <div>
            <label className="add-user-label" htmlFor="client-select">Client:</label>
            <Select
              classNamePrefix="my-select"
              inputId="client-select"
              className="client-select"
              options={clientOptions}
              value={selectedClientOption}
              onChange={handleClientChange}
              isDisabled={addUserIsLoading || fetchingClients}
              placeholder={fetchingClients ? "Loading clients..." : "Select a client..."}
              isClearable
              closeMenuOnSelect
              isLoading={fetchingClients}
            />
          </div>
        )}

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