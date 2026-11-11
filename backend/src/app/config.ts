export const config = {
  porta: Number(process.env.PORT ?? 3333),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://hastyhelp:hastyhelp@localhost:5433/hastyhelp',
  jwtSecret: process.env.JWT_SECRET ?? 'segredo-de-desenvolvimento',
  semear: process.env.SEED === 'true',
}
