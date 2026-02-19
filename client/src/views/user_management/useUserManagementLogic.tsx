import { useState, useMemo, useEffect } from 'react';
import { useGetUsersQuery, useDeleteUserMutation  } from './usersApiSlice';
import { useGetClientsQuery } from '../project_publishing/projectPublishingApiSlice';

// Define types for better type-safety
type User = {
  email: string;
  roles: string[];
  clientname: string; // Assuming the user object includes the client name
  lastActive: string | null; // Timestamp of last activity
};

interface GroupedClient {
  clientname: string;
  users: User[];
  userCount: number;
}

export const useUserManagementLogic = () => {
  // Fetch both users and clients
  const {
    data: users = [],
    isLoading: usersLoading,
    isSuccess: usersSuccess,
    isError: usersError,
    error: usersApiError,
  } = useGetUsersQuery('usersList', {
    pollingInterval: 60000,
    refetchOnFocus: true,
    refetchOnMountOrArgChange: true,
  });

  const {
    data: clients = [],
    isLoading: clientsLoading,
  } = useGetClientsQuery();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();


  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  const handleDeleteUser = async (email: string) => {
    try {
      await deleteUser(email).unwrap();
      // Optionally add success toast/notification here
    } catch (err) {
      console.error('Failed to delete user:', err);
      // Optionally add error toast/notification here
    }
  };

  // Group users by client
  const groupedClients = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];

    const clientMap = new Map<string, GroupedClient>();

    users.forEach((user: User) => {
        // Use clientname from user object, default to 'Unassigned'
        const clientName = user.clientname || 'Unassigned';

        if (clientMap.has(clientName)) {
            const existing = clientMap.get(clientName)!;
            existing.users.push(user);
            existing.userCount = existing.users.length;
        } else {
            clientMap.set(clientName, {
                clientname: clientName,
                users: [user],
                userCount: 1,
            });
        }
    });

    return Array.from(clientMap.values());
  }, [users]);

  // Filter clients based on search term
  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return groupedClients;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return groupedClients.filter((client: GroupedClient) =>
      client.clientname.toLowerCase().includes(lowerSearchTerm) ||
      client.users.some(user =>
        user.email.toLowerCase().includes(lowerSearchTerm)
      )
    );
  }, [groupedClients, searchTerm]);

  const toggleClientExpansion = (clientName: string) => {
    setExpandedClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientName)) {
        newSet.delete(clientName);
      } else {
        newSet.add(clientName);
      }
      return newSet;
    });
  };

  const isClientExpanded = (clientName: string) => {
    return expandedClients.has(clientName);
  };

  const expandAll = () => {
    const allClientNames = filteredClients.map(client => client.clientname);
    setExpandedClients(new Set(allClientNames));
  };

  const collapseAll = () => {
    setExpandedClients(new Set());
  };


  return {
    isLoading: usersLoading || clientsLoading,
    isSuccess: usersSuccess,
    isError: usersError,
    error: usersApiError,
    searchTerm,
    setSearchTerm,
    filteredClients,
    toggleClientExpansion,
    isClientExpanded,
    expandAll,
    collapseAll,
    isDeleting,
    handleDeleteUser,
  };
};