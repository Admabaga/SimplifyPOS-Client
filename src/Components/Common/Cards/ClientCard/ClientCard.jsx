import React, { useState } from "react";
import "./ClientCard.css";
import { FaEdit, FaTrash, FaCheck } from "react-icons/fa";

const ClientCard = ({
  id,
  documentId,
  name,
  email,
  phone,
  documentType,
  bornDate,
  gender,
  onActualizar,
  onEditarCliente
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    name,
    email,
    phone,
    documentType,
    bornDate: bornDate.includes('T') ? bornDate.split('T')[0] : bornDate,
    gender,
    documentId
  });

  const documentTypes = [
    { label: "Cédula de Ciudadanía", value: "CC" },
    { label: "Cédula de Extranjería", value: "CE" },
    { label: "Pasaporte", value: "PA" },
    { label: "Permiso Especial de Permanencia", value: "PEP" },
    { label: "Documento Nacional de Identidad", value: "DNI" }
  ];

  const handleInputChange = (e) => {
    setEditedData({ ...editedData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    const dataToSend = {
      ...editedData,
      bornDate: `${editedData.bornDate}T00:00:00`
    };

    await onEditarCliente(id, dataToSend);
    setIsEditing(false);
  };

  return (
    <div className="client-card">
      <div className="client-header">
        <div className="client-avatar">
          <span>{editedData.name.charAt(0).toUpperCase()}</span>
        </div>
        <div className="client-title-section">
          {isEditing ? (
            <>
              <input
                name="name"
                value={editedData.name}
                onChange={handleInputChange}
                className="client-edit-input"
              />
              <input
                name="documentId"
                value={editedData.documentId}
                onChange={handleInputChange}
                className="client-edit-input"
              />
            </>
          ) : (
            <>
              <h2 className="client-name">{editedData.name}</h2>
              <span className="client-id">ID: {editedData.documentId}</span>
            </>
          )}
        </div>
        <div className="client-actions">
          {isEditing ? (
            <button className="client-action edit" onClick={handleSave} title="Guardar">
              <FaCheck />
            </button>
          ) : (
            <button
              className="client-action edit"
              title="Editar"
              onClick={() => setIsEditing(true)}
            >
              <FaEdit />
            </button>
          )}
          <button className="client-action delete" title="Eliminar">
            <FaTrash />
          </button>
        </div>
      </div>
      <div className="client-info">
        <div className="client-info-group">
          <label>Tipo de documento:</label>
          {isEditing ? (
            <select
              name="documentType"
              value={editedData.documentType}
              onChange={handleInputChange}
              className="client-edit-input"
            >
              {documentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          ) : (
            <p>
              {
                documentTypes.find((t) => t.value === editedData.documentType)?.label ||
                editedData.documentType
              }
            </p>
          )}
        </div>
        {[
          { label: "Email", name: "email" },
          { label: "Teléfono", name: "phone" },
          { label: "Fecha de nacimiento", name: "bornDate", type: "date" },
          { label: "Género", name: "gender" }
        ].map(({ label, name, type = "text" }) => (
          <div className="client-info-group" key={name}>
            <label>{label}:</label>
            {isEditing ? (
              <input
                type={type}
                name={name}
                value={editedData[name]}
                onChange={handleInputChange}
                className="client-edit-input"
              />
            ) : (
              <p>
                {name === "bornDate"
                  ? new Date(editedData.bornDate).toLocaleDateString()
                  : editedData[name]}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientCard;
