import { describe, it, expect } from 'vitest'
import { httpErrorMessage } from '@/shared/api/client'

describe('httpErrorMessage', () => {
  it('retorna serverDetail si está presente y status no es 422', () => {
    expect(httpErrorMessage(400, 'Email duplicado')).toBe('Email duplicado')
    expect(httpErrorMessage(500, 'Error base de datos')).toBe('Error base de datos')
  })

  it('para 422 usa serverDetail si está presente, sino mensaje estándar', () => {
    expect(httpErrorMessage(422, 'custom')).toBe('custom')
    expect(httpErrorMessage(422, undefined)).toBe('Hay campos con errores de validación.')
  })

  it('retorna mensaje por defecto para cada código HTTP conocido', () => {
    expect(httpErrorMessage(400)).toBe('Datos inválidos. Revisa los campos.')
    expect(httpErrorMessage(401)).toBe('Sesión expirada. Inicia sesión nuevamente.')
    expect(httpErrorMessage(403)).toBe('No tienes permiso para esta acción.')
    expect(httpErrorMessage(404)).toBe('El recurso no existe o fue eliminado.')
    expect(httpErrorMessage(409)).toBe('Conflicto de datos. Recarga e intenta de nuevo.')
    expect(httpErrorMessage(429)).toBe('Demasiadas solicitudes. Espera un momento.')
    expect(httpErrorMessage(500)).toBe('Error interno del servidor. Intenta más tarde.')
    expect(httpErrorMessage(502)).toBe('Servidor no disponible. Intenta más tarde.')
    expect(httpErrorMessage(503)).toBe('Servicio temporalmente no disponible.')
    expect(httpErrorMessage(504)).toBe('El servidor tardó demasiado. Intenta de nuevo.')
  })

  it('retorna fallback para códigos desconocidos', () => {
    expect(httpErrorMessage(418)).toBe('Ocurrió un error inesperado.')
    expect(httpErrorMessage(undefined)).toBe('Ocurrió un error inesperado.')
  })
})
