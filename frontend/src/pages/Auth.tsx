import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import bg from '../assets/figma/login-bg.png'
import { BotaoVoltar } from '../components/layout'
import { ButtonBrown, ButtonGhost, Field, PasswordField, cx } from '../components/ui'
import { api, mensagemDeErro } from '../api/client'
import type { Papel } from '../data/aluno'
import { useStore } from '../store'

export function AuthLayout({ titulo, children, voltarPara }: { titulo: string; children: ReactNode; voltarPara?: string }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <img src={bg} alt="" className="pointer-events-none absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-black/10" />
      <BotaoVoltar para={voltarPara} rotulo={voltarPara ? 'o login' : undefined} className="!gap-1 absolute left-4 top-4 z-10 px-3 border shadow-btn border-ink bg-btn rounded-lg hover:bg-btn-hover" esconderCssIcon = {true}/>
      <div className="relative flex w-full max-w-[460px] flex-col items-center gap-8 rounded-lg bg-white px-9 py-8">
        <h1 className="w-full text-[40px] font-semibold text-ink">{titulo}</h1>
        {children}
      </div>
    </div>
  )
}

function AuthButtons({ principal, alternativa, para, desabilitado }: { principal: string; alternativa: string; para: string; desabilitado?: boolean }) {
  const navigate = useNavigate();

  return (
    <div className="flex w-full gap-3">
      <ButtonBrown type="submit" disabled={desabilitado}>
        {principal}
      </ButtonBrown>

      <ButtonGhost onClick={() => navigate(para)}>
        {alternativa}
      </ButtonGhost>
    </div>
  )
}

function EscolhaPapel({ papel, onChange }: { papel: Papel; onChange: (p: Papel) => void }) {
  return (
    <div role="radiogroup" aria-label="Entrar como" className="relative flex items-center rounded-[9px] border border-placeholder bg-white ">
      <div className={cx(
          'absolute top-0 left-0 h-full w-1/2 bg-btn-brown outline rounded-lg',
          'transform duration-250 ease-in-out',
          papel === 'professor' ? "translate-x-0" : "translate-x-full"        
        )}
      />

      {(['professor', 'aluno'] as const).map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={papel === p}
          onClick={() => onChange(p)}
          className={cx(
            'relative z-10 flex-1 cursor-pointer rounded-lg px-3 py-2 text-[16px] font-medium',
            papel === p ? 'text-ink' : 'text-muted',
          )}
        >
          {p === 'professor' ? 'Sou professor' : 'Sou aluno'}
        </button>
      ))}
    </div>
  )
}

export function Login() {
  const navigate = useNavigate()
  const { entrar } = useStore()
  // Vindo de um link de convite: quem já tem conta entra e volta para aceitar o convite (R-114)
  const convite = useSearchParams()[0].get('convite')
  const [papel, setPapel] = useState<Papel>(convite ? 'aluno' : 'professor')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      await entrar(email, senha, papel)
      navigate(papel === 'aluno' ? (convite ? `/convite/${encodeURIComponent(convite)}` : '/aluno/turmas') : '/equipes', { replace: true })
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthLayout titulo="Login">
      {convite && (
        <p role="status" className="-mt-4 w-full rounded-lg border border-line-input bg-panel px-3 py-2 text-[14px] text-ink">
          Entre com sua conta de aluno para aceitar o convite da equipe.
        </p>
      )}
      <form onSubmit={enviar} className="flex w-full flex-col gap-8">
        <div className="flex flex-col gap-3">
          <EscolhaPapel papel={papel} onChange={setPapel} />
        </div>
        <div className="-mt-4 flex flex-col gap-2">
          <Field label="Email" type="email" name="email" placeholder="Digite seu email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="flex flex-col gap-1">
            <PasswordField label="Senha" name="senha" placeholder="Digite sua senha" value={senha} onChange={setSenha} />
            <button type="button" onClick={() => navigate('/esqueci-senha')} className="cursor-pointer text-center text-[16px] text-[#555]">
              Esqueceu a senha?
            </button>
          </div>
          {erro && (
            <p role="alert" className="text-[14px] text-diff-c">
              {erro}
            </p>
          )}
        </div>
        <AuthButtons principal="Concluir" alternativa="Cadastrar" para={convite ? `/convite/${encodeURIComponent(convite)}` : '/cadastro'} desabilitado={enviando} />
      </form>
    </AuthLayout>
  )
}

