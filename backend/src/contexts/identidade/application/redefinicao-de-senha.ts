import { ErroDeDominio } from '../../../shared/erros.ts'
import type { GeradorId, Relogio } from '../../../shared/portas.ts'
import { gerarTokenOpaco, hashDeToken } from '../../../shared/seguranca.ts'
import { criarEmail } from '../domain/email.ts'
import { validarSenha } from '../domain/senha.ts'
import { VALIDADE_REDEFINICAO_MINUTOS } from '../domain/sessao.ts'
import type { CaixaDeSaida, RedefinicaoRepositorio, SessaoRepositorio } from '../domain/sessao.ts'
import type { Usuario, UsuarioRepositorio } from '../domain/usuario.ts'
import type { Hasher } from './portas.ts'

/** Gera o token de redefinição (só o hash é guardado) e devolve o link. Usado por R-75 e R-77. */
export class EmitirRedefinicao {
  constructor(private readonly d: { redefinicoes: RedefinicaoRepositorio; ids: GeradorId; relogio: Relogio; urlApp: string }) {}

  async executar(usuario: Pick<Usuario, 'id'>): Promise<{ link: string }> {
    const token = gerarTokenOpaco()
    const agora = this.d.relogio.agora()
    await this.d.redefinicoes.salvar({
      id: this.d.ids.novo(),
      usuarioId: usuario.id,
      tokenHash: hashDeToken(token),
      expiraEm: new Date(agora.getTime() + VALIDADE_REDEFINICAO_MINUTOS * 60_000),
      criadaEm: agora,
    })
    return { link: `${this.d.urlApp}/redefinir-senha/${token}` }
  }
}

/** R-75: resposta idêntica para conta existente ou não; o link só vai para a caixa de saída. */
export class EsqueciSenha {
  constructor(private readonly d: { usuarios: UsuarioRepositorio; caixaDeSaida: CaixaDeSaida; emitirRedefinicao: EmitirRedefinicao; ids: GeradorId; relogio: Relogio }) {}

  async executar(e: { email: string }): Promise<void> {
    let email: string
    try {
      email = criarEmail(e.email)
    } catch {
      return
    }
    const usuario = await this.d.usuarios.porEmail(email)
    if (!usuario) return
    const { link } = await this.d.emitirRedefinicao.executar(usuario)
    await this.d.caixaDeSaida.registrar({
      id: this.d.ids.novo(),
      para: email,
      assunto: 'Redefinição de senha — HastyHelp',
      corpo: `Olá, ${usuario.nome}. Use o link para escolher uma nova senha (vale ${VALIDADE_REDEFINICAO_MINUTOS} minutos): ${link}`,
      link,
      criadaEm: this.d.relogio.agora(),
    })
  }
}

/** R-76 + R-73 */
export class RedefinirSenha {
  constructor(private readonly d: { usuarios: UsuarioRepositorio; redefinicoes: RedefinicaoRepositorio; sessoes: SessaoRepositorio; hasher: Hasher; relogio: Relogio }) {}

  async executar(e: { token: string; senha: string; confirmacaoSenha?: string }): Promise<void> {
    const agora = this.d.relogio.agora()
    const redefinicao = await this.d.redefinicoes.porTokenHash(hashDeToken(e.token))
    if (!redefinicao || redefinicao.usadaEm || redefinicao.expiraEm.getTime() <= agora.getTime()) {
      throw new ErroDeDominio('TOKEN_INVALIDO', 'Este link de redefinição é inválido ou expirou. Peça um novo.')
    }
    validarSenha(e.senha)
    if (e.confirmacaoSenha !== undefined && e.confirmacaoSenha !== e.senha) {
      throw new ErroDeDominio('SENHAS_DIFERENTES', 'As senhas não conferem.', 400)
    }
    const usuario = await this.d.usuarios.porId(redefinicao.usuarioId)
    if (!usuario) throw new ErroDeDominio('TOKEN_INVALIDO', 'Este link de redefinição é inválido ou expirou. Peça um novo.')

    await this.d.usuarios.salvar({ ...usuario, senhaHash: await this.d.hasher.gerar(e.senha) })
    await this.d.redefinicoes.salvar({ ...redefinicao, usadaEm: agora })
    await this.d.sessoes.revogarDoUsuario(usuario.id, agora)
  }
}
