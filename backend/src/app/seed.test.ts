import { describe, expect, it } from 'vitest'
import { criarContainer } from './container.ts'
import { criarInfraMemoria } from './infra-memoria.ts'
import { SENHA_DEMO, semear } from './seed.ts'

describe('seed de demonstração', () => {
  it('cria professor, turmas com convites do front e é idempotente', async () => {
    const c = criarContainer(criarInfraMemoria())
    expect(await semear(c)).toBe(true)
    expect(await semear(c)).toBe(false)
    expect(await c.uc.turmas.consultarConvite.executar('pdm-2026')).toMatchObject({ nome: 'Programação para Dispositivos Móveis' })
    const { usuario } = await c.uc.identidade.autenticar.executar({ email: 'alberto@hastyhelp.dev', senha: SENHA_DEMO, papel: 'professor' })
    expect((await c.uc.analise.turmas.executar({ id: usuario.id, papel: 'professor' })).length).toBe(5)
  })
})
