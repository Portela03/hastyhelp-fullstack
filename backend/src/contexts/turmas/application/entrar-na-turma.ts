import { exigirPapel } from '../../../shared/ator.ts'
import type { Ator } from '../../../shared/ator.ts'
import { conflito, naoEncontrado } from '../../../shared/erros.ts'
import type { GeradorId, Relogio } from '../../../shared/portas.ts'
import { normalizarCodigo } from '../../../shared/texto.ts'
import type { UsuarioRepositorio } from '../../identidade/domain/usuario.ts'
import type { EmissorDeNotificacoes } from '../../notificacoes/application/emissor.ts'
import { resolverEntrada } from '../domain/entrada.ts'
import type { EntradaRepositorio } from '../domain/entrada.ts'
import type { TurmaRepositorio } from '../domain/repositorio.ts'
import type { Turma } from '../domain/turma.ts'

export interface ResultadoEntrada {
  status: 'matriculado' | 'pendente'
  turma: { id: string; nome: string }
}

type Deps = { turmas: TurmaRepositorio; entradas: EntradaRepositorio; ids: GeradorId; relogio: Relogio; emissor: EmissorDeNotificacoes }

/**
 * Regra única de "aluno quer entrar na turma pelo código/link" (R-101, R-103, R-04):
 * matricula direto ou deixa um pedido pendente quando a turma exige aprovação manual.
 */
export class EntrarNaTurma {
  constructor(private readonly d: Deps) {}

  async executar(turma: Turma, aluno: { id: string; nome: string }): Promise<ResultadoEntrada> {
    const resumo = { id: turma.id, nome: turma.nome }
    if ((await this.d.turmas.alunosIds(turma.id)).includes(aluno.id)) throw conflito('JA_NA_TURMA', 'Você já faz parte desta equipe.')

    const pendente = await this.d.entradas.pendente(turma.id, aluno.id)
    // o professor já convidou este aluno: usar o código equivale a aceitar o convite
    if (pendente?.origem === 'convite') {
      await this.d.entradas.salvar(resolverEntrada(pendente, 'aceita', this.d.relogio.agora()))
      await this.d.turmas.matricular(turma.id, aluno.id)
      return { status: 'matriculado', turma: resumo }
    }
    if (pendente) throw conflito('SOLICITACAO_PENDENTE', 'Você já pediu para entrar nesta equipe. Aguarde o professor.')

    if (!turma.aprovacaoManual) {
      await this.d.turmas.matricular(turma.id, aluno.id)
      return { status: 'matriculado', turma: resumo }
    }
    await this.d.entradas.salvar({ id: this.d.ids.novo(), turmaId: turma.id, alunoId: aluno.id, origem: 'codigo', status: 'pendente', criadaEm: this.d.relogio.agora() })
    await this.d.emissor.emitir([turma.docenteId], {
      tipo: 'solicitacao-entrada',
      titulo: 'Novo pedido para entrar na equipe',
      mensagem: `${aluno.nome} quer entrar na equipe ${turma.nome}.`,
      link: `/equipes/${turma.id}`,
    })
    return { status: 'pendente', turma: resumo }
  }
}

/** R-101: aluno logado entra em uma turma pelo código de 6 caracteres. */
export class EntrarPorCodigo {
  constructor(private readonly d: { turmas: TurmaRepositorio; usuarios: UsuarioRepositorio; entrarNaTurma: EntrarNaTurma }) {}

  async executar(ator: Ator, codigo: string): Promise<ResultadoEntrada> {
    exigirPapel(ator, 'aluno')
    const turma = await this.d.turmas.porCodigo(normalizarCodigo(codigo))
    if (!turma) throw naoEncontrado('CONVITE_INVALIDO', 'Código inválido. Confira com o professor e tente de novo.')
    const aluno = await this.d.usuarios.porId(ator.id)
    if (!aluno) throw naoEncontrado('USUARIO_NAO_ENCONTRADO', 'Usuário não encontrado.')
    return this.d.entrarNaTurma.executar(turma, aluno)
  }
}
