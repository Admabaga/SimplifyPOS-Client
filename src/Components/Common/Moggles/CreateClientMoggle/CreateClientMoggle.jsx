import { useState } from 'react';
import './CreateClientMoggle.css';

export default function CreateClientMoggle({ visible, onClose, onSubmit }) {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        documentType: "",
        documentId: "",
        bornDate: "",
        gender: ""
    });

    const documentTypes = [
        { label: "Cédula de Ciudadanía", value: "CC" },
        { label: "Cédula de Extranjería", value: "CE" },
        { label: "Pasaporte", value: "PA" },
        { label: "Permiso Especial de Permanencia", value: "PEP" },
        { label: "Documento Nacional de Identidad", value: "DNI" }
    ];

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = () => {
        const dataToSubmit = {
            ...formData,
            bornDate: formData.bornDate ? `${formData.bornDate}T00:00:00` : null
        };
        onSubmit(dataToSubmit);
    };

    if (!visible) return null;

    return (
        <>
            <div className="modal-overlay">
                <div className="modal-content">
                    <h2 className="modal-title">Agregar Cliente</h2>
                    <form className="modal-form">
                        <input
                            type="text"
                            name="name"
                            placeholder="Nombre"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                        <input
                            type="email"
                            name="email"
                            placeholder="Correo electrónico"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                        <input
                            type="tel"
                            name="phone"
                            placeholder="Teléfono"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                        />
                        <select
                            name="documentType"
                            value={formData.documentType}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Seleccione tipo de documento</option>
                            {documentTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                        <input
                            type="number"
                            name="documentId"
                            placeholder="Número documento"
                            value={formData.documentId}
                            onChange={handleChange}
                            required
                        />
                        <input
                            type="date"
                            name="bornDate"
                            value={formData.bornDate}
                            onChange={handleChange}
                            required
                        />
                        <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Seleccione género</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Femenino">Femenino</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </form>
                    <div className="modal-actions">
                        <button 
                            type="button" 
                            className="btn-primary" 
                            onClick={handleSubmit}
                            disabled={!formData.name || !formData.documentId}
                        >
                            Guardar
                        </button>
                        <button 
                            type="button" 
                            className="btn-secondary" 
                            onClick={onClose}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}