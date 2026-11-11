import { ErroDeDominio } from '../../../shared/erros.ts'
import type { Ator } from '../../../shared/ator.ts'
import type { GeradorId, Relogio } from '../../../shared/portas.ts'
import { aceitaRespostas } from '../../autoavaliacoes/domain/formulario.ts'
import type { FormularioRepositorio } from '../../autoavaliacoes/domain/repositorio.ts'
import type { TurmaRepositorio } from '../../turmas/domain/repositorio.ts'
import { enviarEnvio, novoEnvio } from '../domain/envio.ts'
import type { EnvioRepositorio } from '../domain/repositorio.ts'
import { formularioDoAluno } from './acesso.ts'
import { autoavaliacaoDTO } from './dto.ts'
import type { AutoavaliacaoDTO } from './dto.ts'

/** R-44…R-48: envio definitivo, com nota e nível de compreensão. */
export class EnviarAutoavaliacao {
  constructor(private readonly d: { formularios: FormularioRepositorio; turmas: TurmaRepositorio; envios: EnvioRepositorio; ids: GeradorId; relogio: Relogio }) {}

  async executar(ator: Ator, formularioId: string, observacao?: string): Promise<AutoavaliacaoDTO> {
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
    )
    await this.d.envios.salvar(envio)
    return autoavaliacaoDTO(formulario, envio, agora)
  }
}
