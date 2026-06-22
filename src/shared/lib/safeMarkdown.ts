/**
 * Conversión segura de "markdown simple" (solo **negrita**) a HTML.
 *
 * Escapa TODO el HTML primero para evitar XSS almacenado: el texto del asesor IA
 * analiza datos de los tenants (nombres de productos, clientes, negocios) que el
 * master visualiza. Sin escapar, un `<img onerror=…>` en esos datos ejecutaría
 * script en la sesión del master. Tras escapar, solo reintroducimos <strong>.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Escapa el texto y convierte **negrita** en <strong>. Apto para dangerouslySetInnerHTML. */
export function boldToSafeHtml(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}
