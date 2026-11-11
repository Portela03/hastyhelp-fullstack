import { lerData } from '../../../shared/ator.ts'
import type { Ator } from '../../../shared/ator.ts'
import type { GeradorId, Relogio } from '../../../shared/portas.ts'
import type { TurmaRepositorio } from '../../turmas/domain/repositorio.ts'
import { alterarStatus, atualizarFormulario } from '../domain/formulario.ts'
import type { StatusFormulario } from '../domain/formulario.ts'
import type { FormularioRepositorio } from '../domain/repositorio.ts'
import { formularioDoDocente } from './acesso.ts'
import { formularioDTO } from './dto.ts'
import type { FormularioDTO, PerguntaEntrada } from './dto.ts'

export interface EdicaoEntrada {
  titulo?: string
  prazo?: string | null
  mostrarGabarito?: boolean
  perguntas?: PerguntaEntrada[]
  status?: StatusFormulario
  publicarEm?: string
}

export class EditarFormulario {
  constructor(private readonly d: { formularios: FormularioRepositorio; turmas: TurmaRepositorio; ids: GeradorId; relogio: Relogio }) {}

  async executar(ator: Ator, formularioId: string, e: EdicaoEntrada): Promise<FormularioDTO> {
    const { formulario } = await formularioDoDocente(this.d, ator, formularioId)
    const agora = this.d.relogio.agora()
    let atual = atualizarFormulario(
      formulario,
      {
        ...(e.titulo !== undefined ? { titulo: e.titulo } : {}),
        ...(e.mostrarGabarito !== undefined ? { mostrarGabarito: e.mostrarGabarito } : {}),
        ...(e.prazo !== undefined ? { prazo: e.prazo ? lerData(e.prazo, 'prazo') : null } : {}),
        ...(e.perguntas ? { perguntas: e.perguntas.map((p) => ({ ...p, id: p.id || this.d.ids.novo() })) } : {}),
      },
      agora,
    )
    if (e.status) atual = alterarStatus(atual, e.status, agora, e.publicarEm ? lerData(e.publicarEm, 'publicarEm') : undefined)
    await this.d.formularios.salvar(atual)
    return formularioDTO(atual)
  }
}
