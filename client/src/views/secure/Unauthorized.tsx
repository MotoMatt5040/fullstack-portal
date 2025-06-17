import React from 'react';
import { useNavigate } from "react-router-dom";
import { FaExclamationTriangle } from 'react-icons/fa';
import './Unauthorized.css';

const Unauthorized = () => {
    const navigate = useNavigate();

    const goBack = () => navigate(-1);

    return (
        <div className="unauthorized-container">
            <div className="unauthorized-card">
                <div className="unauthorized-icon">
                    <FaExclamationTriangle />
                </div>
                <h1 className="unauthorized-title">Access Denied</h1>
                <p className="unauthorized-message">
                    You do not have the necessary permissions to view this page.
                </p>
                <button className="unauthorized-button" onClick={goBack}>
                    Go Back to Previous Page
                </button>
            </div>
        </div>
    );
}

export default Unauthorized;
