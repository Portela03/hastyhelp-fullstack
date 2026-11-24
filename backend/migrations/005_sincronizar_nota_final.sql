UPDATE envios
SET nota = nota_geral
WHERE status = 'enviado'
  AND nota_geral IS NOT NULL
  AND (nota IS NULL OR nota IS DISTINCT FROM nota_geral);
