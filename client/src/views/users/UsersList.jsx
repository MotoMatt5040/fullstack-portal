import React from 'react';
import { useGetUsersQuery } from '../../features/usersApiSlice';
import { Link } from 'react-router-dom';

const UsersList = () => {
	const {
		data: users,
		isLoading,
		isSuccess,
		isError,
		error,
	} = useGetUsersQuery();

	let content;
	if (isLoading) {
		content = <p>"Loading..."</p>;
	} else if (isSuccess) {
		content = (
			<section className='users'>
				<h1>Users List</h1>
				<ul>
					{users.map((user, i) => {
						return <li key={i}>{user.Email}</li>;
					})}
				</ul>
				<Link to='/welcome'>Back to Welcome</Link>
			</section>
		);
	} else if (isError) {
		content = <p>{JSON.stringify(error)}</p>;
	}

	return content;
};
export default UsersList;
