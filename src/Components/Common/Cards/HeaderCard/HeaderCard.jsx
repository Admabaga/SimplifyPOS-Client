import { FaSearch } from "react-icons/fa";
import '../CategoriesHeader/CategoriesHeader.css'
import { FaPlus } from 'react-icons/fa';

export default function HeaderCard({ onBuscar, title, typeAgree, typeSearch, onAgregar }) {
    return (
        <>
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
            </div>
        </>
    )
}