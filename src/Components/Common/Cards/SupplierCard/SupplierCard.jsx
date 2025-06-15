import './SupplierCard.css';
import { FaEdit, FaTrash, FaCheck } from 'react-icons/fa';
import { useState } from 'react';

export const SupplierCard = ({
    id,
    supplierName: initialSupplierName = '',
    address: initialAddress = '',
    phone: initialPhone = '',
    email: initialEmail = '',
    onActualizar,
    onUpdateSupplier, 
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        supplierName: initialSupplierName,
        address: initialAddress,
        phone: initialPhone,
        email: initialEmail
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        await onUpdateSupplier(id, formData); 
        setIsEditing(false);
    };

    return (
        <div className="supplier-card">
            <div className="supplier-avatar">
                {formData.supplierName && <span>{formData.supplierName.charAt(0).toUpperCase()}</span>}
            </div>
            <div className="supplier-content">
                <div className="supplier-name">
                    {isEditing ? (
                        <input
                            type="text"
                            name="supplierName"
                            value={formData.supplierName}
                            onChange={handleInputChange}
                            className="editSupplier-input"
                        />
                    ) : (
                        <h2>{formData.supplierName}</h2>
                    )}
                </div>
                <div className="supplier-info">
                    <div className="supplier-detail">
                        <span className="supplier-label">Dirección:</span>
                        {isEditing ? (
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                className="editSupplier-input"
                            />
                        ) : (
                            <span className="supplier-value">{formData.address}</span>
                        )}
                    </div>
                    <div className="supplier-detail">
                        <span className="supplier-label">Teléfono:</span>
                        {isEditing ? (
                            <input
                                type="text"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                className="editSupplier-input"
                            />
                        ) : (
                            <span className="supplier-value">{formData.phone}</span>
                        )}
                    </div>
                    <div className="supplier-detail">
                        <span className="supplier-label">Email:</span>
                        {isEditing ? (
                            <input
                                type="text"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="editSupplier-input"
                            />
                        ) : (
                            <span className="supplier-value">{formData.email}</span>
                        )}
                    </div>
                </div>
            </div>
            <div className="supplier-actions">
                {isEditing ? (
                    <button className="icon-button edit" title="Guardar" onClick={handleSave}>
                        <FaCheck />
                    </button>
                ) : (
                    <button className="icon-button edit" title="Editar" onClick={() => setIsEditing(true)}>
                        <FaEdit />
                    </button>
                )}
                <button className="icon-button delete" title="Eliminar">
                    <FaTrash />
                </button>
            </div>
        </div>
    );
};
