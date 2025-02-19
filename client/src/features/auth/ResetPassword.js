import { useState } from "react";
import { useResetPasswordMutation } from "./authApiSlice";

const ResetPassword = () => {
    const [email, setEmail] = useState("");
    const [errMsg, setErrMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [resetPassword, { isLoading }] = useResetPasswordMutation();

    const handleChange = (e) => {
        setEmail(e.target.value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await resetPassword({ email }).unwrap();
            setSuccessMsg("Reset link sent successfully!");
            setEmail("");
        } catch (err) {
            if (!err?.status) {
                setErrMsg("No Server Response");
            } else if (err.status === 400) {
                setErrMsg("Invalid Email");
            } else {
                setErrMsg("Reset Password Failed");
            }
        }
    };

    return (
        <section className="reset-password">
            <h1>Reset Password</h1>
            <form onSubmit={handleSubmit}>
                <label htmlFor="email">Email:</label>
                <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={handleChange}
                    required
                />
                <button type="submit" disabled={isLoading}>
                    {isLoading ? "Sending..." : "Send Reset Link"}
                </button>
            </form>
            {errMsg && <p className="errmsg">{errMsg}</p>}
            {successMsg && <p className="successmsg">{successMsg}</p>}
        </section>
    );
};

export default ResetPassword;