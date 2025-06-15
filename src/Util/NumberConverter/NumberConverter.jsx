export default function formatearNumero(numero) {
  return numero.toLocaleString('es-CO' , {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }); 
}