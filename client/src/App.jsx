import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { useGetRolesQuery } from './features/config/configApiSlice';
import { selectRoles, selectIsRolesLoading } from './features/roles/rolesSlice';

// Core components (loaded immediately)
import Layout from './components/Layout';
import Login from './views/login/Login';
import RequireAuth from './features/auth/RequireAuth';
import RedirectIfAuthenticated from './features/auth/RedirectIfAuthenticated';
import Missing from './views/Missing';
import Unauthorized from './views/secure/Unauthorized';

// Lazy-loaded views (code-split for smaller initial bundle)
const Welcome = lazy(() => import('./views/Welcome'));
const UsersList = lazy(() => import('./views/users/UsersList'));
const IssueForm = lazy(() => import('./views/github/Github'));
const UpdateUserRoles = lazy(() => import('./views/users/UpdateUserRoles'));
const SummaryReport = lazy(
  () => import('./views/summary_report/SummaryReport'),
);
const ProjectReport = lazy(
  () => import('./views/project_report/ProjectReport'),
);
const AddUser = lazy(() => import('./views/secure/AddUser'));
const QuotaManagement = lazy(
  () => import('./views/quota_management/QuotaManagement'),
);
const ResetPassword = lazy(() => import('./views/secure/ResetPassword'));
const UserManagement = lazy(
  () => import('./views/user_management/UserManagement'),
);
const ProductionReport = lazy(
  () => import('./views/production_report/ProductionReport'),
);
const Reports = lazy(() => import('./views/Reports'));
const Toplines = lazy(() => import('./views/toplines/Toplines'));
const ProjectPublishing = lazy(
  () => import('./views/project_publishing/ProjectPublishing'),
);
const DispositionReport = lazy(
  () => import('./views/disposition_report/DispositionReport'),
);
const AIPrompting = lazy(() => import('./views/ai_prompting/AIPrompting'));
const ContactSupport = lazy(() => import('./views/support/ContactSupport'));
const SampleAutomation = lazy(
  () => import('./views/sample_automation/SampleAutomation'),
);
const ExtractionDefaults = lazy(
  () => import('./views/sample_automation/ExtractionDefaults'),
);
const SampleTracking = lazy(
  () => import('./views/sample_automation/SampleTracking'),
);
const CallID = lazy(() => import('./views/call_id/CallIDManagement'));
const ProjectNumbering = lazy(
  () => import('./views/project_numbering/ProjectNumbering'),
);
const QuotaSetupGuidePage = lazy(
  () => import('./views/docs/QuotaSetupGuidePage'),
);
const HeaderMappings = lazy(
  () => import('./views/header_mappings/HeaderMappings'),
);
const DataProcessing = lazy(
  () => import('./views/data_processing/DataProcessing'),
);
const ExtractionTaskAutomation = lazy(
  () =>
    import('./views/data_processing/views/extraction_task_automation/ExtractionTaskAutomation'),
);
const TableGenerator = lazy(
  () => import('./views/data_processing/table_generator/TableGenerator'),
);
const ColumnGenerator = lazy(
  () => import('./views/data_processing/column_generator/ColumnGenerator'),
);
const WeightingTool = lazy(
  () => import('./views/data_processing/weighting_tool/WeightingTool'),
);

// Loading fallback for lazy-loaded components
const PageLoader = () => <div className='page-loader'>Loading...</div>;

function App() {
  useGetRolesQuery();

  const roles = useSelector(selectRoles);
  const isRolesLoading = useSelector(selectIsRolesLoading);

  if (isRolesLoading) {
    return <p>Loading application...</p>;
  }

  return (
    <Suspense fallback={<PageLoader />}>
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
          <Route path='reset-password/:token' element={<ResetPassword />} />

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
            <Route path='contact-support' element={<ContactSupport />} />
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
            <Route path='project-database' element={<ProjectNumbering />} />
            {/* <Route path='publishquotas' element={<QuotaPublishing />} /> */}
          </Route>

          <Route
            element={
              <RequireAuth
                allowedRoles={[roles.Admin, roles.Executive, roles.Programmer]}
              />
            }
          >
            <Route path='sample-automation' element={<SampleAutomation />} />
            <Route
              path='extraction-defaults'
              element={<ExtractionDefaults />}
            />
            <Route path='sample-tracking' element={<SampleTracking />} />
            <Route path='header-mappings' element={<HeaderMappings />} />
            <Route path='call-id' element={<CallID />} />
          </Route>

          <Route
            element={
              <RequireAuth
                allowedRoles={[roles.Admin, roles.Executive, roles.Programmer]}
              />
            }
          >
            <Route path='project-publishing' element={<ProjectPublishing />} />
            <Route path='docs/quota-setup' element={<QuotaSetupGuidePage />} />
          </Route>

          <Route
            element={
              <RequireAuth
                allowedRoles={[roles.Admin, roles.Executive, roles.Programmer]}
              />
            }
          >
            <Route path='ai-prompting' element={<AIPrompting />} />
          </Route>

          <Route
            element={
              <RequireAuth
                allowedRoles={[
                  roles.Admin,
                  roles.Executive,
                  roles.Programmer,
                  roles.DataProcessor,
                ]}
              />
            }
          >
            <Route path='data-processing' element={<DataProcessing />} />
            <Route
              path='data-processing/extraction-task-automation'
              element={<ExtractionTaskAutomation />}
            />
            <Route
              path='data-processing/table-generator'
              element={<TableGenerator />}
            />
            <Route
              path='data-processing/column-generator'
              element={<ColumnGenerator />}
            />
            <Route
              path='data-processing/weighting-tool'
              element={<WeightingTool />}
            />
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
    </Suspense>
  );
}

export default App;
