import { FaSearch, FaPlus, FaCalendarAlt } from "react-icons/fa";
import '../CategoriesHeader/CategoriesHeader.css';
import './SpentHeader.css'
export default function SpentHeaderCard({
    onBuscar,
    title,
    typeAgree,
    typeSearch,
    onAgregar,
    startDate,
    endDate,
    setStartDate,
    setEndDate
}) {
    return (
        <div className="category-card">
            <div className="category-card-header">
                <h2 className="category-title">{title}</h2>
                <button className="btn-agregar" onClick={onAgregar}>
                    <span className="icon-circle">
                        <FaPlus />
                    </span>
                    {typeAgree}
                </button>
            </div>
            <div className="category-busqueda">
                <FaSearch className="icono-buscar" />
                <input
                    type="text"
                    className="input-buscar"
                    placeholder={typeSearch}
                    onChange={(e) => onBuscar(e.target.value)}
                />
            </div>
            <div className="date-range-container">
                <div className="date-input">
                    <FaCalendarAlt className="icono-calendario" />
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <span className="guion-rango text-white">—</span>
                <div className="date-input">
                    <FaCalendarAlt className="icono-calendario" />
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}
