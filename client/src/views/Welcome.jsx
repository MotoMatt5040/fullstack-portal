import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectCurrentUser, selectCurrentToken } from "../features/auth/authSlice";
import { Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import ROLES from "../ROLES_LIST.json";

const Welcome = () => {
    const user = useSelector(selectCurrentUser);
    const token = useSelector(selectCurrentToken);

    const welcome = user ? `Welcome ${user}!` : 'Welcome!';

    let roles = [];
    if (token) {
        const decodedToken = jwtDecode(token);
        roles = decodedToken.UserInfo?.roles || [];
    }

    const content = (
        <section className="welcome">
            <h1>{welcome}</h1>
            <h2>This page is currently under development.</h2>
            
            {/* {roles.includes(ROLES.Admin) && <p><Link to="/userslist">Go to the Users List</Link></p>} */}
            {/* {roles.includes(ROLES.Admin) && <p><Link to="/updateuserroles">Update user roles</Link></p>} */}
            
            <p><Link to="/github">Need to report an issue or request a new feature?</Link></p>
            {/* <p><Link to="/liveprojects">Live Projects Table</Link></p> */}
            {/* <p><Link to="/productionreport">Production Reports</Link></p> */}
            <br />
            <br />
            <br />
            <h1>Start Here!!</h1>
            <p><Link to="/summaryreport">Summary Reports</Link></p>
            
        </section>
    );

    return content;
}

export default Welcome;