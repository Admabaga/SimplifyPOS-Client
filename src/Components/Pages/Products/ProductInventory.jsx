import React, { useState, useEffect } from 'react';
import ProductTable from '../../Common/Tables/ProductTable.jsx';
import NavBar from '../../Common/Nav/Nav';
import HeaderCard from '../../Common/Cards/HeaderCard/HeaderCard.jsx';
import ProductCreateModal from '../../Common/Moggles/CreateProductModal/CreateProductModal.jsx'
import ApiClient from '../../../Util/ApiClient/ApiClient';
import toast from 'react-hot-toast';
import formatearNumero from '../../../Util/NumberConverter/NumberConverter.jsx';
import './ProductInventory.css';

const ProductInventory = () => {
    const [products, setProducts] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [categories, setCategories] = useState([])
    const [suppliers, setSuppliers] = useState([])

    const getCategories = async () => {
        try {
            const response = await ApiClient.get("/categories");
            setCategories(response.data);
        } catch (error) {
            toast.error("Error cargando categories:", error.response?.data?.message);
        }
    };

    const getSuppliers = async () => {
        try {
            const response = await ApiClient.get("/users/suppliers");
            setSuppliers(response.data);
        } catch (error) {
            toast.error("Error cargando suppliers:", error.response?.data?.message);
        }
    };

    const getProducts = async () => {
        try {
            const responseProducts = await ApiClient.get('/users/products')
            setProducts(responseProducts.data);
            setFilteredProducts(responseProducts.data);
            console.log(responseProducts.data)
        } catch (error) {
            toast.error(error.response?.data?.message || "Error al cargar productos.")
        }

    };

    const filterProducts = (query) => {
        if (!query.trim()) {
            setFilteredProducts(products);
            return;
        }
        const lowerQuery = query.toLowerCase();
        const getStringValue = (item, propName) => {
            const prop = item[propName];
            if (typeof prop === 'object' && prop !== null) {
                return String(prop.name || prop.supplierName || '').toLowerCase();
            }
            return String(prop || '').toLowerCase();
        };
        const filtered = products.filter(product => {
            return (
                getStringValue(product, 'productName').includes(lowerQuery) ||
                getStringValue(product, 'code').includes(lowerQuery) ||
                getStringValue(product, 'internalCode').includes(lowerQuery) ||
                getStringValue(product, 'supplier').includes(lowerQuery) ||
                getStringValue(product, 'category').includes(lowerQuery)
            );
        });

        setFilteredProducts(filtered);
    };


    const productUpdate = async (updatedProduct, productId) => {
        try {
            await ApiClient.patch(`/users/products/${productId}`, updatedProduct);
            toast.success("¡Producto actualizado!")
            getProducts();
        } catch (error) {
            toast.error(error.response?.data?.message || "Error al actualizar producto!");
        }
    };

    const handleCreateProduct = async (formData) => {
        try {
            await ApiClient.post('/users/products', formData)
            toast.success("¡Producto agregado!")
            getProducts()
        } catch (error) {
            toast.error(error.response?.data?.message || "Error al crear producto.")
        }
    };

    useEffect(() => {
        getCategories()
        getSuppliers()
        getProducts()
    }, []);

    const totalUnidades = filteredProducts.reduce((acc, prod) => acc + prod.quantity, 0);
    const valorTotalInventario = filteredProducts.reduce(
        (acc, prod) => acc + prod.quantity * prod.getProductUnitPriceValue,
        0
    );


    return (
        <div className="app-container">
            <NavBar />
            <div className="content-container">
                <HeaderCard
                    onBuscar={filterProducts}
                    title={"Productos"}
                    typeAgree={"Agregar Producto"}
                    typeSearch={"Buscar producto..."}
                    onAgregar={() => setIsModalVisible(true)}
                />
                <div className='profile-container'>
                    <div className="product-inventory">
                        <h2>Mi Inventario</h2>
                        <div className="summary-bar">
                            <div className="summary-item">
                                <span>Total de productos:</span>
                                <strong>{filteredProducts.length}</strong>
                            </div>
                            <div className="summary-item">
                                <span>Total de unidades:</span>
                                <strong>{totalUnidades}</strong>
                            </div>
                            <div className="summary-item">
                                <span>Valor total del inventario:</span>
                                <strong>${formatearNumero(valorTotalInventario)}</strong>
                            </div>
                        </div>
                        <ProductTable
                            products={filteredProducts}
                            onUpdate={productUpdate}
                            suppliers={suppliers}
                            categories={categories}
                        />
                    </div>
                    {isModalVisible && (
                        <ProductCreateModal
                            onClose={() => setIsModalVisible(false)}
                            onCreate={handleCreateProduct}
                            categories={categories}
                            suppliers={suppliers}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductInventory;
