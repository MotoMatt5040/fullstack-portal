import React from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Public from "./components/Public";
import Login from "./features/auth/Login";
import Welcome from "./features/auth/Welcome";
import RequireAuth from "./features/auth/RequireAuth";
import UsersList from "./features/users/UsersList";
import ResetPassword from "./features/auth/ResetPassword";
import Missing from "./components/Missing";

const ROLES = {
  'Admin': 1,
  'Manager': 2,
  'External': 3,
  'User': 4
}

function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                {/* public routes */}
                <Route index element={<Public />} />
                <Route path="login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* protected routes */}
                <Route element={<RequireAuth allowedRoles={[ROLES.Admin]} />}>
                    <Route path="welcome" element={<Welcome />} />
                </Route>

                <Route element={<RequireAuth allowedRoles={[ROLES.Admin]} />}>
                    <Route path="userslist" element={<UsersList />} />
                </Route>

                {/* catch all route */}
                <Route path="*" element={<Missing />} />
            </Route>
        </Routes>
    );
}

export default App;
