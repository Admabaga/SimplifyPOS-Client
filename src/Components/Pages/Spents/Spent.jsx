import CreateSpentModal from "../../Common/Moggles/CreateSpentModal/CreateSpentModal.jsx";
import NavBar from "../../Common/Nav/Nav";
import { useState, useEffect } from "react";
import SpentTable from '../../Common/Tables/SpentTable/SpentTable.jsx';
import ApiClient from "../../../Util/ApiClient/ApiClient.jsx";
import formatearNumero from "../../../Util/NumberConverter/NumberConverter.jsx";
import './Spent.css';
import SpentHeaderCard from "../../Common/Cards/SpentHeaderCard/SpentHeaderCard.jsx";
import toast from "react-hot-toast";


export default function Spent() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [spents, setSpents] = useState([]);
    const [filteredSpents, setFilteredSpents] = useState([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchSpents = async () => {
        try {
            const res = await ApiClient.get('/users/spents');
            setSpents(res.data);
            setFilteredSpents(res.data);
        } catch (error) {
            toast.error(error.response?.data?.message || "Error al cargar gastos.");
        }
    };

    useEffect(() => {
        fetchSpents();
    }, []);

    const filterSpent = (query) => {
        if (!query.trim()) {
            filterByDateRange(startDate, endDate);
            return;
        }

        const rawQuery = query.trim().toLowerCase();
        const isDateQuery = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(rawQuery);

        const formatDateLoose = (dateInput) => {
            const date = new Date(dateInput);
            if (isNaN(date)) return '';
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        };

        const filtered = spents.filter(item => {
            const name = String(item.name || '').toLowerCase();
            const formattedDate = formatDateLoose(item.spentDate).toLowerCase();

            if (isDateQuery) return formattedDate === rawQuery;
            return name.includes(rawQuery) || formattedDate.includes(rawQuery);
        });

        const dateFiltered = filtered.filter(item => {
            if (!startDate || !endDate) return true;
            const itemDate = new Date(item.spentDate);
            return itemDate >= new Date(startDate + 'T00:00:00') && itemDate <= new Date(endDate + 'T23:59:59');
        });

        setFilteredSpents(dateFiltered);
    };

    const filterByDateRange = (start, end) => {
        if (!start || !end) {
            setFilteredSpents(spents);
            return;
        }

        const startDateObj = new Date(start + "T00:00:00");
        const endDateObj = new Date(end + "T23:59:59");

        const filtered = spents.filter(item => {
            const itemDate = new Date(item.spentDate);
            return itemDate >= startDateObj && itemDate <= endDateObj;
        });

        setFilteredSpents(filtered);
    };

    const createSpent = async (formData) => {
        try {
            await ApiClient.post("/users/spents", formData);
            fetchSpents(); // recarga los gastos
            setIsModalOpen(false);
            toast.success("¡Gasto agregado con éxito!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Error al agregar gasto.");
        }
    };

    const valorTotalInventario = filteredSpents.reduce((acc, item) => acc + item.value, 0);

    return (
        <div className="app-container">
            <NavBar />
            <div className="content-container">
                <SpentHeaderCard
                    title={"Gastos"}
                    typeAgree={"Agregar gasto"}
                    typeSearch={"Buscar gasto..."}
                    onAgregar={() => setIsModalOpen(true)}
                    onBuscar={filterSpent}
                    startDate={startDate}
                    endDate={endDate}
                    setStartDate={(value) => {
                        setStartDate(value);
                        filterByDateRange(value, endDate);
                    }}
                    setEndDate={(value) => {
                        setEndDate(value);
                        filterByDateRange(startDate, value);
                    }}
                />
                <div className='profile-container'>
                    <div className="purchase-section">
                        <h2>Mis Gastos</h2>
                        <div className="summary-bar">
                            <div className="summary-item">
                                <span>Total de gastos:</span>
                                <strong>{filteredSpents.length}</strong>
                            </div>
                            <div className="summary-item">
                                <span>Valor total de gastos:</span>
                                <strong>${formatearNumero(valorTotalInventario)}</strong>
                            </div>
                        </div>
                        <SpentTable spents={filteredSpents} />
                        {isModalOpen && (
                            <CreateSpentModal
                                onCreate={createSpent}
                                onClose={() => setIsModalOpen(false)}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
