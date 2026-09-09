-- =====================================================================
-- Mapa por bairro: cache de coordenadas aproximadas por bairro/cidade,
-- geocodificadas sob demanda (Nominatim/OpenStreetMap, gratuito, sem
-- chave) e guardadas aqui pra não bater no serviço externo de novo pro
-- mesmo bairro. Não é dado de cliente — é só a centralidade aproximada
-- de um bairro dentro de uma das 3 cidades atendidas.
-- =====================================================================

create table if not exists district_centroids (
  city text not null,
  state char(2) not null,
  district text not null,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now(),
  primary key (city, state, district)
);

alter table district_centroids enable row level security;

create policy centroide_leitura on district_centroids
  for select to authenticated using (true);

-- Escreve só via função (não via grant direto na tabela) pra poder validar
-- a coordenada antes de aceitar: limita à caixa geográfica das 3 cidades
-- atendidas, então mesmo um valor mal-intencionado não desloca o pino pra
-- fora da região real.
create or replace function fn_upsert_centroide_bairro(
  p_city text, p_state char(2), p_district text, p_lat double precision, p_lng double precision
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_lat < -27 or p_lat > -25.5 or p_lng < -50.5 or p_lng > -49 then
    raise exception 'coordenada fora da região atendida';
  end if;

  insert into district_centroids (city, state, district, lat, lng, updated_at)
  values (p_city, p_state, p_district, p_lat, p_lng, now())
  on conflict (city, state, district) do update
    set lat = excluded.lat, lng = excluded.lng, updated_at = now();
end;
$$;

revoke all on function fn_upsert_centroide_bairro(text, char(2), text, double precision, double precision) from public;
grant execute on function fn_upsert_centroide_bairro(text, char(2), text, double precision, double precision) to authenticated;
