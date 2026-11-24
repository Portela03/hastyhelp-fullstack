import { ErroDeDominio, conflito, naoEncontrado } from '../../../shared/erros.ts'
import type { Ator } from '../../../shared/ator.ts'
import type { GeradorId, Relogio } from '../../../shared/portas.ts'
import { normalizarBusca } from '../../../shared/texto.ts'
import type { UsuarioRepositorio } from '../../identidade/domain/usuario.ts'
import type { EmissorDeNotificacoes } from '../../notificacoes/application/emissor.ts'
import { EntradaPendenteDuplicada } from '../domain/entrada.ts'
import type { EntradaRepositorio } from '../domain/entrada.ts'
import type { LimitadorDeTaxa } from '../../../shared/limitador.ts'
import type { TurmaRepositorio } from '../domain/repositorio.ts'
import { turmaDoDocente } from './acesso.ts'

const MINIMO_BUSCA = 3
const LIMITE_BUSCA = 10

/** R-107: procura alunos cadastrados (nome ou e-mail) que ainda não estão na turma. R-116: com limite de taxa por professor. */
export class BuscarAlunosParaConvite {
  constructor(private readonly d: { turmas: TurmaRepositorio; usuarios: UsuarioRepositorio; entradas: EntradaRepositorio; limitadorDeBuscas: LimitadorDeTaxa }) {}

  async executar(ator: Ator, turmaId: string, busca: string) {
    await turmaDoDocente(this.d.turmas, ator, turmaId)
    const termo = normalizarBusca(busca)
    if (termo.length < MINIMO_BUSCA) throw new ErroDeDominio('BUSCA_CURTA', `Digite ao menos ${MINIMO_BUSCA} letras do nome ou do e-mail.`, 422)
    if (!this.d.limitadorDeBuscas.tentar(ator.id)) throw new ErroDeDominio('MUITAS_BUSCAS', 'Muitas buscas em pouco tempo. Aguarde um instante e tente de novo.', 429)
    const naTurma = await this.d.turmas.alunosIds(turmaId)
    const [achados, pendentes] = await Promise.all([this.d.usuarios.buscarAlunos(termo, naTurma, LIMITE_BUSCA), this.d.entradas.pendentesDaTurma(turmaId)])
    const convidados = new Set(pendentes.filter((e) => e.origem === 'convite').map((e) => e.alunoId))
    return achados.map((a) => ({ id: a.id, nome: a.nome, email: a.email, convidado: convidados.has(a.id) }))
  }
}

/** R-108: convida um aluno já cadastrado; ele recebe o convite na tela e no sino. */
export class ConvidarAluno {
  constructor(
    private readonly d: { turmas: TurmaRepositorio; usuarios: UsuarioRepositorio; entradas: EntradaRepositorio; ids: GeradorId; relogio: Relogio; emissor: EmissorDeNotificacoes },
  ) {}

  async executar(ator: Ator, turmaId: string, alunoId: string): Promise<{ id: string }> {
    const turma = await turmaDoDocente(this.d.turmas, ator, turmaId)
    const aluno = await this.d.usuarios.porId(alunoId)
    if (!aluno || aluno.papel !== 'aluno') throw naoEncontrado('ALUNO_NAO_ENCONTRADO', 'Aluno não encontrado.')
    if ((await this.d.turmas.alunosIds(turmaId)).includes(alunoId)) throw conflito('JA_NA_TURMA', 'Este aluno já faz parte da equipe.')
    const pendente = await this.d.entradas.pendente(turmaId, alunoId)
    if (pendente?.origem === 'convite') throw conflito('CONVITE_JA_ENVIADO', 'Este aluno já foi convidado e ainda não respondeu.')
    if (pendente) throw conflito('SOLICITACAO_PENDENTE', 'Este aluno já pediu para entrar. Aceite o pedido na aba Código.')

    const id = this.d.ids.novo()
    try {
      await this.d.entradas.salvar({ id, turmaId, alunoId, origem: 'convite', status: 'pendente', criadaEm: this.d.relogio.agora() })
    } catch (erro) {
      // R-115: outra requisição criou a entrada pendente no meio do caminho
      if (!(erro instanceof EntradaPendenteDuplicada)) throw erro
      const existente = await this.d.entradas.pendente(turmaId, alunoId)
      if (existente?.origem === 'convite') throw conflito('CONVITE_JA_ENVIADO', 'Este aluno já foi convidado e ainda não respondeu.')
      throw conflito('SOLICITACAO_PENDENTE', 'Este aluno já pediu para entrar. Aceite o pedido na aba Código.')
    }
    const docente = await this.d.usuarios.porId(ator.id)
    await this.d.emissor.emitir([alunoId], {
      tipo: 'convite-turma',
      titulo: 'Convite para uma equipe',
      mensagem: `${docente?.nome ?? 'Um professor'} convidou você para a equipe ${turma.nome}.`,
      link: '/aluno/turmas',
    })
    return { id }
  }
}
