import ClientCard from "../../Common/Cards/ClientCard/ClientCard";
import HeaderCard from "../../Common/Cards/HeaderCard/HeaderCard"
import NavBar from "../../Common/Nav/Nav"
import ApiClient from "../../../Util/ApiClient/ApiClient";
import { useState, useEffect } from 'react';
import CreateClientMoggle from "../../Common/Moggles/CreateClientMoggle/CreateClientMoggle";
import toast from 'react-hot-toast';

export default function Clients() {
    const [clients, setClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const getClients = async () => {
        try {
            const response = await ApiClient.get("/users/clients")
            setClients(response.data);
            setFilteredClients(response.data)
        } catch (error) {
            toast.error(error.response?.data?.message || "Error al cargar clientes.")
        }
    };

    const filterClients = (query) => {
        if (!query.trim()) {
            setFilteredClients(clients);
            return;
        }
        const lowerCaseQuery = query.toLowerCase();
        const filtered = clients.filter(client => {
            return (
                client.name.toLowerCase().includes(lowerCaseQuery) ||
                client.documentId.toString().includes(query)
            );
        });
        setFilteredClients(filtered);
    };

    const handleAddClient = async (formData) => {
        try {
            await ApiClient.post("/users/clients", formData);
            getClients()
            setIsModalVisible(false);
            toast.success("¡Cliente agregado!")
        } catch (error) {
            toast.error(error.response?.data?.message || "Error al agregar cliente.");
        }
    };

    const handleUpdateClient = async (id, data) => {
        try {
            await ApiClient.patch(`/users/clients/${id}`, data);
            toast.success("¡Cliente actualizado!")
            getClients();
        } catch (error) {
            toast.error(error.response?.data?.message || "Error al actualizar cliente !.");
        }
    };


    useEffect(() => {
        getClients();
    }, []);

    return (
        <>
            <div className="app-container">
                <NavBar />
                <div className="content-container">
                    <HeaderCard
                        onBuscar={filterClients}
                        title={"Clientes"}
                        typeAgree={"Agregar Cliente"}
                        typeSearch={"Buscar cliente..."}
                        onAgregar={() => setIsModalVisible(true)}
                    />
                    <div style={{ display: "block", padding: "1rem" }}>

                        {filteredClients.map((client) => (
                            <ClientCard
                                key={client.id}
                                id={client.id}
                                documentId={client.documentId}
                                name={client.name}
                                email={client.email}
                                phone={client.phone}
                                documentType={client.documentType}
                                gender={client.gender}
                                bornDate={client.bornDate}
                                onActualizar={getClients}
                                onEditarCliente={handleUpdateClient}
                            />
                        ))}
                    </div>
                    <CreateClientMoggle
                        visible={isModalVisible}
                        onClose={() => setIsModalVisible(false)}
                        onSubmit={handleAddClient}
                    />
                </div>
            </div>
        </>
    )
}