import { exigirPapel } from '../../../shared/ator.ts'
import type { Ator } from '../../../shared/ator.ts'
import type { Relogio } from '../../../shared/portas.ts'
import { materializarTodos } from '../../autoavaliacoes/application/acesso.ts'
import { visivelParaAluno } from '../../autoavaliacoes/domain/formulario.ts'
import type { FormularioRepositorio } from '../../autoavaliacoes/domain/repositorio.ts'
import type { TurmaRepositorio } from '../../turmas/domain/repositorio.ts'
import type { EnvioRepositorio } from '../domain/repositorio.ts'
import { autoavaliacaoDTO } from './dto.ts'
import type { AutoavaliacaoDTO } from './dto.ts'

export class ListarAutoavaliacoes {
  constructor(private readonly d: { formularios: FormularioRepositorio; turmas: TurmaRepositorio; envios: EnvioRepositorio; relogio: Relogio }) {}

  async executar(ator: Ator): Promise<AutoavaliacaoDTO[]> {
    exigirPapel(ator, 'aluno')
    const turmas = await this.d.turmas.listarDoAluno(ator.id)
    const formularios = await materializarTodos(this.d.formularios, this.d.relogio, await this.d.formularios.listarPorTurmas(turmas.map((t) => t.id)))
    const envios = await this.d.envios.listarPorAluno(ator.id)
    const agora = this.d.relogio.agora()
    return formularios
      .filter(visivelParaAluno)
      .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())
      .map((f) => autoavaliacaoDTO(f, envios.find((e) => e.formularioId === f.id), agora))
  }
}
