/** Minúsculas e sem acentos: base das buscas por nome/e-mail ("JOSÉ" acha "jose"). */
export const normalizarBusca = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

/** Código da turma: sem espaços nas pontas e sem diferenciar maiúsculas (R-100). */
export const normalizarCodigo = (codigo: string) => codigo.trim().toLowerCase()
