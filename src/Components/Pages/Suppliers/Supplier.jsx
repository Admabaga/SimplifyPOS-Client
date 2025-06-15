import NavBar from "../../Common/Nav/Nav";
import HeaderCard from "../../Common/Cards/HeaderCard/HeaderCard";
import { useState, useEffect } from 'react';
import CreateSupplierMoggle from "../../Common/Moggles/CreateSupplierModal/CreateSupplierMoggle";
import { SupplierCard } from "../../Common/Cards/SupplierCard/SupplierCard";
import ApiClient from "../../../Util/ApiClient/ApiClient";
import toast from "react-hot-toast";

export default function Supplier() {
    const [suppliers, setSuppliers] = useState([]);
    const [filteredSuppliers, setFilteredSuppliers] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const getSupplier = async () => {
        try {
            const response = await ApiClient.get("/users/suppliers");
            setSuppliers(response.data);
            setFilteredSuppliers(response.data);
        } catch (error) {
            toast.error(error.response?.data?.message || "Error al cargar proveedores.");
        }
    };

    const filterSuppliers = (query) => {
        if (!query.trim()) {
            setFilteredSuppliers(suppliers);
            return;
        }
        const lowerCaseQuery = query.toLowerCase();
        const filtered = suppliers.filter(supplier => {
            return (
                supplier.supplierName.toLowerCase().includes(lowerCaseQuery) ||
                supplier.email.toLowerCase().includes(lowerCaseQuery)
            );
        });
        setFilteredSuppliers(filtered);
    };

    const handleAddSupplier = async (formData) => {
        try {
            await ApiClient.post("/users/suppliers", formData)
            await getSupplier();
            setIsModalVisible(false);
            toast.success("Proveedor agregado con éxito!")
        } catch (error) {
            toast.error(error.response?.data?.message || "Error al agregar proveedor.")
        }
    };

    const handleUpdateSupplier = async (id, updatedData) => {
        try {
            await ApiClient.patch(`/users/suppliers/${id}`, updatedData);
            toast.success("¡Proveedor actualizado con éxito!");
            getSupplier();
        } catch (error) {
            toast.error(error.response?.data?.message || "Error al actualizar proveedor.");
        }
    };

    useEffect(() => {
        getSupplier();
    }, []);

    return (
        <div className="app-container">
            <NavBar />
            <div className="content-container">
                <HeaderCard
                    onBuscar={filterSuppliers}
                    title={"Proveedores"}
                    typeAgree={"Agregar Proveedor"}
                    typeSearch={"Buscar proveedor..."}
                    onAgregar={() => setIsModalVisible(true)}
                />
                <div style={{ display: "flex", flexWrap: "wrap", padding: "1rem" }}>
                    {filteredSuppliers.map((supplier) => (
                        <SupplierCard
                            key={supplier.id}
                            id={supplier.id}
                            supplierName={supplier.supplierName}
                            address={supplier.address}
                            email={supplier.email}
                            phone={supplier.phone}
                            onActualizar={getSupplier}
                            onUpdateSupplier={handleUpdateSupplier}
                        />
                    ))}
                </div>
                <CreateSupplierMoggle
                    visible={isModalVisible}
                    onClose={() => setIsModalVisible(false)}
                    onSubmit={handleAddSupplier}
                />
            </div>
        </div>
    );
}