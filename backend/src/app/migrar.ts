import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type pg from 'pg'

const PASTA = fileURLToPath(new URL('../../migrations/', import.meta.url))

/** Aplica, em ordem, as migrações `.sql` ainda não registradas. Idempotente. */
export async function migrar(pool: pg.Pool): Promise<string[]> {
  await pool.query('CREATE TABLE IF NOT EXISTS migracoes (nome TEXT PRIMARY KEY, aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now())')
  const feitas = new Set((await pool.query<{ nome: string }>('SELECT nome FROM migracoes')).rows.map((r) => r.nome))
  const arquivos = (await readdir(PASTA)).filter((a) => a.endsWith('.sql')).sort()
  const aplicadas: string[] = []
  for (const arquivo of arquivos) {
    if (feitas.has(arquivo)) continue
    const cliente = await pool.connect()
    try {
      await cliente.query('BEGIN')
      await cliente.query(await readFile(PASTA + arquivo, 'utf8'))
      await cliente.query('INSERT INTO migracoes (nome) VALUES ($1)', [arquivo])
      await cliente.query('COMMIT')
      aplicadas.push(arquivo)
    } catch (erro) {
      await cliente.query('ROLLBACK')
      throw erro
    } finally {
      cliente.release()
    }
  }
  return aplicadas
}

/** Só para testes: esvazia todas as tabelas de dados. */
export async function limparBanco(pool: pg.Pool): Promise<void> {
  await pool.query('TRUNCATE entradas_turma, caixa_de_saida, notificacoes, redefinicoes_senha, sessoes, envios, perguntas, formularios, matriculas, turmas, usuarios CASCADE')
}
