import pg from 'pg'
import { config } from './config.ts'
import { criarContainer } from './container.ts'
import { criarApp } from './http/servidor.ts'
import { criarInfraPostgres } from './infra-postgres.ts'
import { migrar } from './migrar.ts'
import { semear } from './seed.ts'

async function conectar(pool: pg.Pool, tentativas = 20) {
  for (let i = 1; ; i++) {
    try {
      await pool.query('SELECT 1')
      return
    } catch (erro) {
      if (i >= tentativas) throw erro
      console.log(`Aguardando o banco (${i}/${tentativas})…`)
      await new Promise((r) => setTimeout(r, 1500))
    }
  }
}

const pool = new pg.Pool({ connectionString: config.databaseUrl })
await conectar(pool)
const aplicadas = await migrar(pool)
if (aplicadas.length) console.log(`Migrações aplicadas: ${aplicadas.join(', ')}`)

const container = criarContainer(criarInfraPostgres(pool, { segredo: config.jwtSecret }))
if (config.semear && (await semear(container))) console.log('Dados de demonstração criados (senha: senha1234).')

criarApp(container).listen(config.porta, () => console.log(`HastyHelp API em http://localhost:${config.porta}/api`))
