import { useState } from 'react';

export default function CreateSupplierMoggle({ visible, onClose, onSubmit }) {
    const [formData, setFormData] = useState({
        supplierName: "",
        address: "",
        phone: "",
        email: ""
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = () => {
        const dataToSubmit = {
            ...formData
        };
        onSubmit(dataToSubmit);
    };

    if (!visible) return null;

    return (
        <>
            <div className="modal-overlay">
                <div className="modal-content">
                    <h2 className="modal-title">Agregar Proveedor</h2>
                    <form className="modal-form">
                        <input
                            type="text"
                            name="supplierName"
                            placeholder="Nombre"
                            value={formData.supplierName}
                            onChange={handleChange}
                        />
                        <input
                            type="email"
                            name="email"
                            placeholder="Correo electrónico"
                            value={formData.email}
                            onChange={handleChange}
                        />
                        <input
                            type="tel"
                            name="phone"
                            placeholder="Teléfono"
                            value={formData.phone}
                            onChange={handleChange}
                        />
                        <input
                            type="text"
                            name="address"
                            placeholder="Direccion"
                            value={formData.address}
                            onChange={handleChange}
                        />
                    </form>
                    <div className="modal-actions">
                        <button className="btn-primary" onClick={handleSubmit}>
                            Guardar
                        </button>
                        <button className="btn-secondary" onClick={onClose}>
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}