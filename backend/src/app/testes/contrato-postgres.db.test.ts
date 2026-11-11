import pg from 'pg'
import { afterAll } from 'vitest'
import { limparBanco, migrar } from '../migrar.ts'
import { criarInfraPostgres } from '../infra-postgres.ts'
import { contratoRepositorios } from './contrato-repositorios.ts'

const url = process.env.DATABASE_URL ?? 'postgres://hastyhelp:hastyhelp@localhost:5433/hastyhelp_teste'
const pool = new pg.Pool({ connectionString: url })

afterAll(() => pool.end())

contratoRepositorios('PostgreSQL', async () => {
  await migrar(pool)
  await limparBanco(pool)
  return criarInfraPostgres(pool, { segredo: 'teste' })
})
