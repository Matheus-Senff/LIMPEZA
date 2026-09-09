-- Credenciamento real: o profissional envia os documentos (RG/CNH frente e
-- verso, comprovante de endereço, selfie com o documento) e a admin revisa
-- e aprova pela tela. Os arquivos ficam num bucket privado do Storage —
-- cada profissional só enxerga a própria pasta, a admin enxerga todas.

insert into storage.buckets (id, name, public)
values ('documentos-profissionais', 'documentos-profissionais', false)
on conflict (id) do nothing;

create policy "profissional le seus documentos"
  on storage.objects for select to authenticated
  using (bucket_id = 'documentos-profissionais' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "profissional envia seus documentos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos-profissionais' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "profissional substitui seus documentos"
  on storage.objects for update to authenticated
  using (bucket_id = 'documentos-profissionais' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'documentos-profissionais' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "admin le todos os documentos"
  on storage.objects for select to authenticated
  using (bucket_id = 'documentos-profissionais' and is_admin());

alter table professionals add column if not exists documents_submitted_at timestamptz;

-- Chamado pelo profissional depois de subir os 4 arquivos. Só empurra o
-- status pra "em verificação" se ainda estiver no estado inicial — não
-- reabre um credenciamento já negado/suspenso reenviando documento.
create or replace function fn_marcar_documentos_enviados()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'sem sessão';
  end if;
  update professionals
     set documents_submitted_at = now(),
         accreditation_status = 'in_review'
   where id = auth.uid()
     and accreditation_status = 'pending';
end $function$;

grant execute on function fn_marcar_documentos_enviados() to authenticated;
revoke execute on function fn_marcar_documentos_enviados() from public, anon;
