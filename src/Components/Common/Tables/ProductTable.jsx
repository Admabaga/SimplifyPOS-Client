import React, { useState } from 'react';
import { FaEdit, FaCheck, FaTimes } from 'react-icons/fa';
import formatearNumero from '../../../Util/NumberConverter/NumberConverter.jsx'
import './ProductTable.css';

const ProductTable = ({ categories, suppliers, products, onUpdate }) => {
    const [editProductId, setEditProductId] = useState(null);
    const [editedProduct, setEditedProduct] = useState({});

    const handleEditClick = (product) => {
        setEditProductId(product.id);
        setEditedProduct({ ...product });
    };

    const handleCancel = () => {
        setEditProductId(null);
        setEditedProduct({});
    };

    const handleConfirm = (productId) => {
        onUpdate(editedProduct, productId);
        setEditProductId(null);
        setEditedProduct({});
    };

    const handleChange = (e, field) => {
        const value = e.target.value;
        setEditedProduct((prev) => ({
            ...prev,
            [field]: field === 'quantity' || field === 'productUnitPrice' ? Number(value) : value,
        }));
    };

    return (
        <div className="table-wrapper">
            <table className="product-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Codigo producto</th>
                        <th>Nombre</th>
                        <th>Cantidad</th>
                        <th>Precio Unitario</th>
                        <th>Precio Total</th>
                        <th>Proveedor</th>
                        <th>Categoría</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((product, index) => {
                        const isEditing = editProductId === product.id;
                        return (
                            <tr key={product.id}>
                                <td>{index + 1}</td>
                                <td>
                                    {isEditing ? (
                                        <input
                                            value={editedProduct.code || ''}
                                            onChange={(e) => handleChange(e, 'code')}
                                        />
                                    ) : (
                                        product.code
                                    )}
                                </td>
                                <td>
                                    {isEditing ? (
                                        <input
                                            value={editedProduct.productName || ''}
                                            onChange={(e) => handleChange(e, 'productName')}
                                        />
                                    ) : (
                                        product.productName
                                    )}
                                </td>
                                <td>
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            value={editedProduct.quantity || ''}
                                            onChange={(e) => handleChange(e, 'quantity')}
                                        />
                                    ) : (
                                        product.quantity
                                    )}
                                </td>
                                <td>
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            value={editedProduct.getProductUnitPriceValue || ''}
                                            onChange={(e) => handleChange(e, 'getProductUnitPriceValue')}
                                        />
                                    ) : (
                                        `$${formatearNumero(product.getProductUnitPriceValue)}`
                                    )}
                                </td>
                                <td>
                                    {`$${formatearNumero(product.quantity * product.getProductUnitPriceValue)}`}
                                </td>
                                <td>
                                    {isEditing ? (
                                        <select
                                            value={editedProduct.supplier || ''}
                                            onChange={(e) => handleChange(e, 'supplier')}
                                        >
                                            <option value="">Selecciona un proveedor</option>
                                            {suppliers.map((supplier) => (
                                                <option key={supplier.id} value={supplier.supplierName}>
                                                    {supplier.supplierName}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        product.supplier
                                    )}
                                </td>
                                <td>
                                    {isEditing ? (
                                        <select
                                            value={editedProduct.categoryId || ''}
                                            onChange={(e) => handleChange(e, 'categoryId')}
                                        >
                                            {categories.map((category) => (
                                                <option key={category.id} value={category.id}>
                                                    {category.name}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        product.nombreCategoria
                                    )}
                                </td>
                                <td>
                                    {isEditing ? (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="edit-button save" onClick={() => handleConfirm(product.id)} title="Guardar">
                                                <FaCheck />
                                            </button>
                                            <button className="edit-button cancel" onClick={handleCancel} title="Cancelar">
                                                <FaTimes />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            className="edit-button"
                                            onClick={() => handleEditClick(product)}
                                            title="Editar"
                                        >
                                            <FaEdit />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default ProductTable;
