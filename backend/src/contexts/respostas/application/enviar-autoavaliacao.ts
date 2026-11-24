import { ErroDeDominio } from '../../../shared/erros.ts'
import type { Ator } from '../../../shared/ator.ts'
import type { GeradorId, Relogio } from '../../../shared/portas.ts'
import type { AvisoDePublicacao } from '../../autoavaliacoes/application/acesso.ts'
import { aceitaRespostas } from '../../autoavaliacoes/domain/formulario.ts'
import type { FormularioRepositorio } from '../../autoavaliacoes/domain/repositorio.ts'
import type { TurmaRepositorio } from '../../turmas/domain/repositorio.ts'
import { enviarEnvio, novoEnvio } from '../domain/envio.ts'
import type { EnvioRepositorio } from '../domain/repositorio.ts'
import type { EmissorDeNotificacoes } from '../../notificacoes/application/emissor.ts'
import { formularioDoAluno } from './acesso.ts'
import { autoavaliacaoDTO } from './dto.ts'
import type { AutoavaliacaoDTO } from './dto.ts'

/** R-44…R-48: envio definitivo, com nota e nível de compreensão. */
export class EnviarAutoavaliacao {
  constructor(private readonly d: { formularios: FormularioRepositorio; turmas: TurmaRepositorio; envios: EnvioRepositorio; ids: GeradorId; relogio: Relogio; publicacao?: AvisoDePublicacao; emissor: EmissorDeNotificacoes }) {}

  async executar(ator: Ator, formularioId: string, observacao?: string, notaGeral?: number): Promise<AutoavaliacaoDTO> {
    const formulario = await formularioDoAluno(this.d, ator, formularioId)
    const agora = this.d.relogio.agora()
    const existente = await this.d.envios.porFormularioEAluno(formularioId, ator.id)
    if (existente?.status !== 'enviado' && !aceitaRespostas(formulario, agora)) {
      throw new ErroDeDominio('FORA_DO_PRAZO', 'Esta autoavaliação não aceita mais respostas.')
    }
    const envio = enviarEnvio(
      existente ?? novoEnvio({ id: this.d.ids.novo(), formularioId, alunoId: ator.id, turmaId: formulario.turmaId }, agora),
      formulario.perguntas,
      observacao,
      agora,
      notaGeral,
    )
    await this.d.envios.salvar(envio)
    await this.avisarSeConcluiu(formulario.id, formulario.titulo, formulario.turmaId)
    return autoavaliacaoDTO(formulario, envio, agora)
  }

  /** R-83: quando o último aluno envia, o professor é avisado. */
  private async avisarSeConcluiu(formularioId: string, titulo: string, turmaId: string) {
    const [alunos, envios, turma] = await Promise.all([this.d.turmas.alunosIds(turmaId), this.d.envios.listarPorFormulario(formularioId), this.d.turmas.porId(turmaId)])
    const enviaram = new Set(envios.filter((e) => e.status === 'enviado').map((e) => e.alunoId))
    if (!turma || alunos.length === 0 || !alunos.every((id) => enviaram.has(id))) return
    await this.d.emissor.emitir(
      [turma.docenteId],
      { tipo: 'conclusao', titulo: `Todos os alunos responderam: ${titulo}`, mensagem: 'Veja o resumo da autoavaliação.', link: `/avaliacoes/${formularioId}/resumo` },
      'conclusaoFormularios',
    )
  }
}
