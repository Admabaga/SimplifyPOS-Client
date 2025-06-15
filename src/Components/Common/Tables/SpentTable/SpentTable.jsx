import './SpentTable.css'
import { FaEdit } from 'react-icons/fa';
import formatearNumero from '../../../../Util/NumberConverter/NumberConverter';
export default function SpentTable({spents}) {
    return (
        <>
            <table className="purchase-table">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Descripción</th>
                        <th>Valor</th>
                        <th>Fecha de Gasto</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {spents.map((purchase) => (
                        <tr key={purchase.id}>
                            <td>{purchase.name}</td>
                            <td>{purchase.description}</td>
                            <td>${formatearNumero(purchase.value)}</td>
                            <td>{new Date(purchase.spentDate).toLocaleDateString()}</td>
                            <td>
                                <button className="edit-button" onClick={() => onEdit(purchase)}>
                                    <FaEdit />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    )
}