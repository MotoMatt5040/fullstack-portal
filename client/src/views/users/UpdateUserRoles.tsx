import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Select from 'react-select';

import {
  useGetClientsQuery,
  useUpdateUserRolesMutation,
  useUpdateUserProfileMutation,
} from '../../features/usersApiSlice';
import { selectRoles } from '../../features/roles/rolesSlice';
import MyToggle from '../../components/MyToggle';
import './UpdateUserRoles.css';

// --- Interfaces ---
interface UserToUpdate {
  email: string;
  roles: string[];
  clientId: string | null;
}

interface UpdateUserRolesProps {
  userToUpdate: UserToUpdate;
  onSuccess?: () => void;
}

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

const EXCLUSIVE_ROLES = ['Admin', 'External'] as const;

const UpdateUserRoles: React.FC<UpdateUserRolesProps> = ({ userToUpdate, onSuccess }) => {
  // --- Redux Hooks ---
  const rolesFromStore = useSelector(selectRoles);
  
  // THE FIX: Correctly destructure `isFetching` and alias it as `fetchingClients`
  const { data: clients = [], isFetching: fetchingClients } = useGetClientsQuery();
  
  const [updateUserRoles, { isLoading: isUpdatingRoles }] = useUpdateUserRolesMutation();
  const [updateUserProfile, { isLoading: isUpdatingProfile }] = useUpdateUserProfileMutation();

  // --- Component State ---
  const [email] = useState(userToUpdate.email);
  const [successMessage, setSuccessMessage] = useState('');
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({});
  const [selectedClientId, setSelectedClientId] = useState<string | null>(userToUpdate.clientId);

  // --- Memoized Derived State ---
  const initialRoleNamesStr = useMemo(() => [...userToUpdate.roles].sort().join(','), [userToUpdate.roles]);
  const initialClientId = useMemo(() => userToUpdate.clientId, [userToUpdate.clientId]);
  const availableRoles = useMemo(() => Object.entries(rolesFromStore).map(([name, id]) => ({ id: Number(id), name })), [rolesFromStore]);
  const clientOptions = useMemo(() => clients.map((client: Client) => ({ value: client.clientId, label: client.clientName })), [clients]);
  const selectedClientOption = useMemo(() => clientOptions.find(opt => opt.value === selectedClientId) || null, [clientOptions, selectedClientId]);

  // --- Effects ---
  useEffect(() => {
    if (availableRoles.length > 0) {
      const initialToggles = Object.fromEntries(availableRoles.map(role => [role.name, false]));
      userToUpdate.roles.forEach(roleName => {
        if (initialToggles.hasOwnProperty(roleName)) initialToggles[roleName] = true;
      });
      setToggleStates(initialToggles);
    }
  }, [availableRoles, userToUpdate.roles]);

  // --- Callbacks and Handlers ---
  const handleToggleClick = useCallback((roleName: string) => {
    setToggleStates((prev) => {
      const newState = { ...prev };
      const isExclusive = EXCLUSIVE_ROLES.includes(roleName as any);
      if (isExclusive) {
        Object.keys(newState).forEach((key) => { newState[key] = false; });
        newState[roleName] = !prev[roleName];
      } else {
        EXCLUSIVE_ROLES.forEach((role) => { newState[role] = false; });
        newState[roleName] = !prev[roleName];
      }
      return newState;
    });
  }, []);
  
  const handleClientChange = useCallback((selected: ClientOption | null) => {
    setSelectedClientId(selected?.value || null);
  }, []);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    const promises = [];

    const finalRoleIds = availableRoles.filter(role => toggleStates[role.name]).map(role => role.id);
    const finalRoleNamesStr = availableRoles.filter(role => finalRoleIds.includes(role.id)).map(role => role.name).sort().join(',');
    
    if (initialRoleNamesStr !== finalRoleNamesStr) {
        promises.push(updateUserRoles({ email, roles: finalRoleIds }).unwrap());
    }

    if (toggleStates['External'] && initialClientId !== selectedClientId) {
        if (!selectedClientId) {
            alert('An External user must have a client selected.');
            return;
        }
        promises.push(updateUserProfile({ email, clientId: selectedClientId }).unwrap());
    }

    if (promises.length === 0) {
        alert("No changes were made to save.");
        return;
    }

    try {
        await Promise.all(promises);
        setSuccessMessage('User updated successfully!');
        setTimeout(() => { if (onSuccess) onSuccess(); }, 2000);
    } catch (err) {
        console.error("Failed to update user:", err);
    }
  };

  const isMutating = isUpdatingRoles || isUpdatingProfile;

  return (
    <section className="update-roles-container">
      <h2>Edit User</h2>
      <p><strong>{email}</strong></p>
      <form className="update-roles-form" onSubmit={handleSaveChanges}>
        <label className="update-roles-label">Roles:</label>
        <div className="role-toggle-group">
          {availableRoles.length > 0 ? (
            availableRoles.map((role) => (
              <MyToggle
                key={role.id}
                label={role.name}
                active={toggleStates[role.name] || false}
                onClick={() => handleToggleClick(role.name)}
                disabled={isMutating}
              />
            ))
          ) : <p>Loading roles...</p> }
        </div>
        <p>Please do not mess with external role for now. That feature is much more complex and can only be set upon user creation. If a mistake is made, the user must be deleted and recreated.</p>

        {toggleStates['External'] && (
            <div className="client-dropdown-container">
                 <label htmlFor="client-select">Client:</label>
                 <Select
                    inputId="client-select"
                    className="client-select"
                    options={clientOptions}
                    value={selectedClientOption}
                    onChange={handleClientChange}
                    isDisabled={isMutating || fetchingClients}
                    placeholder={fetchingClients ? "Loading clients..." : "Select..."}
                    isClearable
                    isLoading={fetchingClients}
                 />
            </div>
        )}

        <div className="form-actions">
          <button type="submit" disabled={isMutating} className="action-button update">
            {isMutating ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {successMessage && (
        <div className="success-message" role="alert">{successMessage}</div>
      )}
    </section>
  );
};

export default UpdateUserRoles;
