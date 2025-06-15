import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ValidationLogOut } from '../Cards/ValidationLogOut/ValidationLogOut.jsx';
import Logo from '../../Images/Logo.png'
import './Nav.css';
import ApiClient from '../../../Util/ApiClient/ApiClient.jsx';
import toast from 'react-hot-toast';

export default function NavBar() {
    const [openSubmenu, setOpenSubmenu] = useState(null);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();

    const toggleSubmenu = (menu) => {
        setOpenSubmenu(openSubmenu === menu ? null : menu);
    };

    const handleLogout = async () => {
        try {
            const response = await ApiClient.post('/users/logout');
            toast.success('¡Sesion cerrada!')
        } catch (error) {
            toast.error('Error de red o CORS al contactar el servidor para logout:', error);
        }
        navigate('/', { replace: true });
    };

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    return (
        <div className="navbar-vertical-container">
            <nav className="navbar navbar-dark navbar-vertical">
                <div className="container-fluid flex-column align-items-start">
                    <div className="d-flex w-100 align-items-center justify-content-between d-lg-none mobile-header">
                        <div className="mobile-logo">
                            <img src={Logo} alt="Solaris IQ Logo" />
                        </div>
                        <button
                            className="navbar-toggler"
                            type="button"
                            onClick={toggleMobileMenu}
                            aria-expanded={mobileMenuOpen}
                        >
                            <span className="navbar-toggler-icon"></span>
                        </button>
                    </div>
                    <div className="d-none d-lg-flex flex-column align-items-center w-100 desktop-header">
                        <div className="desktop-logo">
                            <img src={Logo} alt="Solaris IQ Logo" />
                        </div>
                    </div>
                    <div className={`mobile-menu ${mobileMenuOpen ? 'show' : ''} d-lg-none w-100`}>
                        <ul className="navbar-nav flex-column w-100">
                            <li className="nav-item">
                                <NavLink
                                    className={({ isActive }) =>
                                        isActive ? "nav-link active" : "nav-link"
                                    }
                                    to="/tables"
                                    end
                                >
                                    <i className="bi bi-house-door-fill me-2"></i> Inicio
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <div
                                    className={`nav-link ${openSubmenu === 'productos' ? 'active' : ''}`}
                                    onClick={() => toggleSubmenu('productos')}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <i className="bi bi-box-seam me-2"></i> Productos
                                </div>
                                {openSubmenu === 'productos' && (
                                    <ul className="submenu ps-3">
                                        <li>
                                            <NavLink
                                                className={({ isActive }) =>
                                                    isActive ? "nav-link active" : "nav-link"
                                                }
                                                to="/products"
                                            >
                                                Inventario
                                            </NavLink>
                                        </li>
                                        <li>
                                            <NavLink
                                                className={({ isActive }) =>
                                                    isActive ? "nav-link active" : "nav-link"
                                                }
                                                to="/productos/energiaHidroelectrica"
                                            >
                                                Energia Hidroelectrica
                                            </NavLink>
                                        </li>
                                        <li>
                                            <NavLink
                                                className={({ isActive }) =>
                                                    isActive ? "nav-link active" : "nav-link"
                                                }
                                                to="/productos/energiaSolar"
                                            >
                                                Energia solar
                                            </NavLink>
                                        </li>
                                    </ul>
                                )}
                            </li>
                            <li className="nav-item">
                                <div
                                    className={`nav-link ${openSubmenu === 'reservaciones' ? 'active' : ''}`}
                                    onClick={() => toggleSubmenu('reservaciones')}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <i className="bi bi-check2-square me-2"></i> Reservaciones
                                </div>
                                {openSubmenu === 'reservaciones' && (
                                    <ul className="submenu ps-3">
                                        <li>
                                            <NavLink
                                                className={({ isActive }) =>
                                                    isActive ? "nav-link active" : "nav-link"
                                                }
                                                to="/reservaciones/registroConsumo"
                                            >
                                                Agrega tus consumos
                                            </NavLink>
                                        </li>
                                        <li>
                                            <NavLink
                                                className={({ isActive }) =>
                                                    isActive ? "nav-link active" : "nav-link"
                                                }
                                                to="/reservaciones/misConsumos"
                                            >
                                                Mis consumos
                                            </NavLink>
                                        </li>
                                        <li>
                                            <NavLink
                                                className={({ isActive }) =>
                                                    isActive ? "nav-link active" : "nav-link"
                                                }
                                                to="/reservaciones/actualizarConsumos"
                                            >
                                                Actualizar consumos
                                            </NavLink>
                                        </li>
                                    </ul>
                                )}
                            </li>
                            <li className="nav-item">
                                <div
                                    className={`nav-link ${openSubmenu === 'gastos' ? 'active' : ''}`}
                                    onClick={() => toggleSubmenu('gastos')}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <i className="bi bi-cash-stack me-2"></i> Gastos
                                </div>
                                {openSubmenu === 'gastos' && (
                                    <ul className="submenu ps-3">
                                        <li>
                                            <NavLink
                                                className={({ isActive }) =>
                                                    isActive ? "nav-link active" : "nav-link"
                                                }
                                                to="/gastos/registroConsumo"
                                            >
                                                Agrega tus consumos
                                            </NavLink>
                                        </li>
                                        <li>
                                            <NavLink
                                                className={({ isActive }) =>
                                                    isActive ? "nav-link active" : "nav-link"
                                                }
                                                to="/gastos/misConsumos"
                                            >
                                                Mis consumos
                                            </NavLink>
                                        </li>
                                        <li>
                                            <NavLink
                                                className={({ isActive }) =>
                                                    isActive ? "nav-link active" : "nav-link"
                                                }
                                                to="/gastos/actualizarConsumos"
                                            >
                                                Actualizar consumos
                                            </NavLink>
                                        </li>
                                    </ul>
                                )}
                            </li>
                            <li className="nav-item">
                                <NavLink
                                    className={({ isActive }) =>
                                        isActive ? "nav-link active" : "nav-link"
                                    }
                                    to="/categories"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <i className="bi bi-folder2-open me-2"></i> Categorias
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink
                                    className={({ isActive }) =>
                                        isActive ? "nav-link active" : "nav-link"
                                    }
                                    to="/clients"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <i className="bi bi-person-vcard me-2"></i> Clientes
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink
                                    className={({ isActive }) =>
                                        isActive ? "nav-link active" : "nav-link"
                                    }
                                    to="/suppliers"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <i className="bi bi-people-fill me-2"></i> Proveedores
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <div
                                    className={`nav-link ${openSubmenu === 'facturacion' ? 'active' : ''}`}
                                    onClick={() => toggleSubmenu('facturacion')}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <i className="bi bi-file-earmark-text me-2"></i> Facturacion
                                </div>
                                {openSubmenu === 'facturacion' && (
                                    <ul className="submenu ps-3">
                                        <li>
                                            <NavLink
                                                className={({ isActive }) =>
                                                    isActive ? "nav-link active" : "nav-link"
                                                }
                                                to="/invoices/buys"
                                            >
                                                <i className="bi bi-cart-check  me-2"></i> Factura compra
                                            </NavLink>
                                        </li>
                                        <li>
                                            <NavLink
                                                className={({ isActive }) =>
                                                    isActive ? "nav-link active" : "nav-link"
                                                }
                                                to="/invoices/sales"
                                            >
                                                <i className="bi bi-currency-dollar me-2"></i> Factura venta
                                            </NavLink>
                                        </li>
                                    </ul>
                                )}
                            </li>
                            <li>
                                <NavLink
                                    className={({ isActive }) =>
                                        isActive ? "nav-link active" : "nav-link"
                                    }
                                    to="/profile"
                                >
                                    <i className="bi bi-person-fill me-2"></i> Perfil
                                </NavLink>
                            </li>
                            <li className="nav-item logout-item">
                                <button
                                    className="nav-link logout-btn"
                                    onClick={() => setShowLogoutModal(true)}
                                >
                                    <i className="bi bi-box-arrow-right me-2"></i>
                                    Cerrar sesión
                                </button>
                            </li>
                        </ul>
                    </div>
                    <div className="d-none d-lg-flex flex-column w-100 desktop-menu">
                        <ul className="navbar-nav flex-column w-100">
                            <li className="nav-item">
                                <NavLink
                                    className={({ isActive }) =>
                                        isActive ? "nav-link active" : "nav-link"
                                    }
                                    to="/tables"
                                    end
                                >
                                    <i className="bi bi-house-door-fill me-2"></i> Inicio
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <div
                                    className={`nav-link ${openSubmenu === 'productos' ? 'active' : ''}`}
                                    onClick={() => toggleSubmenu('productos')}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <i className="bi bi-box-seam me-2"></i> Productos
                                </div>
                                {openSubmenu === 'productos' && (
                                    <ul className="submenu ps-3">
                                        <li>
                                            <NavLink
                                                className={({ isActive }) =>
                                                    isActive ? "nav-link active" : "nav-link"
                                                }
                                                to="/products"
                                            >
                                                Inventario
                                            </NavLink>
                                        </li>
                                        <li>
                                            <NavLink
                                                className={({ isActive }) =>
                                                    isActive ? "nav-link active" : "nav-link"
                                                }
                                                to="/productos/energiaHidroelectrica"
                                            >
                                                Energia Hidroelectrica
                                            </NavLink>
                                        </li>
                                        <li>
                                            <NavLink
                                                className={({ isActive }) =>
                                                    isActive ? "nav-link active" : "nav-link"
                                                }
                                                to="/productos/energiaSolar"
                                            >
                                                Energia solar
                                            </NavLink>
                                        </li>
                                    </ul>
                                )}
                            </li>
                            <li className="nav-item">
                                <div
                                    className={`nav-link ${openSubmenu === 'reservaciones' ? 'active' : ''}`}
                                    onClick={() => toggleSubmenu('reservaciones')}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <i className="bi bi-check2-square me-2"></i> Reservaciones
                                </div>
                                {openSubmenu === 'reservaciones' && (
                                    <ul className="submenu ps-3">
                                        <li>
                                            <NavLink
                                                className={({ isActive }) =>
                                                    isActive ? "nav-link active" : "nav-link"
                                                }
                                                to="/reservaciones/registroConsumo"
                                            >
                                                Agrega tus consumos
                                            </NavLink>
                                        </li>
                                        <li>
                                            <NavLink
                                                className={({ isActive }) =>
                                                    isActive ? "nav-link active" : "nav-link"
                                                }
                                                to="/reservaciones/misConsumos"
                                            >
                                                Mis consumos
                                            </NavLink>
                                        </li>
                                        <li>
                                            <NavLink
                                                className={({ isActive }) =>
                                                    isActive ? "nav-link active" : "nav-link"
                                                }
                                                to="/reservaciones/actualizarConsumos"
                                            >
                                                Actualizar consumos
                                            </NavLink>
                                        </li>
                                    </ul>
                                )}
                            </li>
                            <li className="nav-item">
                                <NavLink
                                    className={({ isActive }) =>
                                        isActive ? "nav-link active" : "nav-link"
                                    }
                                    to="/spents"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <i className="bi bi-cash-stack me-2"></i> Gastos
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink
                                    className={({ isActive }) =>
                                        isActive ? "nav-link active" : "nav-link"
                                    }
                                    to="/categories"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <i className="bi bi-folder2-open me-2"></i> Categorias
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink
                                    className={({ isActive }) =>
                                        isActive ? "nav-link active" : "nav-link"
                                    }
                                    to="/clients"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <i className="bi bi-person-vcard me-2"></i> Clientes
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <NavLink
                                    className={({ isActive }) =>
                                        isActive ? "nav-link active" : "nav-link"
                                    }
                                    to="/suppliers"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <i className="bi bi-people-fill me-2"></i> Proveedores
                                </NavLink>
                            </li>
                            <li className="nav-item">
                                <div
                                    className={`nav-link ${openSubmenu === 'facturacion' ? 'active' : ''}`}
                                    onClick={() => toggleSubmenu('facturacion')}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <i className="bi bi-file-earmark-text me-2"></i> Facturacion
                                </div>
                                {openSubmenu === 'facturacion' && (
                                    <ul className="submenu ps-3">
                                        <li>
                                            <NavLink
                                                className={({ isActive }) =>
                                                    isActive ? "nav-link active" : "nav-link"
                                                }
                                                to="/invoices/buys"
                                            >
                                                <i className="bi bi-cart-check  me-2"></i> Factura compra
                                            </NavLink>
                                        </li>
                                        <li>
                                            <NavLink
                                                className={({ isActive }) =>
                                                    isActive ? "nav-link active" : "nav-link"
                                                }
                                                to="/invoices/sales"
                                            >
                                                <i className="bi bi-currency-dollar me-2"></i> Factura venta
                                            </NavLink>
                                        </li>
                                    </ul>
                                )}
                            </li>
                            <li>
                                <NavLink
                                    className={({ isActive }) =>
                                        isActive ? "nav-link active" : "nav-link"
                                    }
                                    to="/profile"
                                >
                                    <i className="bi bi-person-fill me-2"></i> Perfil
                                </NavLink>
                            </li>
                            <li className="nav-item logout-item">
                                <button
                                    className="nav-link logout-btn"
                                    onClick={() => setShowLogoutModal(true)}
                                >
                                    <i className="bi bi-box-arrow-right me-2"></i>
                                    Cerrar sesión
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>
            <ValidationLogOut
                show={showLogoutModal}
                onHide={() => setShowLogoutModal(false)}
                onConfirm={handleLogout}
            />
        </div>
    );
}