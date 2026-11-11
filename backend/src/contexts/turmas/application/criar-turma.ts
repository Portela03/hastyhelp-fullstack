import { exigirPapel } from '../../../shared/ator.ts'
import type { Ator } from '../../../shared/ator.ts'
import { naoEncontrado } from '../../../shared/erros.ts'
import type { GeradorId, Relogio } from '../../../shared/portas.ts'
import type { UsuarioRepositorio } from '../../identidade/domain/usuario.ts'
import type { TurmaRepositorio } from '../domain/repositorio.ts'
import { criarTurma } from '../domain/turma.ts'
import { turmaDTO } from './dto.ts'
import type { TurmaDTO } from './dto.ts'

export class CriarTurma {
  constructor(private readonly d: { turmas: TurmaRepositorio; usuarios: UsuarioRepositorio; ids: GeradorId; relogio: Relogio }) {}

  async executar(ator: Ator, e: { nome: string; periodo: string; sigla?: string; cor?: string }): Promise<TurmaDTO> {
    exigirPapel(ator, 'professor')
    const docente = await this.d.usuarios.porId(ator.id)
    if (!docente) throw naoEncontrado('USUARIO_NAO_ENCONTRADO', 'Usuário não encontrado.')
    const turma = criarTurma({
      id: this.d.ids.novo(),
      nome: e.nome,
      periodo: e.periodo,
      ...(e.sigla ? { sigla: e.sigla } : {}),
      ...(e.cor ? { cor: e.cor } : {}),
      docenteId: ator.id,
      codigoConvite: this.d.ids.codigo(),
      criadaEm: this.d.relogio.agora(),
    })
    await this.d.turmas.salvar(turma)
    return turmaDTO(turma, docente.nome, true) as TurmaDTO
  }
}
