import { exigirPapel, lerData } from '../../../shared/ator.ts'
import type { Ator } from '../../../shared/ator.ts'
import type { GeradorId, Relogio } from '../../../shared/portas.ts'
import { turmaDoDocente } from '../../turmas/application/acesso.ts'
import type { TurmaRepositorio } from '../../turmas/domain/repositorio.ts'
import { criarFormulario } from '../domain/formulario.ts'
import type { FormularioRepositorio } from '../domain/repositorio.ts'
import type { AvisoDePublicacao } from './acesso.ts'
import { formularioDTO } from './dto.ts'
import type { FormularioDTO, PerguntaEntrada } from './dto.ts'

export interface EntradaFormulario {
  titulo: string
  turmaId: string
  perguntas: PerguntaEntrada[]
  postar?: boolean
  publicarEm?: string
  prazo?: string
  mostrarGabarito?: boolean
}

export class CriarFormulario {
  constructor(private readonly d: { formularios: FormularioRepositorio; turmas: TurmaRepositorio; ids: GeradorId; relogio: Relogio; publicacao?: AvisoDePublicacao }) {}

  async executar(ator: Ator, e: EntradaFormulario): Promise<FormularioDTO> {
    exigirPapel(ator, 'professor')
    await turmaDoDocente(this.d.turmas, ator, e.turmaId)
    const formulario = criarFormulario(
      {
        id: this.d.ids.novo(),
        titulo: e.titulo,
        turmaId: e.turmaId,
        perguntas: e.perguntas.map((p) => ({ ...p, id: p.id || this.d.ids.novo() })),
        ...(e.postar ? { postar: true } : {}),
        ...(e.publicarEm ? { publicarEm: lerData(e.publicarEm, 'publicarEm') } : {}),
        ...(e.prazo ? { prazo: lerData(e.prazo, 'prazo') } : {}),
        ...(e.mostrarGabarito !== undefined ? { mostrarGabarito: e.mostrarGabarito } : {}),
      },
      this.d.relogio.agora(),
    )
    await this.d.formularios.salvar(formulario)
    if (formulario.status === 'aberto') await this.d.publicacao?.executar(formulario)
    return formularioDTO(formulario)
  }
}
