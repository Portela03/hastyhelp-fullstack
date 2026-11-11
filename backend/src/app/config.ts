export const config = {
  porta: Number(process.env.PORT ?? 3333),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://hastyhelp:hastyhelp@localhost:5433/hastyhelp',
  jwtSecret: process.env.JWT_SECRET ?? 'segredo-de-desenvolvimento',
  semear: process.env.SEED === 'true',
  /** Endereço público do front, usado nos links de redefinição de senha. */
  urlApp: process.env.APP_URL ?? 'http://localhost:5173',
  /** Só desenvolvimento/testes: habilita GET /api/dev/caixa-de-saida (não há envio de e-mail). */
  exporCaixaDeSaida: process.env.EXPOR_CAIXA_DE_SAIDA === 'true',
}
