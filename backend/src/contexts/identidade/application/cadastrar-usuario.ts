import { ErroDeDominio, conflito } from '../../../shared/erros.ts'
import type { Papel } from '../../../shared/ator.ts'
import type { GeradorId, Relogio } from '../../../shared/portas.ts'
import { normalizarCodigo } from '../../../shared/texto.ts'
import type { EntrarNaTurma } from '../../turmas/application/entrar-na-turma.ts'
import type { TurmaRepositorio } from '../../turmas/domain/repositorio.ts'
import { criarEmail } from '../domain/email.ts'
import { validarSenha } from '../domain/senha.ts'
import { PREFERENCIAS_PADRAO } from '../domain/usuario.ts'
import type { UsuarioRepositorio } from '../domain/usuario.ts'
import { usuarioDTO } from './dto.ts'
import type { Hasher } from './portas.ts'

export interface EntradaCadastro {
  nome: string
  email: string
  senha: string
  papel: Papel
  confirmacaoSenha?: string
  codigoConvite?: string
}

export class CadastrarUsuario {
  constructor(
    private readonly d: { usuarios: UsuarioRepositorio; turmas: TurmaRepositorio; entrarNaTurma: EntrarNaTurma; hasher: Hasher; ids: GeradorId; relogio: Relogio },
  ) {}

  async executar(e: EntradaCadastro) {
    const nome = e.nome.trim()
    if (!nome) throw new ErroDeDominio('NOME_OBRIGATORIO', 'Informe seu nome.', 400)
    if (e.papel !== 'aluno' && e.papel !== 'professor') throw new ErroDeDominio('PAPEL_INVALIDO', 'Papel inválido.', 400)
    const email = criarEmail(e.email)
    validarSenha(e.senha)
    if (e.confirmacaoSenha !== undefined && e.confirmacaoSenha !== e.senha) {
      throw new ErroDeDominio('SENHAS_DIFERENTES', 'As senhas não conferem.', 400)
    }
    const convite = e.codigoConvite?.trim()
    const turma = convite && e.papel === 'aluno' ? await this.d.turmas.porCodigo(normalizarCodigo(convite)) : undefined
    if (convite && e.papel === 'aluno' && !turma) {
      throw new ErroDeDominio('CONVITE_INVALIDO', 'Peça um novo link de convite ao professor.')
    }
    if (await this.d.usuarios.porEmail(email)) throw conflito('EMAIL_EM_USO', 'Este e-mail já está cadastrado.')

    const usuario = {
      id: this.d.ids.novo(),
      nome,
      email,
      senhaHash: await this.d.hasher.gerar(e.senha),
      papel: e.papel,
      preferencias: { ...PREFERENCIAS_PADRAO },
      criadoEm: this.d.relogio.agora(),
    }
    await this.d.usuarios.salvar(usuario)
    // R-04/R-103: matricula direto ou deixa o pedido pendente, conforme a turma
    const entrada = turma ? await this.d.entrarNaTurma.executar(turma, usuario) : undefined
    return { usuario: usuarioDTO(usuario), ...(entrada ? { entrada: entrada.status } : {}) }
  }
}
