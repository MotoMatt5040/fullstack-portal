import React, { useEffect, useState, useMemo, useCallback } from 'react';
import ROLES_LIST from '../../ROLES_LIST.json';
import MyToggle from '../../components/MyToggle';
import {
  useAddUserMutation,
  useGetClientsQuery,
} from '../../features/usersApiSlice';
import './AddUser.css';
import Select from 'react-select';

interface Role {
  id: number;
  name: string;
}

interface Client {
  clientId: string;
  clientName: string;
}

interface ClientOption {
  value: string;
  label: string;
}

interface UserFormData {
  email: string;
  password: string;
  external: boolean;
  roles: number[];
  clientId: string | null;
}

const EXCLUSIVE_ROLES = ['Admin', 'External'] as const;

const UserForm: React.FC = () => {
  const { data: clients = [], isFetching: fetchingClients } = useGetClientsQuery();
  const [addUser, { isLoading: addUserIsLoading, error: addUserError }] = useAddUserMutation();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Memoized roles to avoid recreation on every render
  const availableRoles = useMemo(
    (): Role[] =>
      Object.entries(ROLES_LIST).map(([name, id]) => ({
        id: Number(id),
        name,
      })),
    []
  );

  // Initialize toggle states
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(availableRoles.map((role) => [role.name, false]))
  );

  // Memoized client options
  const clientOptions = useMemo((): ClientOption[] => {
    if (fetchingClients || !clients) return [];
    return clients.map((client: Client) => ({
      value: client.clientId,
      label: client.clientName,
    }));
  }, [clients, fetchingClients]);

  // Optimized toggle handler with useCallback
  const handleToggleClick = useCallback((roleName: string) => {
    setToggleStates((prev) => {
      const newState = { ...prev };
      const isExclusive = EXCLUSIVE_ROLES.includes(roleName as any);

      if (isExclusive) {
        // If clicking an exclusive role, turn off all others
        Object.keys(newState).forEach((key) => {
          newState[key] = false;
        });
        newState[roleName] = !prev[roleName];
      } else {
        // If clicking a non-exclusive role, turn off exclusive roles
        EXCLUSIVE_ROLES.forEach((role) => {
          newState[role] = false;
        });
        newState[roleName] = !prev[roleName];
      }

      return newState;
    });
  }, []);

  // Form validation
  const validateForm = useCallback((): string | null => {
    if (!email.trim()) return 'Email is required';
    if (!password.trim()) return 'Password is required';
    
    const selectedRoles = availableRoles.filter((role) => toggleStates[role.name]);
    if (selectedRoles.length === 0) return 'Please select at least one role';
    
    if (toggleStates['External'] && !selectedClientId) {
      return 'Please select a client for external users';
    }

    return null;
  }, [email, password, toggleStates, selectedClientId, availableRoles]);

  // Reset form
  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setSelectedClientId(null);
    setToggleStates(
      Object.fromEntries(availableRoles.map((role) => [role.name, false]))
    );
    setSuccessMessage('');
  }, [availableRoles]);

  // Handle form submission
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
      password,
      external: toggleStates['External'],
      roles: roleIds,
      clientId: selectedClientId,
    };

    try {
      await addUser(userData).unwrap();
      setSuccessMessage('User added successfully!');
      resetForm();
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error adding user:', err);
      // You might want to show the actual error message to the user
      alert('Failed to add user. Please try again.');
    }
  }, [validateForm, availableRoles, toggleStates, email, password, selectedClientId, addUser, resetForm]);

  // Handle client selection
  const handleClientChange = useCallback((selected: ClientOption | null) => {
    setSelectedClientId(selected?.value || null);
  }, []);

  // Find selected client option for react-select
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
        <label className="add-user-label" htmlFor="password">
          Password:
        </label>
        <input
          id="password"
          className="add-user-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={addUserIsLoading}
        />

        <button 
          className="add-user-submit" 
          type="submit"
          disabled={addUserIsLoading}
        >
          {addUserIsLoading ? 'Adding User...' : 'Submit'}
        </button>
      </form>

      {successMessage && (
        <div className="success-message" role="alert">
          {successMessage}
        </div>
      )}

      {addUserError && (
        <div className="error-message" role="alert">
          Error: {addUserError?.data?.message || 'Failed to add user'}
        </div>
      )}
    </>
  );
};

export default UserForm;