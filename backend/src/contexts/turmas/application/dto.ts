import type { Turma } from '../domain/turma.ts'

export function turmaDTO(t: Turma, docente: string, mostrarConvite: boolean) {
  return {
    id: t.id,
    nome: t.nome,
    sigla: t.sigla,
    cor: t.cor,
    periodo: t.periodo as string,
    docente,
    oculta: t.oculta,
    ...(mostrarConvite ? { codigoConvite: t.codigoConvite, aprovacaoManual: t.aprovacaoManual } : {}),
  }
}
export type TurmaDTO = ReturnType<typeof turmaDTO> & { codigoConvite: string; aprovacaoManual: boolean }
