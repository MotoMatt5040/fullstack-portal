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
import Missing from './views/Missing';
import IssueForm from './views/github/Github';
import UpdateUserRoles from './views/users/UpdateUserRoles';
import SummaryReport from './views/summary_report/SummaryReport';
import ProjectReport from './views/project_report/ProjectReport';
import AddUser from './views/secure/AddUser';
import QuotaManagement from './views/quota_management/viewing/QuotaManagement';
import ResetPassword from './views/secure/ResetPassword';
import UserManagement from './views/user_management/UserManagement';

import ROLES from './ROLES_LIST.json';
import ProductionReport from './views/production_report/ProductionReport';
import QuotaPublishing from './views/quota_management/publishing/QuotaPublishing';

function App() {
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

{/* <Route
  path='reset-password'
  element={<div>Reset password route works!</div>}
/> */}

        <Route
  path='reset-password'
  element={
      <ResetPassword />
  }
/>

        {/* protected routes */}
        <Route
          element={
            <RequireAuth
              allowedRoles={[
                ROLES.Admin,
                ROLES.Executive,
                ROLES.Manager,
                ROLES.External,
                ROLES.Programmer,
              ]}
            />
          }
        >
          <Route path='github' element={<IssueForm />} />
          <Route path='welcome' element={<Welcome />} />
          <Route path='quota-management' element={<QuotaManagement />} />
        </Route>

        <Route
          element={
            <RequireAuth
              allowedRoles={[
                ROLES.Admin,
                ROLES.Executive,
                ROLES.Manager,
                ROLES.Programmer,
              ]}
            />
          }
        >
          <Route path='summary-report' element={<SummaryReport />} />
          <Route path='project-report' element={<ProjectReport />} />
          <Route path='production-report' element={<ProductionReport />} />
          <Route path='publishquotas' element={<QuotaPublishing />} />
        </Route>

        <Route
          element={
            <RequireAuth allowedRoles={[ROLES.Admin, ROLES.Executive]} />
          }
        >
          <Route path='adduser' element={<AddUser />} />
          <Route path='user-management' element={<UserManagement />} />
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
