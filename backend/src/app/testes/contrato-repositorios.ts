import { beforeEach, describe, expect, it } from 'vitest'
import type { Formulario } from '../../contexts/autoavaliacoes/domain/formulario.ts'
import type { FormularioRepositorio } from '../../contexts/autoavaliacoes/domain/repositorio.ts'
import { PREFERENCIAS_PADRAO } from '../../contexts/identidade/domain/usuario.ts'
import type { Usuario, UsuarioRepositorio } from '../../contexts/identidade/domain/usuario.ts'
import type { Envio } from '../../contexts/respostas/domain/envio.ts'
import type { EnvioRepositorio } from '../../contexts/respostas/domain/repositorio.ts'
import type { TurmaRepositorio } from '../../contexts/turmas/domain/repositorio.ts'
import type { Turma } from '../../contexts/turmas/domain/turma.ts'
import type { PeriodoLetivo } from '../../contexts/turmas/domain/periodo-letivo.ts'

export interface Repositorios {
  usuarios: UsuarioRepositorio
  turmas: TurmaRepositorio
  formularios: FormularioRepositorio
  envios: EnvioRepositorio
}

const t0 = new Date('2026-09-10T12:00:00.000Z')
const usuario = (id: string, papel: Usuario['papel'], email = `${id}@escola.com`): Usuario => ({
  id, nome: `Usuário ${id}`, email, senhaHash: 'hash', papel, preferencias: { ...PREFERENCIAS_PADRAO }, criadoEm: t0,
})
const turma = (id: string, docenteId: string, codigo = `cod-${id}`): Turma => ({
  id, nome: `Turma ${id}`, sigla: 'TT', cor: '#62B7D7', periodo: '2026/02' as PeriodoLetivo, docenteId, oculta: false, codigoConvite: codigo, criadaEm: t0,
})
const formulario = (id: string, turmaId: string, extra: Partial<Formulario> = {}): Formulario => ({
  id, titulo: `Form ${id}`, turmaId, status: 'aberto', mostrarGabarito: false, criadoEm: t0, publicadoEm: t0,
  perguntas: [
    { id: `${id}-p1`, enunciado: 'Primeira', tipo: 'unica', opcoes: ['a', 'b'], gabarito: [1] },
    { id: `${id}-p2`, enunciado: 'Segunda', tipo: 'multipla', opcoes: ['a', 'b', 'c'] },
  ],
  ...extra,
})
const envio = (formularioId: string, alunoId: string, turmaId: string, extra: Partial<Envio> = {}): Envio => ({
  id: `e-${formularioId}-${alunoId}`, formularioId, alunoId, turmaId, status: 'rascunho', respostas: { 'x': [0] }, atualizadoEm: t0, ...extra,
})

