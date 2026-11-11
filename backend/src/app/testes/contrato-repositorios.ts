import { beforeEach, describe, expect, it } from 'vitest'
import type { Formulario } from '../../contexts/autoavaliacoes/domain/formulario.ts'
import type { FormularioRepositorio } from '../../contexts/autoavaliacoes/domain/repositorio.ts'
import { PREFERENCIAS_PADRAO } from '../../contexts/identidade/domain/usuario.ts'
import type { Usuario, UsuarioRepositorio } from '../../contexts/identidade/domain/usuario.ts'
import type { Envio } from '../../contexts/respostas/domain/envio.ts'
import type { EnvioRepositorio } from '../../contexts/respostas/domain/repositorio.ts'
import type { CaixaDeSaida, RedefinicaoRepositorio, SessaoRepositorio } from '../../contexts/identidade/domain/sessao.ts'
import type { NotificacaoRepositorio } from '../../contexts/notificacoes/domain/notificacao.ts'
import type { TurmaRepositorio } from '../../contexts/turmas/domain/repositorio.ts'
import type { Turma } from '../../contexts/turmas/domain/turma.ts'
import type { PeriodoLetivo } from '../../contexts/turmas/domain/periodo-letivo.ts'

export interface Repositorios {
  usuarios: UsuarioRepositorio
  turmas: TurmaRepositorio
  formularios: FormularioRepositorio
  envios: EnvioRepositorio
  sessoes: SessaoRepositorio
  redefinicoes: RedefinicaoRepositorio
  notificacoes: NotificacaoRepositorio
  caixaDeSaida: CaixaDeSaida
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
      await r.turmas.desmatricular('t1', 'al2')
      await r.turmas.desmatricular('t1', 'al2')
      expect(await r.turmas.alunosIds('t1')).toEqual(['al1'])
      await r.turmas.matricular('t1', 'al2')
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
      expect((await r.envios.porId('e-f1-al1'))?.alunoId).toBe('al1')
      expect(await r.envios.porId('nao-existe')).toBeUndefined()
      const moderado = envio('f1', 'al1', 't1', { status: 'enviado', respostas: { 'f1-p1': [1] }, nota: 7.5, compreensao: 'P', observacao: 'ok', enviadoEm: t0, observacaoOculta: true, respostaProfessor: 'Vamos ver', respondidaEm: t0 })
      await r.envios.salvar(moderado)
      expect(await r.envios.porFormularioEAluno('f1', 'al1')).toEqual(moderado)
      await r.envios.salvar(envio('f1', 'al1', 't1', { status: 'enviado', respostas: { 'f1-p1': [1] }, nota: 7.5, compreensao: 'P', observacao: 'ok', enviadoEm: t0 }))
      expect(await r.envios.listarPorFormulario('f1')).toHaveLength(2)
      expect(await r.envios.listarPorFormularios(['f1', 'f2'])).toHaveLength(3)
      expect(await r.envios.listarPorFormularios([])).toEqual([])
      expect(await r.envios.listarPorAluno('al1')).toHaveLength(2)
      await r.envios.excluirDoAlunoNaTurma('t1', 'al2')
      expect(await r.envios.listarPorFormulario('f1')).toHaveLength(1)
      await r.envios.excluirDoFormulario('f2')
      expect(await r.envios.listarPorAluno('al1')).toHaveLength(1)
      await r.envios.excluirDaTurma('t1')
      expect(await r.envios.listarPorFormularios(['f1'])).toEqual([])
    })

    it('sessões: salva, busca por id e por hash do refresh, rotaciona e revoga', async () => {
      const sessao = { id: 's1', usuarioId: 'al1', refreshHash: 'hash-1', expiraEm: new Date('2026-10-10T12:00:00.000Z'), criadaEm: t0 }
      await r.sessoes.salvar(sessao)
      await r.sessoes.salvar({ ...sessao, id: 's2', refreshHash: 'hash-2' })
      expect(await r.sessoes.porId('s1')).toEqual(sessao)
      expect((await r.sessoes.porRefreshHash('hash-2'))?.id).toBe('s2')
      expect(await r.sessoes.porRefreshHash('hash-x')).toBeUndefined()
      await r.sessoes.salvar({ ...sessao, refreshHash: 'hash-1b' })
      expect(await r.sessoes.porRefreshHash('hash-1')).toBeUndefined()
      expect((await r.sessoes.porRefreshHash('hash-1b'))?.id).toBe('s1')
      const quando = new Date('2026-09-11T12:00:00.000Z')
      await r.sessoes.revogar('s1', quando)
      expect((await r.sessoes.porId('s1'))?.revogadaEm).toEqual(quando)
      expect((await r.sessoes.porId('s2'))?.revogadaEm).toBeUndefined()
      await r.sessoes.revogarDoUsuario('al1', quando)
      expect((await r.sessoes.porId('s2'))?.revogadaEm).toEqual(quando)
    })

    it('redefinições de senha: salva, busca por hash e marca como usada', async () => {
      const red = { id: 'r1', usuarioId: 'al1', tokenHash: 'th-1', expiraEm: new Date('2026-09-10T12:30:00.000Z'), criadaEm: t0 }
      await r.redefinicoes.salvar(red)
      expect(await r.redefinicoes.porTokenHash('th-1')).toEqual(red)
      expect(await r.redefinicoes.porTokenHash('th-x')).toBeUndefined()
      await r.redefinicoes.salvar({ ...red, usadaEm: t0 })
      expect((await r.redefinicoes.porTokenHash('th-1'))?.usadaEm).toEqual(t0)
    })

    it('notificações: lista mais recentes primeiro, conta não lidas, marca lida só do dono', async () => {
      const n = (id: string, usuarioId: string, minutos: number) => ({ id, usuarioId, tipo: 'lembrete' as const, titulo: `T ${id}`, mensagem: 'm', link: '/x', criadaEm: new Date(t0.getTime() + minutos * 60_000) })
      await r.notificacoes.salvar(n('n1', 'al1', 0))
      await r.notificacoes.salvar(n('n2', 'al1', 5))
      await r.notificacoes.salvar(n('n3', 'al2', 1))
      expect((await r.notificacoes.listarDoUsuario('al1', 10)).map((x) => x.id)).toEqual(['n2', 'n1'])
      expect((await r.notificacoes.listarDoUsuario('al1', 1)).map((x) => x.id)).toEqual(['n2'])
      expect(await r.notificacoes.contarNaoLidas('al1')).toBe(2)
      expect(await r.notificacoes.marcarLida('n1', 'al2', t0)).toBe(false)
      expect(await r.notificacoes.marcarLida('nada', 'al1', t0)).toBe(false)
      expect(await r.notificacoes.marcarLida('n1', 'al1', t0)).toBe(true)
      expect(await r.notificacoes.contarNaoLidas('al1')).toBe(1)
      expect((await r.notificacoes.listarDoUsuario('al1', 10)).find((x) => x.id === 'n1')?.lidaEm).toEqual(t0)
      await r.notificacoes.marcarTodasLidas('al1', t0)
      expect(await r.notificacoes.contarNaoLidas('al1')).toBe(0)
      expect(await r.notificacoes.contarNaoLidas('al2')).toBe(1)
    })

    it('caixa de saída: registra e consulta por destinatário (mais recente primeiro)', async () => {
      await r.caixaDeSaida.registrar({ id: 'm1', para: 'a@escola.com', assunto: 'Um', corpo: 'c', link: 'http://x/1', criadaEm: t0 })
      await r.caixaDeSaida.registrar({ id: 'm2', para: 'a@escola.com', assunto: 'Dois', corpo: 'c', criadaEm: new Date(t0.getTime() + 1000) })
      await r.caixaDeSaida.registrar({ id: 'm3', para: 'b@escola.com', assunto: 'Três', corpo: 'c', criadaEm: t0 })
      expect((await r.caixaDeSaida.porDestinatario('a@escola.com')).map((m) => m.id)).toEqual(['m2', 'm1'])
      expect((await r.caixaDeSaida.porDestinatario('a@escola.com'))[1]?.link).toBe('http://x/1')
      expect(await r.caixaDeSaida.porDestinatario('c@escola.com')).toEqual([])
    })
  })
}
