import { describe, it, expect } from 'vitest'
import { escapeHtml, boldToSafeHtml } from '@/shared/lib/safeMarkdown'

describe('safeMarkdown (anti-XSS en paneles IA)', () => {
  it('escapa HTML peligroso', () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;',
    )
  })

  it('neutraliza un payload XSS en datos de tenant', () => {
    const out = boldToSafeHtml('Producto **<script>alert(document.cookie)</script>**')
    expect(out).not.toContain('<script>')
    expect(out).toContain('&lt;script&gt;')
    // el marcado de negrita legítimo sí se aplica
    expect(out).toContain('<strong>')
  })

  it('mantiene texto normal con negrita', () => {
    expect(boldToSafeHtml('Ventas **subieron** 20%')).toBe('Ventas <strong>subieron</strong> 20%')
  })
})
