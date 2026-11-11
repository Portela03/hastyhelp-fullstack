import { CriarFormulario } from '../contexts/autoavaliacoes/application/criar-formulario.ts'
import { EditarFormulario } from '../contexts/autoavaliacoes/application/editar-formulario.ts'
import { ExcluirFormulario } from '../contexts/autoavaliacoes/application/excluir-formulario.ts'
import { ObterFormulario } from '../contexts/autoavaliacoes/application/obter-formulario.ts'
import { AlunosDaTurma, ResumoDaTurma } from '../contexts/analise/application/consultas-turma.ts'
import { AlunosDoFormulario, NotificarPendentes, ResumoDoFormulario } from '../contexts/analise/application/consultas-formulario.ts'
import { ListarFormulariosComEstatisticas } from '../contexts/analise/application/listar-formularios-com-estatisticas.ts'
import { ListarTurmasComEstatisticas } from '../contexts/analise/application/listar-turmas-com-estatisticas.ts'
import { MetricasDoProfessor } from '../contexts/analise/application/metricas-do-professor.ts'
import { AtualizarPreferencias } from '../contexts/identidade/application/atualizar-preferencias.ts'
import { AutenticarUsuario } from '../contexts/identidade/application/autenticar-usuario.ts'
import { CadastrarUsuario } from '../contexts/identidade/application/cadastrar-usuario.ts'
import { ObterPerfil } from '../contexts/identidade/application/obter-perfil.ts'
import { EnviarAutoavaliacao } from '../contexts/respostas/application/enviar-autoavaliacao.ts'
import { ListarAutoavaliacoes } from '../contexts/respostas/application/listar-autoavaliacoes.ts'
import { SalvarResposta } from '../contexts/respostas/application/salvar-resposta.ts'
import { ConsultarConvite } from '../contexts/turmas/application/consultar-convite.ts'
import { CriarTurma } from '../contexts/turmas/application/criar-turma.ts'
import { EditarTurma } from '../contexts/turmas/application/editar-turma.ts'
import { ExcluirTurma } from '../contexts/turmas/application/excluir-turma.ts'
import { ListarTurmas } from '../contexts/turmas/application/listar-turmas.ts'
import type { Infra } from './infra.ts'

/** Composição: liga os casos de uso às implementações de infraestrutura. */
export function criarContainer(infra: Infra) {
  const listarFormularios = new ListarFormulariosComEstatisticas(infra)
  const uc = {
    identidade: {
      cadastrar: new CadastrarUsuario(infra),
      autenticar: new AutenticarUsuario(infra),
      obterPerfil: new ObterPerfil(infra),
      atualizarPreferencias: new AtualizarPreferencias(infra),
    },
    turmas: {
      criar: new CriarTurma(infra),
      editar: new EditarTurma(infra),
      excluir: new ExcluirTurma(infra),
      listar: new ListarTurmas(infra),
      consultarConvite: new ConsultarConvite(infra),
    },
    formularios: {
      criar: new CriarFormulario(infra),
      editar: new EditarFormulario(infra),
      excluir: new ExcluirFormulario(infra),
      obter: new ObterFormulario(infra),
    },
    respostas: {
      listar: new ListarAutoavaliacoes(infra),
      salvar: new SalvarResposta(infra),
      enviar: new EnviarAutoavaliacao(infra),
    },
    analise: {
      turmas: new ListarTurmasComEstatisticas(infra),
      formularios: listarFormularios,
      formulario: { executar: (ator: Parameters<typeof listarFormularios.um>[0], id: string) => listarFormularios.um(ator, id) },
      alunosTurma: new AlunosDaTurma(infra),
      resumoTurma: new ResumoDaTurma(infra),
      resumoFormulario: new ResumoDoFormulario(infra),
      alunosFormulario: new AlunosDoFormulario(infra),
      notificarPendentes: new NotificarPendentes(infra),
      metricas: new MetricasDoProfessor(infra),
    },
  }
  return { uc, infra }
}
export type Container = ReturnType<typeof criarContainer>
export type CasosDeUso = Container['uc']
