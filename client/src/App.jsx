import React from 'react';
import { Routes, Route } from 'react-router-dom';
// Compnents
import Layout from './components/Layout';
import Public from './components/Public';
import Missing from './components/Missing';

// Features
import Login from './features/auth/Login';
import RequireAuth from './features/auth/RequireAuth';
import RedirectIfAuthenticated from './features/auth/RedirectIfAuthenticated';
import ResetPassword from './features/auth/ResetPassword';
import IssueForm from './features/github/Github';
import LiveProjectsTable from './features/live_projects/LiveProjects';
import ProductionReport from './features/production_report/ProductionReport';

// Views
import Welcome from './views/Welcome';
import UsersList from './views/users/UsersList';
import UpdateUserRoles from './views/users/UpdateUserRoles';

import ROLES from './ROLES_LIST.json';

function App() {
  return (
    <Routes>
      <Route path='/' element={<Layout />}>
        {/* public routes */}
        <Route index element={<Public />} />
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
