import type { Ator } from '../../../shared/ator.ts'
import { ErroDeDominio } from '../../../shared/erros.ts'
import type { GeradorId } from '../../../shared/portas.ts'
import type { UsuarioRepositorio } from '../../identidade/domain/usuario.ts'
import type { TurmaRepositorio } from '../domain/repositorio.ts'
import { turmaDoDocente } from './acesso.ts'
import { turmaDTO } from './dto.ts'
import type { TurmaDTO } from './dto.ts'

const TENTATIVAS = 5

/** R-117: o docente dono gera um novo código de turma, invalidando o antigo (ex.: código vazou). */
export class GerarNovoCodigo {
  constructor(private readonly d: { turmas: TurmaRepositorio; usuarios: UsuarioRepositorio; ids: GeradorId }) {}

  async executar(ator: Ator, turmaId: string): Promise<TurmaDTO> {
    const turma = await turmaDoDocente(this.d.turmas, ator, turmaId)
    for (let i = 0; i < TENTATIVAS; i++) {
      const codigo = this.d.ids.codigo()
      if (await this.d.turmas.trocarCodigo(turma.id, codigo)) {
        const docente = await this.d.usuarios.porId(turma.docenteId)
        return turmaDTO({ ...turma, codigoConvite: codigo }, docente?.nome ?? '', true) as TurmaDTO
      }
    }
    throw new ErroDeDominio('CODIGO_INDISPONIVEL', 'Não foi possível gerar um código novo agora. Tente de novo.', 503)
  }
}
