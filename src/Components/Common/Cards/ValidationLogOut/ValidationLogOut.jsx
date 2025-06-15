import { Modal, Button } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { FiLogOut } from 'react-icons/fi';
import './ValidationLogOut.css'
export const ValidationLogOut = ({ show, onHide, onConfirm }) => {
    return (
        <Modal show={show} onHide={onHide} centered backdrop="static" className="custom-modal">
            <Modal.Header className="border-0 pb-0 position-relative">
                <button
                    type="button"
                    className="close-button"
                    onClick={onHide}
                    aria-label="Close"
                >
                    <span aria-hidden="true">&times;</span>
                </button>
                <div className="d-flex flex-column align-items-center w-100">
                    <div className="mb-3">
                        <FiLogOut size={24} className="text-danger" />
                    </div>
                    <Modal.Title className="h4 text-white">¿Cerrar sesión?</Modal.Title>
                </div>
            </Modal.Header>
            <Modal.Body className="text-center py-0">
                <p className="text-white">
                    Al cerrar sesión, deberás volver a ingresar tus credenciales para acceder de nuevo.
                </p>
            </Modal.Body>
            <Modal.Footer className="border-0 pt-0 d-flex justify-content-center">
                <Button
                    variant="danger"
                    onClick={onConfirm}
                    className="px-4 rounded-pill"
                >
                    Cerrar sesión
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

ValidationLogOut.propTypes = {
    show: PropTypes.bool.isRequired,
    onHide: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
};