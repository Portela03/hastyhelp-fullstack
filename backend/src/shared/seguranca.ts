import { createHash, randomBytes } from 'node:crypto'

/** Token opaco (64 hex) para refresh e redefinição de senha; só o hash é persistido. */
export const gerarTokenOpaco = () => randomBytes(32).toString('hex')
export const hashDeToken = (token: string) => createHash('sha256').update(token).digest('hex')
