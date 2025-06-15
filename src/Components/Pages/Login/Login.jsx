import React from "react";
import LoginForm from "../../Common/Forms/LoginForm/LoginForm";
import Logo from '../../Images/Icon.png'
import "./Login.css";

const Login = () => {
    return (
        <div className="login-page">
            <div className="login-banner">
                <div className="banner-overlay"></div>
                <div className="banner-content">
                    <img
                        src={Logo}
                        alt="SimplifyPOS Logo"
                        className="banner-logo"
                    />
                    <h1 className="banner-title">Bienvenido a SimplifyPOS</h1>
                    <p className="banner-subtitle">Gestión fácil, rápida y eficiente para tu negocio</p>
                    <div className="banner-animation">
                        <div className="floating-circles">
                            <div className="circle"></div>
                            <div className="circle"></div>
                            <div className="circle"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="login-form-container">
                <LoginForm />
            </div>
        </div>
    );
};

export default Login;
