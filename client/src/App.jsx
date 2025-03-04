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
import IssueForm from "./features/github/Github";
import UpdateUserRoles from "./features/users/UpdateUserRoles";
import ROLES from "./ROLES_LIST.json";

function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                {/* public routes */}
                <Route index element={<Public />} />
                <Route path="login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* protected routes */}
                <Route element={<RequireAuth allowedRoles={[ROLES.Admin, ROLES.Manager]} />}>
                    <Route path="welcome" element={<Welcome />} />
                    <Route path="github" element={<IssueForm />} />
                </Route>

                <Route element={<RequireAuth allowedRoles={[ROLES.Admin]} />}>
                    <Route path="userslist" element={<UsersList />} />
                    <Route path="updateuserroles" element={<UpdateUserRoles />} />
                </Route>

                {/* catch all route */}
                <Route path="*" element={<Missing />} />
            </Route>
        </Routes>
    );
}

export default App;
