import React, { useState } from "react";
import "./CategoryCard.css";
import { FaEdit, FaSave, FaTimes } from "react-icons/fa";
import ApiClient from "../../../../Util/ApiClient/ApiClient";
import toast from "react-hot-toast";

const CategoryCard = ({ category, onActualizar }) => {
  const { id, name, iva } = category;

  const [editando, setEditando] = useState(false);
  const [nuevoIva, setNuevoIva] = useState(iva);

  const manejarGuardar = async () => {
    try {
      const ivaNumerico = parseFloat(nuevoIva);
      if (ivaNumerico < 0 || ivaNumerico > 100) {
        toast.error("El IVA debe estar entre 0% y 100%");
        return;
      }
      await ApiClient.patch(`/categories/${id}`, {
        iva: ivaNumerico,
      });
      setEditando(false);
      onActualizar(); 
      toast.success("¡IVA actualizado correctamente!");
    } catch (error) {
      toast.error(error.response?.data?.message || "¡Error al actualizar categoría!");
    }
  };

  const manejarCancelar = () => {
    setNuevoIva(iva);
    setEditando(false);
  };

  return (
    <div className="categoria-card">
      <h2 className="categoria-title">{name}</h2>
      {!editando ? (
        <p className="categoria-iva">
          IVA: <strong>{iva}%</strong>
        </p>
      ) : (
        <div className="categoria-edicion">
          <input
            type="number"
            className="iva-input"
            value={nuevoIva}
            onChange={(e) => setNuevoIva(e.target.value)}
            min="0"
            max="100"
            step="0.01"
          />
          <span>%</span>
        </div>
      )}

      <div className="categoria-actions">
        {editando ? (
          <>
            <button className="btn guardar" onClick={manejarGuardar}>
              <FaSave style={{ marginRight: "5px" }} /> Guardar
            </button>
            <button className="btn cancelar" onClick={manejarCancelar}>
              <FaTimes style={{ marginRight: "5px" }} /> Cancelar
            </button>
          </>
        ) : (
          <button className="btn editar" onClick={() => setEditando(true)}>
            <FaEdit style={{ marginRight: "5px" }} /> Editar IVA
          </button>
        )}
      </div>
    </div>
  );
};

export default CategoryCard;