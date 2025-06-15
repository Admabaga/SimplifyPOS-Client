// src/components/UserProfileMenu/UserProfileMenu.jsx
import React, { useState, useRef, useEffect } from 'react';
import './UserProfileMenu.css'; // Importa tus estilos CSS aquí
import { FaUserCircle, FaCog, FaSignOutAlt, FaUser, FaInfoCircle } from 'react-icons/fa'; // Iconos

const UserProfileMenu = ({ userImage, userName, onLogout, onProfileClick, onSettingsClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null); // Ref para detectar clics fuera del menú

  // Efecto para cerrar el menú cuando se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleMenuItemClick = (action) => {
    setIsOpen(false); // Cierra el menú al seleccionar una opción
    switch (action) {
      case 'profile':
        onProfileClick && onProfileClick();
        break;
      case 'settings':
        onSettingsClick && onSettingsClick();
        break;
      case 'logout':
        onLogout && onLogout();
        break;
      default:
        break;
    }
  };

  return (
    <div className="user-profile-menu" ref={menuRef}>
      <div className="user-avatar-trigger" onClick={handleToggleMenu}>
        {userImage ? (
          <img src={userImage} alt={userName || 'Usuario'} className="avatar-image" />
        ) : (
          <FaUserCircle className="avatar-placeholder-icon" /> // Icono de usuario por defecto
        )}
      </div>

      {isOpen && (
        <div className="dropdown-menu">
          <div className="menu-header">
            {userImage ? (
              <img src={userImage} alt={userName || 'Usuario'} className="header-avatar-image" />
            ) : (
              <FaUserCircle className="header-avatar-placeholder-icon" />
            )}
            <span className="user-name">{userName || 'Usuario'}</span>
          </div>
          <ul className="menu-options">
            <li className="menu-item" onClick={() => handleMenuItemClick('profile')}>
              <FaUser className="menu-icon" />
              <span>Perfil</span>
            </li>
            <li className="menu-item" onClick={() => handleMenuItemClick('settings')}>
              <FaCog className="menu-icon" />
              <span>Configuración</span>
            </li>
            <li className="menu-item" onClick={() => handleMenuItemClick('about')}>
              <FaInfoCircle className="menu-icon" />
              <span>Acerca de</span>
            </li>
            <li className="menu-item logout-item" onClick={() => handleMenuItemClick('logout')}>
              <FaSignOutAlt className="menu-icon" />
              <span>Cerrar Sesión</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default UserProfileMenu;