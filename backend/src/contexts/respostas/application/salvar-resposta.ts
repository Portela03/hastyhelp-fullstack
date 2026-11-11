import { ErroDeDominio, naoEncontrado } from '../../../shared/erros.ts'
import type { Ator } from '../../../shared/ator.ts'
import type { GeradorId, Relogio } from '../../../shared/portas.ts'
import { aceitaRespostas } from '../../autoavaliacoes/domain/formulario.ts'
import type { FormularioRepositorio } from '../../autoavaliacoes/domain/repositorio.ts'
import type { TurmaRepositorio } from '../../turmas/domain/repositorio.ts'
import { novoEnvio, registrarResposta } from '../domain/envio.ts'
import type { EnvioRepositorio } from '../domain/repositorio.ts'
import { formularioDoAluno } from './acesso.ts'
import { autoavaliacaoDTO } from './dto.ts'
import type { AutoavaliacaoDTO } from './dto.ts'

/** Salva a marcação de uma pergunta na hora (rascunho do envio). */
export class SalvarResposta {
  constructor(private readonly d: { formularios: FormularioRepositorio; turmas: TurmaRepositorio; envios: EnvioRepositorio; ids: GeradorId; relogio: Relogio }) {}

  async executar(ator: Ator, formularioId: string, perguntaId: string, marcadas: number[]): Promise<AutoavaliacaoDTO> {
    const formulario = await formularioDoAluno(this.d, ator, formularioId)
    const pergunta = formulario.perguntas.find((p) => p.id === perguntaId)
    if (!pergunta) throw naoEncontrado('PERGUNTA_NAO_ENCONTRADA', 'Pergunta não encontrada.')
    const agora = this.d.relogio.agora()
    const existente = await this.d.envios.porFormularioEAluno(formularioId, ator.id)
    const envio = registrarResposta(
      existente ?? novoEnvio({ id: this.d.ids.novo(), formularioId, alunoId: ator.id, turmaId: formulario.turmaId }, agora),
      pergunta,
      marcadas,
      agora,
    )
    if (!aceitaRespostas(formulario, agora)) throw new ErroDeDominio('FORA_DO_PRAZO', 'Esta autoavaliação não aceita mais respostas.')
    await this.d.envios.salvar(envio)
    return autoavaliacaoDTO(formulario, envio, agora)
  }
}
