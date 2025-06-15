import React, { useState } from 'react';
import './CreateProductModal.css';
import '../CreateClientMoggle/CreateClientMoggle.css'

const CreateProductModal = ({ onClose, onCreate, categories, suppliers }) => {
    const [formData, setFormData] = useState({
        productName: '',
        code: '',
        internalCode: '',
        supplier: '',
        quantity: '',
        productUnitPrice: '',
        productNamePrice: '',
        categoryId: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        const updatedData = {
            ...formData,
            [name]: value,
        };

        if (name === 'productUnitPrice' || name === 'quantity') {
            const quantity = name === 'quantity' ? parseInt(value) : parseInt(updatedData.quantity);
            const unitPrice = name === 'productUnitPrice' ? parseInt(value) : parseInt(updatedData.productUnitPrice);
            updatedData.productNamePrice = !isNaN(quantity) && !isNaN(unitPrice) ? quantity * unitPrice : '';
        }

        setFormData(updatedData);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onCreate(formData);
        onClose();
    };

    return (
        <div className="modal-overlay fixed-fullscreen" onClick={onClose}>
            <div className="modal-content fullscreen-content" onClick={(e) => e.stopPropagation()}>
                <h2 className='modal-title'>Agregar Producto</h2>
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="row g-3">
                        <div className="col-12 col-lg-6">
                            <input type="text" name="productName" placeholder="Nombre del producto"
                                value={formData.productName} onChange={handleChange} required />
                        </div>
                        <div className="col-12 col-lg-6">
                            <input type="text" name="code" placeholder="SKU"
                                value={formData.code} onChange={handleChange} required />
                        </div>
                        <div className="col-12 col-lg-6">
                            <input type="text" name="internalCode" placeholder="Código interno"
                                value={formData.internalCode} onChange={handleChange} required />
                        </div>
                        <div className="col-12 col-lg-6">
                            <select name="supplier" value={formData.supplier} onChange={handleChange} required>
                                <option value="">Selecciona una proveedor</option>
                                {suppliers.map((sup) => (
                                    <option key={sup.id} value={sup.id}>{sup.supplierName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-12 col-lg-6">
                            <input type="number" name="quantity" placeholder="Cantidad"
                                value={formData.quantity} onChange={handleChange} required />
                        </div>
                        <div className="col-12 col-lg-6">
                            <input type="number" name="productUnitPrice" placeholder="Precio unitario"
                                value={formData.productUnitPrice} onChange={handleChange} required />
                        </div>
                        <div className="col-12 col-lg-6">
                            <input type="number" name="productNamePrice" placeholder="Precio total"
                                value={formData.productNamePrice} onChange={handleChange} readOnly />
                        </div>
                        <div className="col-12">
                            <select name="categoryId" value={formData.categoryId} onChange={handleChange} required>
                                <option value="">Selecciona una categoría</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="submit" className="btn-primary">Agregar</button>
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateProductModal;