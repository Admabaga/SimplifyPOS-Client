import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Eye, EyeSlash } from 'react-bootstrap-icons';
import ApiClient from '../../../../Util/ApiClient/ApiClient.jsx'
import './PasswordForm.css';

const PasswordForm = () => {
  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
    confirm: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);



  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setIsLoading(true);
    try {
      await ApiClient.patch('/users/updatePassword', passwords);
      toast.success('¡Contraseña actualizada correctamente!');
      setPasswords({ oldPassword: '', newPassword: '', confirm: '' });
    } catch (error) {
      toast.error('Error al actualizar la contraseña');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <form onSubmit={handleSubmit} className="profile-form-container">
      <div className="profile-form-group">
        <label className="profile-form-label">Contraseña Actual</label>
        <input
          type={showPassword ? 'text' : 'password'}
          value={passwords.oldPassword}
          onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })}
          className="profile-form-input"
        />
      </div>

      <div className="profile-form-group">
        <label className="profile-form-label">Nueva Contraseña</label>
        <input
          type={showPassword ? 'text' : 'password'}
          value={passwords.newPassword}
          onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
          className="profile-form-input"
        />
        <div className="profile-password-strength">
          <div
            className="profile-strength-bar"
            style={{
              width: `${Math.min(passwords.newPassword.length * 10, 100)}%`,
              background: passwords.newPassword.length >= 8 ? '#48bb78' : '#e53e3e',
            }}
          />
        </div>
      </div>

      <div className="profile-form-group">
        <label className="profile-form-label">Confirmar Contraseña</label>
        <input
          type={showPassword ? 'text' : 'password'}
          value={passwords.confirm}
          onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
          className="profile-form-input"
        />
      </div>
      <div style={{ textAlign: 'right', margin: '10px 0' }}>
        <span
          className="profile-password-toggle"
          onClick={toggleShowPassword}
          style={{ cursor: 'pointer', color: '#666' }}
        >
          {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
          <span style={{ marginLeft: '5px' }}>
            {showPassword ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
          </span>
        </span>
      </div>

      <button
        type="submit"
        className="profile-submit-button"
        disabled={!passwords.oldPassword || !passwords.newPassword || !passwords.confirm || isLoading}
      >
        {isLoading ? 'Procesando...' : 'Cambiar Contraseña'}
      </button>
    </form>
  );
};

export default PasswordForm;