export function Cadastro({ convite }: { convite?: boolean }) {
  const navigate = useNavigate()
  const { codigo } = useParams()
  const { cadastrar } = useStore()
  const [turma, setTurma] = useState<{ nome: string; periodo: string; aprovacaoManual?: boolean } | null>(null)
  const [conviteCarregado, setConviteCarregado] = useState(!convite)
  const [papel, setPapel] = useState<Papel>(convite ? 'aluno' : 'professor')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!convite) return
    let ativo = true
    api<{ nome: string; periodo: string; aprovacaoManual?: boolean }>('GET', `/auth/convites/${encodeURIComponent(codigo ?? '')}`)
      .then((t) => ativo && setTurma(t))
      .catch(() => ativo && setTurma(null))
      .finally(() => ativo && setConviteCarregado(true))
    return () => {
      ativo = false
    }
  }, [convite, codigo])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (convite && !turma) return setErro('Peça um novo link de convite ao professor.')
    if (senha.length < 8) return setErro('A senha deve ter pelo menos 8 caracteres.')
    if (senha !== confirma) return setErro('As senhas não conferem.')
    setErro('')
    setEnviando(true)
    try {
      await cadastrar({ nome, email, senha, confirmacaoSenha: confirma, papel, ...(convite && codigo ? { codigoConvite: codigo } : {}) })
      navigate('/login')
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthLayout titulo="Cadastrar" voltarPara="/login">
      {convite && conviteCarregado && (
        <p
          role="status"
          className={cx('-mt-4 w-full rounded-lg border px-3 py-2 text-[14px]', turma ? 'border-line-input bg-panel text-ink' : 'border-diff-c text-diff-c')}
        >
          {turma
            ? `Você foi convidado(a) para a turma ${turma.nome} (${turma.periodo}).${turma.aprovacaoManual ? ' O professor precisará aceitar sua entrada.' : ''}`
            : 'Este link de convite é inválido ou expirou.'}
        </p>
      )}
      <form onSubmit={enviar} className="flex w-full flex-col gap-8">
        <div className="flex flex-col gap-2">
          {!convite && <EscolhaPapel papel={papel} onChange={setPapel} />}
          <Field label="Nome" name="nome" placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} required />
          <Field label="Email" type="email" name="email" placeholder="Digite seu email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <div className="flex flex-col gap-1">
            <PasswordField label="Senha" name="senha" placeholder="Digite uma senha forte" value={senha} onChange={setSenha} />
            <PasswordField name="confirma" placeholder="Confirme sua senha" value={confirma} onChange={setConfirma} />
          </div>
          {erro && (
            <p role="alert" className="text-[14px] text-diff-c">
              {erro}
            </p>
          )}
        </div>
        <AuthButtons principal="Cadastrar" alternativa="Já tenho conta" para={convite && codigo ? `/login?convite=${encodeURIComponent(codigo)}` : '/login'} desabilitado={enviando} />
      </form>
    </AuthLayout>
  )
}

/**
 * /convite/:codigo (R-114). Sem login → cadastro com o convite. Aluno já logado → entra na equipe
 * (antes o link só levava ao cadastro e quem já tinha conta ficava preso a uma turma).
 */
export function Convite() {
  const { sessao } = useStore()
  if (!sessao) return <Cadastro convite />
  return <ConviteLogado />
}

