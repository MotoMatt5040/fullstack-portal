import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectCurrentUser, selectCurrentToken, logOut } from "./authSlice";
import { Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import ROLES from "../../ROLES_LIST.json";

const Welcome = () => {
    const dispatch = useDispatch();
    const user = useSelector(selectCurrentUser);
    const token = useSelector(selectCurrentToken);

    const welcome = user ? `Welcome ${user}!` : 'Welcome!';
    const tokenAbbr = `${token.slice(0, 9)}...`;

    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    const handleLogout = () => {
        dispatch(logOut());
    }

    let roles = [];
    if (token) {
        const decodedToken = jwtDecode(token);
        roles = decodedToken.UserInfo?.roles || [];
    }

    const content = (
        <section className="welcome">
            <h1>{welcome}</h1>
            <h2>This page is currently under development.</h2>
            <button className="theme-toggle" onClick={toggleTheme}>
                Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
            </button>
            {roles.includes(ROLES.Admin) && <p><Link to="/userslist">Go to the Users List</Link></p>}
            {roles.includes(ROLES.Admin) && <p><Link to="/updateuserroles">Update user roles</Link></p>}
            <button onClick={handleLogout}>Log Out</button>
            <p><Link to="/github">Need to report an issue or request a new feature?</Link></p>
            <p><Link to="/tables">Live Projects Table</Link></p>
            
        </section>
    );

    return content;
}

export default Welcome;