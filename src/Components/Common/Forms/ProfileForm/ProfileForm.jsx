import { toast } from 'react-hot-toast'
import ApiClient from '../../../../Util/ApiClient/ApiClient.jsx';
import { useState } from 'react'
import './ProfileForm.css'
import { FaEdit, FaSave } from 'react-icons/fa'

const ProfileForm = ({ formData, setFormData, onSubmit }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }))
  };

  const handleToggleEdit = async () => {
    if (isEditing) {
      try {
        setIsSubmitting(true);
        await ApiClient.patch('/users', formData)
        toast.success('Perfil actualizado correctamente')
        setIsEditing(false)
      } catch (error) {
        console.error('Error al actualizar el perfil:', error)
        toast.error(error.response?.data?.message || 'Error al actualizar el perfil')
      } finally {
        setIsSubmitting(false)
      }
    } else {
      setIsEditing(true)
    }
  }

  const fields = [
    { id: 'name', label: 'Nombre', name: 'name', type: 'text' },
    { id: 'email', label: 'Correo Electrónico', name: 'email', type: 'email' },
    { id: 'phone', label: 'Teléfono', name: 'phone', type: 'tel' },
    { id: 'nit', label: 'NIT', name: 'nit', type: 'text' },
    { id: 'address', label: 'Dirección', name: 'address', type: 'text' },
    { id: 'location', label: 'Ubicación', name: 'location', type: 'text' },
    {
      id: 'facturationResolution',
      label: 'Resolución de Facturación',
      name: 'facturationResolution',
      type: 'number'
    },
    {
      id: 'facturationType',
      label: 'Tipo de Facturación',
      name: 'facturationType',
      type: 'text'
    }
  ]

  return (
    <div className="enhanced-profile-form">
      <div className="profile-header">
        <h2>Información del Perfil</h2>
        <button
          className="edit-toggle-button"
          onClick={handleToggleEdit}
          disabled={isSubmitting}
        >
          {isEditing ? (
            <>
              <FaSave /> {isSubmitting ? 'Guardando...' : 'Guardar'}
            </>
          ) : (
            <>
              <FaEdit /> Editar
            </>
          )}
        </button>
      </div>

      <div className="profile-data-container">
        {fields.map((field) => (
          <div className={`form-group ${isEditing ? 'edit-mode' : 'view-mode'}`} key={field.id}>
            <label htmlFor={field.name}>{field.label}</label>

            {isEditing ? (
              <input
                id={field.name}
                type={field.type}
                name={field.name}
                value={formData[field.name] || ''}
                onChange={handleChange}
                readOnly={field.readOnly}
                className={field.readOnly ? 'read-only' : ''}
              />
            ) : (
              <p className="profile-data-value">
                {formData[field.name] || <span className="empty-value">—</span>}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ProfileForm