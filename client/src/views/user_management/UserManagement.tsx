import React, { useState } from 'react';
import { useGetUsersQuery } from '../../features/usersApiSlice';
import { Link } from 'react-router-dom';
import ROLES_LIST from '../../ROLES_LIST.json';
import './UserManagement.css';

const UserManagement = () => {
    const {
        data: users,
        isLoading,
        isSuccess,
        isError,
        error
    } = useGetUsersQuery('usersList', {
        pollingInterval: 60000,
        refetchOnFocus: true,
        refetchOnMountOrArgChange: true
    });

    const [searchTerm, setSearchTerm] = useState('');

    let content;

    if (isLoading) {
        content = <p>Loading users...</p>;
    }

    if (isError) {
        content = <p className="errmsg">{error?.data?.message || 'An error occurred'}</p>;
    }

    if (isSuccess) {
        // FIX: Ensure users and users.ids exist before trying to filter.
        // This prevents the "Cannot read properties of undefined (reading 'filter')" error.
        const allUserIds = users?.ids || [];

        const filteredIds = allUserIds.filter(userId => {
            const user = users.entities[userId];
            if (!user) return false;
            const fullName = `${user.firstname} ${user.lastname}`;
            return user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   fullName.toLowerCase().includes(searchTerm.toLowerCase());
        });

        const tableContent = filteredIds.length > 0
            ? filteredIds.map(userId => {
                const user = users.entities[userId];
                if (!user) return null;

                const userRoles = user.roles.map(roleId => {
                    const role = Object.entries(ROLES_LIST).find(([key, value]) => value === roleId);
                    return role ? role[0] : 'Unknown';
                }).join(', ');

                return (
                    <tr key={userId} className="table__row user">
                        <td className="table__cell">{user.username}</td>
                        <td className="table__cell">{`${user.firstname} ${user.lastname}`}</td>
                        <td className="table__cell">{userRoles}</td>
                        <td className="table__cell">
                            <Link to={`/users/${userId}`} className="edit-button">
                                <i className="fas fa-pencil-alt"></i> Edit
                            </Link>
                        </td>
                    </tr>
                );
              })
            : (
                <tr>
                    <td className="table__cell" colSpan="4" style={{ textAlign: 'center' }}>
                        No users found.
                    </td>
                </tr>
            );

        content = (
            <>
                <div className="user-management-header">
                    <h1 className="user-management-title">User Management</h1>
                    <Link to="/adduser" className="add-user-button">
                        <i className="fas fa-plus"></i> Add New User
                    </Link>
                </div>
                <div className="user-management-controls">
                    <input
                        type="text"
                        placeholder="Search for a user..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="table-container">
                    <table className="table table--users">
                        <thead className="table__thead">
                            <tr>
                                <th scope="col" className="table__th user__username">Username</th>
                                <th scope="col" className="table__th user__fullname">Full Name</th>
                                <th scope="col" className="table__th user__roles">Roles</th>
                                <th scope="col" className="table__th user__actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableContent}
                        </tbody>
                    </table>
                </div>
            </>
        );
    }

    return (
        <section className="user-management-container">
            {content}
        </section>
    );
};

export default UserManagement;