function ConviteLogado() {
  const { codigo = '' } = useParams()
  const navigate = useNavigate()
  const { sessao, entrarNaEquipe } = useStore()
  const [turma, setTurma] = useState<{ nome: string; periodo: string; aprovacaoManual: boolean } | null | undefined>(undefined)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<Awaited<ReturnType<typeof entrarNaEquipe>> | null>(null)

  useEffect(() => {
    let ativo = true
    api<{ nome: string; periodo: string; aprovacaoManual: boolean }>('GET', `/auth/convites/${encodeURIComponent(codigo)}`)
      .then((t) => ativo && setTurma(t))
      .catch(() => ativo && setTurma(null))
    return () => {
      ativo = false
    }
  }, [codigo])

  async function entrar() {
    setErro('')
    setEnviando(true)
    try {
      setResultado(await entrarNaEquipe(codigo))
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setEnviando(false)
    }
  }

  const aluno = sessao?.papel === 'aluno'
  return (
    <AuthLayout titulo="Convite" voltarPara={aluno ? '/aluno/turmas' : '/equipes'}>
      <div className="flex w-full flex-col gap-6">
        {turma === undefined && <p role="status" className="text-[16px] text-muted">Carregando convite…</p>}
        {turma === null && (
          <p role="alert" className="rounded-lg border border-diff-c px-3 py-2 text-[14px] text-diff-c">
            Este link de convite é inválido ou expirou. Peça um novo ao professor.
          </p>
        )}
        {turma && !resultado && (
          <>
            <p className="text-[18px] text-ink">
              Você foi convidado(a) para a equipe <strong>{turma.nome}</strong> ({turma.periodo}).
              {turma.aprovacaoManual && ' O professor precisará aceitar sua entrada.'}
            </p>
            {!aluno && (
              <p role="status" className="rounded-lg border border-line-input bg-panel px-3 py-2 text-[14px] text-ink">
                Você está logado como professor. Para entrar numa equipe como aluno, saia e entre com uma conta de aluno.
              </p>
            )}
            {erro && <p role="alert" className="text-[14px] text-diff-c">{erro}</p>}
            {aluno ? (
              <ButtonBrown onClick={() => void entrar()} disabled={enviando}>Entrar na equipe</ButtonBrown>
            ) : (
              <ButtonBrown onClick={() => navigate('/equipes')}>Ir para minhas equipes</ButtonBrown>
            )}
          </>
        )}
        {resultado && (
          <>
            <p role="status" className="text-[18px] text-ink">
              {resultado.status === 'matriculado'
                ? <>Pronto! Você entrou na equipe <strong>{resultado.turma.nome}</strong>.</>
                : <>Pedido enviado para <strong>{resultado.turma.nome}</strong>. Você será avisado quando o professor aceitar.</>}
            </p>
            <ButtonBrown onClick={() => navigate(resultado.status === 'matriculado' ? `/aluno/turmas/${resultado.turma.id}` : '/aluno/turmas')}>
              {resultado.status === 'matriculado' ? 'Abrir equipe' : 'Ver minhas equipes'}
            </ButtonBrown>
          </>
        )}
        {turma === null && <Link to={aluno ? '/aluno/turmas' : '/equipes'} className="text-center text-[16px] text-[#555] underline">Voltar</Link>}
      </div>
    </AuthLayout>
  )
}

export function EsqueciSenha() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      await api('POST', '/auth/esqueci-senha', { email })
      setEnviado(true)
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthLayout titulo="Recuperar senha" voltarPara="/login">
      {enviado ? (
        <div className="flex w-full flex-col gap-6">
          <p role="status" className="text-[16px] text-ink">
            Se existir uma conta com esse e-mail, geramos um link para você escolher uma nova senha. Como o envio de e-mail ainda não está configurado, peça o link ao seu
            professor (alunos) ou ao administrador do sistema (professores).
          </p>
          <ButtonBrown onClick={() => navigate('/login')}>Voltar ao login</ButtonBrown>
        </div>
      ) : (
        <form onSubmit={enviar} className="flex w-full flex-col gap-8">
          <div className="flex flex-col gap-2">
            <p className="text-[16px] text-muted">Informe o e-mail da sua conta para gerar um link de redefinição de senha.</p>
            <Field label="Email" type="email" name="email" placeholder="Digite seu email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            {erro && (
              <p role="alert" className="text-[14px] text-diff-c">
                {erro}
              </p>
            )}
          </div>
          <AuthButtons principal="Gerar link" alternativa="Cancelar" para="/login" desabilitado={enviando} />
        </form>
      )}
    </AuthLayout>
  )
}

export function RedefinirSenha() {
  const navigate = useNavigate()
  const { token } = useParams()
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [concluido, setConcluido] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (senha.length < 8) return setErro('A senha deve ter pelo menos 8 caracteres.')
    if (senha !== confirma) return setErro('As senhas não conferem.')
    setErro('')
    setEnviando(true)
    try {
      await api('POST', '/auth/redefinir-senha', { token, senha, confirmacaoSenha: confirma })
      setConcluido(true)
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthLayout titulo="Nova senha" voltarPara="/login">
      {concluido ? (
        <div className="flex w-full flex-col gap-6">
          <p role="status" className="text-[16px] text-ink">
            Senha alterada com sucesso. Entre com a nova senha.
          </p>
          <ButtonBrown onClick={() => navigate('/login')}>Ir para o login</ButtonBrown>
        </div>
      ) : (
        <form onSubmit={enviar} className="flex w-full flex-col gap-8">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <PasswordField label="Nova senha" name="senha" placeholder="Digite uma senha forte" value={senha} onChange={setSenha} />
              <PasswordField name="confirma" placeholder="Confirme sua nova senha" value={confirma} onChange={setConfirma} />
            </div>
            {erro && (
              <p role="alert" className="text-[14px] text-diff-c">
                {erro}
              </p>
            )}
          </div>
          <AuthButtons principal="Salvar senha" alternativa="Cancelar" para="/login" desabilitado={enviando} />
        </form>
      )}
    </AuthLayout>
  )
}
