import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useSelector } from 'react-redux';

// --- Redux Imports ---
// 1. Import the RTK Query hook to trigger the fetch
import { useGetRolesQuery } from './features/config/configApiSlice';
// 2. Import the selectors to read data from the Redux state
import { selectRoles, selectIsRolesLoading } from './features/roles/rolesSlice';

// Compnents
import Layout from './components/Layout';

// Features
import Login from './views/login/Login';
import RequireAuth from './features/auth/RequireAuth';
import RedirectIfAuthenticated from './features/auth/RedirectIfAuthenticated';

// Views
import Welcome from './views/Welcome';
import UsersList from './views/users/UsersList';
import Missing from './views/Missing';
import IssueForm from './views/github/Github';
import UpdateUserRoles from './views/users/UpdateUserRoles';
import SummaryReport from './views/summary_report/SummaryReport';
import ProjectReport from './views/project_report/ProjectReport';
import AddUser from './views/secure/AddUser';
import QuotaManagement from './views/quota_management/QuotaManagement';
import ResetPassword from './views/secure/ResetPassword';
import UserManagement from './views/user_management/UserManagement';
import ProductionReport from './views/production_report/ProductionReport';
import Unauthorized from './views/secure/Unauthorized';
import Reports from './views/Reports';
import Toplines from './views/toplines/Toplines';
import ProjectPublishing from './views/project_publishing/ProjectPublishing';
import DispositionReport from './views/disposition_report/DispositionReport';

function App() {
  useGetRolesQuery();

  const roles = useSelector(selectRoles);
  const isRolesLoading = useSelector(selectIsRolesLoading);

  if (isRolesLoading) {
    return <p>Loading application...</p>; 
  }

  return (
    <Routes>
      <Route path='/' element={<Layout />}>
        {/* public routes */}
        <Route
          index
          element={
            <RedirectIfAuthenticated>
              <Login />
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

        <Route path='unauthorized' element={<Unauthorized />} />
        <Route path='reset-password' element={<ResetPassword />} />

        {/* protected routes */}
        {/* This JSX does not need to change, as it uses the 'roles' variable */}
        {/* which is now populated from the Redux store. */}
        <Route
          element={
            <RequireAuth
              allowedRoles={[
                roles.Admin,
                roles.Executive,
                roles.Manager,
                roles.External,
                roles.Programmer,
              ]}
            />
          }
        >
          <Route path='github' element={<IssueForm />} />
          <Route path='welcome' element={<Welcome />} />
          <Route path='quota-management' element={<QuotaManagement />} />
          <Route path='reports' element={<Reports />} />
          <Route path='topline-report' element={<Toplines />} />
          <Route path='disposition-report' element={<DispositionReport />} />
        </Route>

        <Route
          element={
            <RequireAuth
              allowedRoles={[
                roles.Admin,
                roles.Executive,
                roles.Manager,
                roles.Programmer,
              ]}
            />
          }
        >
          <Route path='summary-report' element={<SummaryReport />} />
          <Route path='project-report' element={<ProjectReport />} />
          <Route path='production-report' element={<ProductionReport />} />
          {/* <Route path='publishquotas' element={<QuotaPublishing />} /> */}
        </Route>
        <Route element={<RequireAuth allowedRoles={[roles.Admin, roles.Executive, roles.Programmer]} />}>
          <Route path='project-publishing' element={<ProjectPublishing />} />
        </Route>

        <Route
          element={
            <RequireAuth allowedRoles={[roles.Admin, roles.Executive]} />
          }
        >
          <Route path='adduser' element={<AddUser />} />
          <Route path='user-management' element={<UserManagement />} />
        </Route>

        <Route element={<RequireAuth allowedRoles={[roles.Admin]} />}>
          <Route path='users' element={<UsersList />} />
          <Route path='users/new' element={<AddUser />} />
          <Route path='users/:id' element={<UpdateUserRoles />} />
        </Route>
        <Route path='usermanagement' element={<UserManagement />} />

        {/* catch all route */}
        <Route path='*' element={<Missing />} />
      </Route>
    </Routes>
  );
}

export default App;
