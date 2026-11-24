import type { Locator, Page } from '@playwright/test'
import { chamar } from './apoio'
import type { Usuario } from './apoio'

export const TEMAS = ['claro', 'escuro', 'alto-contraste'] as const
export type Tema = (typeof TEMAS)[number]

/** Grava o tema nas preferências do usuário (a UI o aplica em `body[data-tema]` ao entrar). */
export const definirTema = (u: Usuario, tema: Tema) => chamar('PATCH', '/perfil/preferencias', { tema }, u.token)

export interface FalhaDeContraste {
  texto: string
  razao: number
  minimo: number
}

/** Mede o contraste (WCAG) de todo texto visível dentro de `raiz`; devolve só o que reprova. */
export function contrastesReprovados(raiz: Locator): Promise<FalhaDeContraste[]> {
  return raiz.evaluate((el) => {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
    const rgba = (css: string): [number, number, number, number] => {
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = '#000'
      ctx.fillStyle = css
      ctx.fillRect(0, 0, 1, 1)
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
      return [r!, g!, b!, a! / 255]
    }
    const luz = ([r, g, b]: number[]) => {
      const f = (v: number) => {
        const c = v / 255
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!)
    }
    const fundo = (alvo: Element): number[] => {
      const camadas: Array<[number, number, number, number]> = []
      for (let n: Element | null = alvo; n; n = n.parentElement) {
        const c = rgba(getComputedStyle(n).backgroundColor)
        if (c[3] > 0) camadas.push(c)
        if (c[3] === 1) break
      }
      let base: number[] = [255, 255, 255]
      for (const [r, g, b, a] of camadas.reverse()) base = [r * a + base[0]! * (1 - a), g * a + base[1]! * (1 - a), b * a + base[2]! * (1 - a)]
      return base
    }
    const falhas: Array<{ texto: string; razao: number; minimo: number }> = []
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let no = walker.nextNode(); no; no = walker.nextNode()) {
      const texto = no.textContent?.trim()
      const pai = no.parentElement
      if (!texto || !pai) continue
      const caixa = pai.getBoundingClientRect()
      if (caixa.width <= 1 || caixa.height <= 1) continue // sr-only / oculto
      if (pai.closest('[disabled], [aria-disabled="true"]')) continue
      const estilo = getComputedStyle(pai)
      if (estilo.visibility === 'hidden' || estilo.display === 'none' || parseFloat(estilo.opacity) < 1) continue
      const cor = rgba(estilo.color)
      const bg = fundo(pai)
      const texto3 = [cor[0] * cor[3] + bg[0]! * (1 - cor[3]), cor[1] * cor[3] + bg[1]! * (1 - cor[3]), cor[2] * cor[3] + bg[2]! * (1 - cor[3])]
      const l1 = luz(texto3)
      const l2 = luz(bg)
      const razao = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
      const px = parseFloat(estilo.fontSize)
      const grande = px >= 24 || (px >= 18.66 && parseInt(estilo.fontWeight, 10) >= 700)
      const minimo = grande ? 3 : 4.5
      if (razao < minimo) falhas.push({ texto: texto.slice(0, 40), razao: Math.round(razao * 100) / 100, minimo })
    }
    return falhas
  })
}

export interface AlvoPequeno {
  nome: string
  largura: number
  altura: number
}

/** Controles interativos visíveis dentro de `raiz` com alvo menor que 44×44 px. */
export function alvosPequenos(raiz: Locator): Promise<AlvoPequeno[]> {
  return raiz.evaluate((el) => {
    const alvos = el.querySelectorAll<HTMLElement>('button, a[href], input:not([type="hidden"]), select, [role="switch"], [role="radio"], [role="tab"]')
    const pequenos: Array<{ nome: string; largura: number; altura: number }> = []
    for (const a of alvos) {
      if (a.matches('[disabled]')) continue
      // checkbox/switch: o alvo é o <label> que o envolve
      const alvo = a instanceof HTMLInputElement && a.type === 'checkbox' ? (a.closest('label') ?? a) : a
      const r = alvo.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      if (r.width < 43.5 || r.height < 43.5) pequenos.push({ nome: (alvo.textContent || alvo.getAttribute('aria-label') || alvo.tagName).trim().slice(0, 40), largura: Math.round(r.width), altura: Math.round(r.height) })
    }
    return pequenos
  })
}

/** Abre o modal "Adicionar membros" pelo menu ⋮ do cartão da equipe (professor). */
export async function abrirAdicionarMembrosModal(page: Page) {
  await page.getByRole('button', { name: /Opções da equipe/ }).first().click()
  await page.getByRole('menuitem', { name: 'Adicionar membros' }).click()
  return page.getByRole('dialog', { name: 'Adicionar membros' })
}
