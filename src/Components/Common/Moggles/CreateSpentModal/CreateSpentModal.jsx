import { useState, useEffect } from 'react';

export default function CreateSpentModal({  onClose, onCreate }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        value: '',
        spentDate: ''
    });


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const dataToSend = {
            ...formData,
            spentDate: formData.spentDate ? `${formData.spentDate}T00:00:00` : null
        };

        onCreate(dataToSend);
        onClose();
    };
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2 className='modal-title'>Agregar Gasto</h2>
                <form className="modal-form">
                    <input
                        type="text"
                        name="name"
                        placeholder="Nombre del gasto"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="text"
                        name="description"
                        placeholder="Descripción"
                        value={formData.description}
                        onChange={handleChange}
                    />
                    <input
                        type="number"
                        name="value"
                        placeholder="Valor"
                        value={formData.value}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="date"
                        name="spentDate"
                        value={formData.spentDate}
                        onChange={handleChange}
                        required
                    />
                </form>

                <div className="modal-actions">
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={handleSubmit}
                        disabled={!formData.name || !formData.value || !formData.spentDate}
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
    );
}
