import { useState, useMemo } from 'react';
import { useGetUsersQuery } from '../../features/usersApiSlice';

// Define a type for your user object for better type-safety
type User = {
  email: string;
  roles: string[];
};

export const useUserManagementLogic = () => {
  // Set a default empty array for `users` to prevent errors before the first fetch completes
  const {
    data: users = [],
    isLoading,
    isSuccess,
    isError,
    error,
  } = useGetUsersQuery('usersList', {
    pollingInterval: 60000,
    refetchOnFocus: true,
    refetchOnMountOrArgChange: true,
  });

  const [searchTerm, setSearchTerm] = useState('');

  // This memoized value now returns a filtered array of user objects
  const filteredUsers = useMemo(() => {
    if (!searchTerm) {
      return users; // If no search term, return all users
    }

    // Filter the array directly based on the email field
    return users.filter((user: User) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  return {
    isLoading,
    isSuccess,
    isError,
    error,
    searchTerm,
    setSearchTerm,
    filteredUsers, // Return the fully-filtered user objects
  };
};