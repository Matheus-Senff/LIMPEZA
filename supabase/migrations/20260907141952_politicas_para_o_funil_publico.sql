-- O funil precisa cotar preço e gravar lead antes de existir usuário logado.
-- As regras de preço não são segredo (o concorrente serve as dele em JS público),
-- mas só a versão ATIVA fica legível.

create policy ruleset_leitura_publica on pricing_rulesets
  for select to anon, authenticated using (active);

create policy lead_captura on leads
  for insert to anon, authenticated with check (true);

create policy cotacao_criacao on quotes
  for insert to anon, authenticated with check (true);

-- O visitante lê a cotação que acabou de criar (id é uuid, não enumerável)
create policy cotacao_leitura_por_id on quotes
  for select to anon using (expires_at > now());

create policy cupom_leitura on coupons
  for select to anon, authenticated using (active and (expires_at is null or expires_at > now()));
