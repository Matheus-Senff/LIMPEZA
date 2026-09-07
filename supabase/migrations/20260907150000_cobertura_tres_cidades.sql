-- =====================================================================
-- Restringe a operação às 3 cidades do Planalto Norte: Itaiópolis-SC,
-- Mafra-SC e Rio Negro-PR, tratadas como um único mercado (região
-- PR-SUL), com o catálogo completo de serviços.
-- =====================================================================

update coverage_areas set active = false where region_code in ('SP-CAPITAL', 'PR-CURITIBA');

update coverage_areas
   set services = '{CLEANING,HEAVY_CLEANING,PRE_MOVING_CLEANING,POST_WORK_CLEANING,BUSINESS_CLEANING,IRONING,FURNITURE_ASSEMBLY,HOME_ASSISTANCE}'
 where region_code = 'PR-SUL';

insert into coverage_areas (region_code, city, state, zip_start, zip_end, services, active) values
  ('PR-SUL', 'Itaiópolis', 'SC', '89340000', '89346970',
   '{CLEANING,HEAVY_CLEANING,PRE_MOVING_CLEANING,POST_WORK_CLEANING,BUSINESS_CLEANING,IRONING,FURNITURE_ASSEMBLY,HOME_ASSISTANCE}', true);
