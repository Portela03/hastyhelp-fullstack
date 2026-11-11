import { naoEncontrado } from '../../../shared/erros.ts'
import type { Ator } from '../../../shared/ator.ts'
import type { Relogio } from '../../../shared/portas.ts'
import { formularioDoDocente } from '../../autoavaliacoes/application/acesso.ts'
import type { AvisoDePublicacao } from '../../autoavaliacoes/application/acesso.ts'
import type { FormularioRepositorio } from '../../autoavaliacoes/domain/repositorio.ts'
import type { EmissorDeNotificacoes } from '../../notificacoes/application/emissor.ts'
import type { TurmaRepositorio } from '../../turmas/domain/repositorio.ts'
import { moderarObservacao } from '../domain/envio.ts'
import type { EnvioRepositorio } from '../domain/repositorio.ts'

/** R-95…R-97: o professor responde e/ou oculta a observação de um aluno. */
export class ModerarObservacao {
  constructor(
    private readonly d: { formularios: FormularioRepositorio; turmas: TurmaRepositorio; envios: EnvioRepositorio; relogio: Relogio; emissor: EmissorDeNotificacoes; publicacao?: AvisoDePublicacao },
  ) {}

  async executar(ator: Ator, formularioId: string, envioId: string, mudanca: { resposta?: string | null; oculta?: boolean }): Promise<void> {
    const { formulario } = await formularioDoDocente(this.d, ator, formularioId)
    const envio = await this.d.envios.porId(envioId)
    if (!envio || envio.formularioId !== formularioId) throw naoEncontrado('ENVIO_NAO_ENCONTRADO', 'Envio não encontrado.')

    const atualizado = moderarObservacao(envio, mudanca, this.d.relogio.agora())
    await this.d.envios.salvar(atualizado)
    if (atualizado.respostaProfessor && atualizado.respostaProfessor !== envio.respostaProfessor) {
      await this.d.emissor.emitir([envio.alunoId], {
        tipo: 'resposta-observacao',
        titulo: `O professor respondeu sua observação em "${formulario.titulo}"`,
        mensagem: atualizado.respostaProfessor,
        link: `/aluno/autoavaliacoes/${formularioId}/resultado`,
      })
    }
  }
}
