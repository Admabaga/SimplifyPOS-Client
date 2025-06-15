import { FaSearch } from "react-icons/fa"
import './CategoriesHeader.css'
export default function CategoryHeader({ onBuscar }) {
    return (
        <>
            <div className="category-card">
                <div className="category-card-header">
                    <h2 className="category-title">Categorias</h2>

                </div>
                <div className="category-busqueda">
                    <FaSearch className="icono-buscar" />
                    <input
                        type="text"
                        className="input-buscar"
                        placeholder="Buscar categoria..."
                        onChange={(e) => onBuscar(e.target.value)}
                    />
                </div>
            </div>
        </>
    )
}