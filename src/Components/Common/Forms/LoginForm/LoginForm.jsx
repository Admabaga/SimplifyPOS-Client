import { useState } from "react"
import ApiClient from "../../../../Util/ApiClient/ApiClient";
import { EnvelopeFill, LockFill, Eye, EyeSlash } from 'react-bootstrap-icons'
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './LoginForm.css'

export default function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [search, setSearch] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [respuestaServer, setRespuestaServer] = useState("")
    const [respuestaServerError, setRespuestaServerError] = useState(false)
    const navigate = useNavigate()
    async function procesarFormulario(evento) {
        evento.preventDefault()
        setSearch(true)
        try {
            const response = await ApiClient.post('/users/logins',
                {
                    email,
                    password,
                })
            setRespuestaServerError(false)
            toast.success('¡Sesión iniciada!', {
                duration: 3000,
              });
            localStorage.setItem("role", response.data)
            console.log(response.data)
            navigate("/tables")
        } catch (error) {
            const mensajeError = error.response?.data?.message || error.message || "Ocurrió un error inesperado"
            setRespuestaServer(`Error al enviar datos: ${mensajeError}`);
            setRespuestaServerError(true)
        } finally {
            setSearch(false)
        }

    }
    return (
        <>
            <div className="container my-5">
                <div className="row">
                    <div className="col-12">
                        <h3 className="text-center mb-4">Inicio sesión</h3>
                        <form className="p-5 border rounded shadow" onSubmit={procesarFormulario}>
                            <div className="mb-3">
                                <label className="form-label">Correo:</label>
                                <div className="input-group">
                                    <span className="input-group-text">
                                        <EnvelopeFill />
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Contraseña:</label>
                                <div className="input-group">
                                    <span className="input-group-text">
                                        <LockFill />
                                    </span>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="form-control"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        style={{
                                            borderTopRightRadius: '0 !important',
                                            borderBottomRightRadius: '0 !important'
                                        }}
                                        required
                                    />
                                    <span className="input-group-text p-0">
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="btn-eye"
                                        >
                                            {showPassword ? <EyeSlash /> : <Eye />}
                                        </button>
                                    </span>
                                </div>
                            </div>

                            <button type="submit" className="btn btn-outline-secondary my-3 w-100">
                                Ingresar
                            </button>

                            {search ? (
                                <div className="d-flex justify-content-center">
                                    <div className="spinner-border"></div>
                                    <span className="m-1">Verificando...</span>
                                </div>
                            ) : (
                                respuestaServer && (
                                    <p className={`respuestaServer ${respuestaServerError ? 'error' : 'success'}`}>
                                        {respuestaServer}
                                    </p>
                                )
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}