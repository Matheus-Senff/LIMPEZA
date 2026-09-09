-- A operação é só Itaiópolis, Mafra e Rio Negro. Curitiba e SP-Capital
-- nunca chegaram a ficar ativas, mas apareciam no admin (Preços > Cobertura
-- por CEP) — remove de vez, sem uso nenhum registrado (nenhum pedido,
-- cotação ou endereço referencia essas regiões).
delete from pricing_rulesets where region_code in ('PR-CURITIBA', 'SP-CAPITAL');
delete from coverage_areas where region_code in ('PR-CURITIBA', 'SP-CAPITAL');