/** Mesmo contrato para memória e Postgres: garante que as duas implementações se comportam igual. */
export function contratoRepositorios(nome: string, fabrica: () => Promise<Repositorios>) {
  describe(`contrato dos repositórios — ${nome}`, () => {
    let r: Repositorios
    beforeEach(async () => {
      r = await fabrica()
      await r.usuarios.salvar(usuario('prof', 'professor'))
      await r.usuarios.salvar(usuario('al1', 'aluno'))
      await r.usuarios.salvar(usuario('al2', 'aluno'))
    })

    it('usuários: salva, atualiza, busca por id, e-mail e lista de ids', async () => {
      expect(await r.usuarios.porId('al1')).toMatchObject({ nome: 'Usuário al1', papel: 'aluno', preferencias: PREFERENCIAS_PADRAO, criadoEm: t0 })
      expect((await r.usuarios.porEmail('al2@escola.com'))?.id).toBe('al2')
      expect(await r.usuarios.porEmail('nao@existe.com')).toBeUndefined()
      await r.usuarios.salvar({ ...usuario('al1', 'aluno'), preferencias: { ...PREFERENCIAS_PADRAO, tema: 'escuro' } })
      expect((await r.usuarios.porId('al1'))?.preferencias.tema).toBe('escuro')
      expect((await r.usuarios.porIds(['al1', 'al2', 'fantasma'])).map((u) => u.id).sort()).toEqual(['al1', 'al2'])
      expect(await r.usuarios.porIds([])).toEqual([])
    })

    it('turmas: salva, busca por código, lista por docente e aluno, matrícula idempotente', async () => {
      await r.turmas.salvar(turma('t1', 'prof'))
      await r.turmas.salvar(turma('t2', 'prof'))
      expect(await r.turmas.porId('t1')).toEqual(turma('t1', 'prof'))
      expect((await r.turmas.porCodigo('cod-t2'))?.id).toBe('t2')
      expect((await r.turmas.listarDoDocente('prof')).map((t) => t.id).sort()).toEqual(['t1', 't2'])
      await r.turmas.matricular('t1', 'al1')
      await r.turmas.matricular('t1', 'al1')
      await r.turmas.matricular('t1', 'al2')
      expect((await r.turmas.alunosIds('t1')).sort()).toEqual(['al1', 'al2'])
      expect((await r.turmas.listarDoAluno('al1')).map((t) => t.id)).toEqual(['t1'])
      await r.turmas.salvar({ ...turma('t1', 'prof'), oculta: true, nome: 'Renomeada' })
      expect(await r.turmas.porId('t1')).toMatchObject({ oculta: true, nome: 'Renomeada' })
      await r.turmas.excluir('t1')
      expect(await r.turmas.porId('t1')).toBeUndefined()
      expect(await r.turmas.alunosIds('t1')).toEqual([])
      expect(await r.turmas.listarDoAluno('al1')).toEqual([])
    })

    it('formulários: guarda perguntas em ordem, datas e gabarito; atualiza substituindo perguntas', async () => {
      await r.turmas.salvar(turma('t1', 'prof'))
      const f = formulario('f1', 't1', { prazo: new Date('2026-10-01T02:59:59.999Z'), mostrarGabarito: true })
      await r.formularios.salvar(f)
      expect(await r.formularios.porId('f1')).toEqual(f)
      const agendado = formulario('f2', 't1', { status: 'agendado', publicarEm: new Date('2026-09-20T12:00:00.000Z') })
      delete agendado.publicadoEm
      await r.formularios.salvar(agendado)
      expect(await r.formularios.porId('f2')).toEqual(agendado)
      await r.formularios.salvar({ ...f, titulo: 'Novo', perguntas: [f.perguntas[1]!] })
      expect(await r.formularios.porId('f1')).toMatchObject({ titulo: 'Novo', perguntas: [{ id: 'f1-p2' }] })
      expect((await r.formularios.listarPorTurmas(['t1'])).map((x) => x.id).sort()).toEqual(['f1', 'f2'])
      expect(await r.formularios.listarPorTurmas([])).toEqual([])
      await r.formularios.excluir('f2')
      expect(await r.formularios.porId('f2')).toBeUndefined()
      await r.formularios.excluirDaTurma('t1')
      expect(await r.formularios.listarPorTurmas(['t1'])).toEqual([])
    })

    it('envios: upsert único por formulário+aluno, consultas e exclusões', async () => {
      await r.turmas.salvar(turma('t1', 'prof'))
      await r.formularios.salvar(formulario('f1', 't1'))
      await r.formularios.salvar(formulario('f2', 't1'))
      await r.envios.salvar(envio('f1', 'al1', 't1'))
      await r.envios.salvar(envio('f1', 'al1', 't1', { status: 'enviado', respostas: { 'f1-p1': [1] }, nota: 7.5, compreensao: 'P', observacao: 'ok', enviadoEm: t0 }))
      await r.envios.salvar(envio('f1', 'al2', 't1'))
      await r.envios.salvar(envio('f2', 'al1', 't1'))
      expect(await r.envios.porFormularioEAluno('f1', 'al1')).toEqual(
        envio('f1', 'al1', 't1', { status: 'enviado', respostas: { 'f1-p1': [1] }, nota: 7.5, compreensao: 'P', observacao: 'ok', enviadoEm: t0 }),
      )
      expect(await r.envios.porFormularioEAluno('f1', 'fantasma')).toBeUndefined()
      expect(await r.envios.listarPorFormulario('f1')).toHaveLength(2)
      expect(await r.envios.listarPorFormularios(['f1', 'f2'])).toHaveLength(3)
      expect(await r.envios.listarPorFormularios([])).toEqual([])
      expect(await r.envios.listarPorAluno('al1')).toHaveLength(2)
      await r.envios.excluirDoFormulario('f2')
      expect(await r.envios.listarPorAluno('al1')).toHaveLength(1)
      await r.envios.excluirDaTurma('t1')
      expect(await r.envios.listarPorFormularios(['f1'])).toEqual([])
    })
  })
}
