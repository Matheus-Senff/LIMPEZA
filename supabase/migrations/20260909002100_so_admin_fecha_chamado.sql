-- Cliente/profissional não decide mais quando o chamado está resolvido —
-- só a admin fecha. Antes o próprio autor podia marcar 'closed' sozinho.
drop policy if exists chamado_fechar_proprio on support_tickets;
