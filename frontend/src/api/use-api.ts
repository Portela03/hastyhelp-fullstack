import { useCallback, useEffect, useState } from 'react'
import { api, mensagemDeErro } from './client'

/**
 * Busca um GET da API quando o componente monta ou quando `chave` muda
 * (use um valor que mude quando os dados do servidor mudam, ex.: a lista do store).
 */
export function useApi<T>(caminho: string | null, chave: unknown = null) {
  const [dados, setDados] = useState<T | null>(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(caminho !== null)

  const carregar = useCallback(async () => {
    if (caminho === null) return
    try {
      setDados(await api<T>('GET', caminho))
      setErro('')
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setCarregando(false)
    }
  }, [caminho])

  useEffect(() => {
    void carregar()
    // `chave` força nova busca quando os dados do store mudam
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregar, chave])

  return { dados, erro, carregando, recarregar: carregar }
}
