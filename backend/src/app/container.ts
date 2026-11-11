import { AvisarPublicacao } from '../contexts/autoavaliacoes/application/avisar-publicacao.ts'
import { CriarFormulario } from '../contexts/autoavaliacoes/application/criar-formulario.ts'
import { EditarFormulario } from '../contexts/autoavaliacoes/application/editar-formulario.ts'
import { ExcluirFormulario } from '../contexts/autoavaliacoes/application/excluir-formulario.ts'
import { ObterFormulario } from '../contexts/autoavaliacoes/application/obter-formulario.ts'
import { AlunoNaTurma, AlunoNoFormulario } from '../contexts/analise/application/consultas-aluno.ts'
import { AlunosDaTurma, ResumoDaTurma } from '../contexts/analise/application/consultas-turma.ts'
import { AlunosDoFormulario, NotificarPendentes, ResumoDoFormulario } from '../contexts/analise/application/consultas-formulario.ts'
import { ListarFormulariosComEstatisticas } from '../contexts/analise/application/listar-formularios-com-estatisticas.ts'
import { ListarTurmasComEstatisticas } from '../contexts/analise/application/listar-turmas-com-estatisticas.ts'
import { MetricasDoProfessor } from '../contexts/analise/application/metricas-do-professor.ts'
import { AtualizarPreferencias } from '../contexts/identidade/application/atualizar-preferencias.ts'
import { AutenticarUsuario } from '../contexts/identidade/application/autenticar-usuario.ts'
import { CadastrarUsuario } from '../contexts/identidade/application/cadastrar-usuario.ts'
import { ObterPerfil } from '../contexts/identidade/application/obter-perfil.ts'
import { EmitirRedefinicao, EsqueciSenha, RedefinirSenha } from '../contexts/identidade/application/redefinicao-de-senha.ts'
import { EncerrarSessao, RenovarSessao, ValidarSessao } from '../contexts/identidade/application/sessao.ts'
import { EmissorDeNotificacoes } from '../contexts/notificacoes/application/emissor.ts'
import { ListarNotificacoes, MarcarNotificacaoLida, MarcarTodasComoLidas } from '../contexts/notificacoes/application/notificacoes-do-usuario.ts'
import { EnviarAutoavaliacao } from '../contexts/respostas/application/enviar-autoavaliacao.ts'
import { ListarAutoavaliacoes } from '../contexts/respostas/application/listar-autoavaliacoes.ts'
import { ModerarObservacao } from '../contexts/respostas/application/moderar-observacao.ts'
import { SalvarResposta } from '../contexts/respostas/application/salvar-resposta.ts'
import { GerarLinkDeRedefinicao, RemoverAlunoDaTurma } from '../contexts/turmas/application/alunos-da-turma.ts'
import { ConsultarConvite } from '../contexts/turmas/application/consultar-convite.ts'
import { CriarTurma } from '../contexts/turmas/application/criar-turma.ts'
import { EditarTurma } from '../contexts/turmas/application/editar-turma.ts'
import { ExcluirTurma } from '../contexts/turmas/application/excluir-turma.ts'
import { ListarTurmas } from '../contexts/turmas/application/listar-turmas.ts'
import type { Infra } from './infra.ts'

/** Composição: liga os casos de uso às implementações de infraestrutura. */
export function criarContainer(infra: Infra) {
  const emissor = new EmissorDeNotificacoes(infra)
  const publicacao = new AvisarPublicacao({ turmas: infra.turmas, emissor })
  const emitirRedefinicao = new EmitirRedefinicao(infra)
  // Dependências completas: cada caso de uso pega só o que declara no construtor.
  const deps = { ...infra, emissor, publicacao, emitirRedefinicao }

  const listarFormularios = new ListarFormulariosComEstatisticas(deps)
  const uc = {
    identidade: {
      cadastrar: new CadastrarUsuario(deps),
      autenticar: new AutenticarUsuario(deps),
      renovarSessao: new RenovarSessao(deps),
      encerrarSessao: new EncerrarSessao(deps),
      validarSessao: new ValidarSessao(deps),
      esqueciSenha: new EsqueciSenha(deps),
      redefinirSenha: new RedefinirSenha(deps),
      obterPerfil: new ObterPerfil(deps),
      atualizarPreferencias: new AtualizarPreferencias(deps),
    },
    turmas: {
      criar: new CriarTurma(deps),
      editar: new EditarTurma(deps),
      excluir: new ExcluirTurma(deps),
      listar: new ListarTurmas(deps),
      consultarConvite: new ConsultarConvite(deps),
      removerAluno: new RemoverAlunoDaTurma(deps),
      gerarLinkDeRedefinicao: new GerarLinkDeRedefinicao(deps),
    },
    formularios: {
      criar: new CriarFormulario(deps),
      editar: new EditarFormulario(deps),
      excluir: new ExcluirFormulario(deps),
      obter: new ObterFormulario(deps),
    },
    respostas: {
      listar: new ListarAutoavaliacoes(deps),
      salvar: new SalvarResposta(deps),
      enviar: new EnviarAutoavaliacao(deps),
      moderarObservacao: new ModerarObservacao(deps),
    },
    notificacoes: {
      listar: new ListarNotificacoes(deps),
      marcarLida: new MarcarNotificacaoLida(deps),
      marcarTodasLidas: new MarcarTodasComoLidas(deps),
    },
    analise: {
      turmas: new ListarTurmasComEstatisticas(deps),
      formularios: listarFormularios,
      formulario: { executar: (ator: Parameters<typeof listarFormularios.um>[0], id: string) => listarFormularios.um(ator, id) },
      alunosTurma: new AlunosDaTurma(deps),
      resumoTurma: new ResumoDaTurma(deps),
      resumoFormulario: new ResumoDoFormulario(deps),
      alunosFormulario: new AlunosDoFormulario(deps),
      alunoNaTurma: new AlunoNaTurma(deps),
      alunoNoFormulario: new AlunoNoFormulario(deps),
      notificarPendentes: new NotificarPendentes(deps),
      metricas: new MetricasDoProfessor(deps),
    },
  }
  return { uc, infra }
}
export type Container = ReturnType<typeof criarContainer>
export type CasosDeUso = Container['uc']
