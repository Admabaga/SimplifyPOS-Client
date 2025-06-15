import React, { useState, useEffect } from 'react'
import './ProfileHeader.css'
import ApiClient from '../../../../Util/ApiClient/ApiClient.jsx'
import { toast } from 'react-hot-toast'

const ProfileHeader = ({ formData, onAvatarUpdate }) => {
  const [avatar, setAvatar] = useState(formData.image);
  const [previousAvatarUrl, setPreviousAvatarUrl] = useState(formData.image);

  useEffect(() => {
    if (formData.image) {
      const isLocalhost = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

      const baseUrl = isLocalhost ?
        'http://localhost:8080' :
        'http://192.168.20.22:8080';

      const fullImageUrl = formData.image.startsWith('http') ?
        formData.image :
        `${baseUrl}${formData.image}`;

      const img = new Image();
      img.src = fullImageUrl;

      img.onload = () => {
        setAvatar(fullImageUrl);
        setPreviousAvatarUrl(fullImageUrl);
      };

      img.onerror = () => {
        console.error('Error cargando imagen, using fallback');
        setAvatar('/default-avatar.png');
        setPreviousAvatarUrl('/default-avatar.png');
      };
    }
  }, [formData.image]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      toast.error('La imagen es demasiado grande (máximo 100MB).');
      return;
    }
    if (!file.type.match('image.*')) {
      toast.error('Por favor selecciona un archivo de imagen válido.');
      return;
    }
    const currentAvatar = avatar;
    setPreviousAvatarUrl(currentAvatar);
    const previewUrl = URL.createObjectURL(file);
    setAvatar(previewUrl);
    const uploadData = new FormData();
    uploadData.append('image', file);

    try {
      const response = await ApiClient.patch('/users/updateImage', uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const serverAvatarUrl = response.data
      setAvatar(serverAvatarUrl)
      toast.success("¡Imagen de perfil actualizada correctamente!")
      if (onAvatarUpdate) {
        onAvatarUpdate(serverAvatarUrl)
      }
      URL.revokeObjectURL(previewUrl)

    } catch (error) {
      setAvatar(previousAvatarUrl)
      toast.error('Error al actualizar el avatar: ' + (error.response?.data?.error || error.message))
      URL.revokeObjectURL(previewUrl)
    }
  }

  return (
    <div className="profile-header-card">
      <label htmlFor="avatar-upload" className="avatar-upload-label">
        <img
          src={avatar}
          alt="Avatar"
          className="profile-avatar"
          onError={(e) => {
            e.target.onerror = null;
          }}
        />
        <input
          id="avatar-upload"
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          style={{ display: 'none' }}
        />
      </label>
      <div className="profile-user-info">
        <h2>{formData.name}</h2>
        <p>{formData.email}</p>
        <p>{formData.rol}</p>
      </div>
    </div>
  )
}


const HeaderProfile = ({ onBuscar }) => {
  return (
    <>
      <div className="category-card">
        <div className="category-card-header">
          <h2 className="category-title">Perfil</h2>
        </div>
      </div>
    </>
  )
}
export { ProfileHeader, HeaderProfile }