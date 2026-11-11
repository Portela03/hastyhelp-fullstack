import pg from 'pg'
import { config } from './config.ts'
import { migrar } from './migrar.ts'

const pool = new pg.Pool({ connectionString: config.databaseUrl })
const aplicadas = await migrar(pool)
console.log(aplicadas.length ? `Migrações aplicadas: ${aplicadas.join(', ')}` : 'Banco já está atualizado.')
await pool.end()
