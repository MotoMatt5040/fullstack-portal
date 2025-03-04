import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useDispatch } from "react-redux";
import React from "react";
import { setCredentials } from "./authSlice";
import { useLoginMutation } from "./authApiSlice";

import useInput from "../../hooks/useInput";
import useToggle from "../../hooks/useToggle";

import { Link } from "react-router-dom"

const Login = () => {
    const userRef = useRef();
    const errRef = useRef();
    const [user, setUser, userAttribs] = useInput("user", "");
    const [pwd, setPwd] = useState("");
    const [errMsg, setErrMsg] = useState("");
    const [check, toggleCheck] = useToggle("persist", false);
    const navigate = useNavigate();

    const [login, { isLoading }] = useLoginMutation();
    const dispatch = useDispatch();

    useEffect(() => {
        userRef.current.focus();
    }, []);

    useEffect(() => {
        setErrMsg("");
    }, [user, pwd]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const userData = await login({ user, pwd }).unwrap();
            dispatch(setCredentials({ ...userData, user }));
            document.cookie = `persist=${check}; path=/`;
            setUser("");
            setPwd("");
            navigate("/welcome");
        } catch (err) {
            if (!err?.status) {
                setErrMsg("No Server Response");
            } else if (err.status === 400) {
                setErrMsg("Missing Username or Password");
            } else if (err.status === 401) {
                setErrMsg("Unauthorized");
            } else {
                setErrMsg("Login Failed");
            }
            errRef.current.focus();
        }
    };

    // const handleUserInput = (e) => setUser(e.target.value);

    const handlePwdInput = (e) => setPwd(e.target.value);

    const content = isLoading ? (
        <>
            <h1>Loading...</h1>
            <p
                ref={errRef}
                className={errMsg ? "errmsg" : "offscreen"}
                aria-live="assertive"
            >
                {errMsg}
            </p>
        </>
    ) : (
        <section className="login">
            <p
                ref={errRef}
                className={errMsg ? "errmsg" : "offscreen"}
                aria-live="assertive"
            >
                {errMsg}
            </p>

            <h1>Employee Login</h1>

            <form onSubmit={handleSubmit}>
                <label htmlFor="username">Username:</label>
                <input
                    type="text"
                    id="username"
                    ref={userRef}
                    {...userAttribs}
                    required
                />

                <label htmlFor="password">Password:</label>
                <input
                    type="password"
                    id="password"
                    onChange={handlePwdInput}
                    value={pwd}
                    required
                />
                <button>Sign In</button>
                <div className="persistCheck">
                    <input
                        type="checkbox"
                        id="persist"
                        onChange={toggleCheck}
                        checked={check}
                    />
                    <label htmlFor="persist">&nbsp;Keep me logged in.</label>
                </div>
            </form>
            <p>
                <Link to="/reset-password">Forgot Password?</Link>
            </p>
        </section>
    );

    return content;
};
export default Login;
