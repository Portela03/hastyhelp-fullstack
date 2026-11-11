import { criarInfraMemoria } from '../infra-memoria.ts'
import { contratoRepositorios } from './contrato-repositorios.ts'

contratoRepositorios('memória', async () => criarInfraMemoria())
