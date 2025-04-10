import React from 'react';
import { Routes, Route } from 'react-router-dom';
// Compnents
import Layout from './components/Layout';

// Features
import Login from './views/login/Login';
import RequireAuth from './features/auth/RequireAuth';
import RedirectIfAuthenticated from './features/auth/RedirectIfAuthenticated';

// Views
import Public from './views/Public';
import Welcome from './views/Welcome';
import UsersList from './views/users/UsersList';
import ResetPassword from './features/auth/ResetPassword';
import Missing from './views/Missing';
import IssueForm from './views/github/Github';
import UpdateUserRoles from './views/users/UpdateUserRoles';
import LiveProjectsTable from './views/live_projects/LiveProjects';
import ProductionReport from './views/production_report/ProductionReport';
import SummaryReport from './views/summary_report/SummaryReport';

import ROLES from './ROLES_LIST.json';

function App() {
	return (
		<Routes>
			<Route path='/' element={<Layout />}>
				{/* public routes */}
				<Route
					index
					element={
						<RedirectIfAuthenticated>
							<Public />
						</RedirectIfAuthenticated>
					}
				/>
				<Route
					path='login'
					element={
						<RedirectIfAuthenticated>
							<Login />
						</RedirectIfAuthenticated>
					}
				/>
				<Route path='/reset-password' element={<ResetPassword />} />

				{/* protected routes */}
				<Route
					element={<RequireAuth allowedRoles={[ROLES.Admin, ROLES.Manager]} />}
				>
					<Route path='welcome' element={<Welcome />} />
					<Route path='github' element={<IssueForm />} />
					<Route path='liveprojects' element={<LiveProjectsTable />} />
					<Route path='productionreport' element={<ProductionReport />}>
						<Route path='tables' element={<ProductionReport />} />
					</Route>
					<Route path='summaryreport' element={<SummaryReport />} />
				</Route>

				<Route element={<RequireAuth allowedRoles={[ROLES.Admin]} />}>
					<Route path='userslist' element={<UsersList />} />
					<Route path='updateuserroles' element={<UpdateUserRoles />} />
				</Route>

				{/* catch all route */}
				<Route path='*' element={<Missing />} />
			</Route>
		</Routes>
	);
}

export default App;
