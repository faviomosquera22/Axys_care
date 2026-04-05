insert into public.diagnosis_catalog_icd10 (code, label)
values
  ('J06.9', 'Infección aguda de vías respiratorias superiores, no especificada'),
  ('I10', 'Hipertensión esencial primaria'),
  ('E11.9', 'Diabetes mellitus tipo 2 sin complicaciones'),
  ('N39.0', 'Infección de vías urinarias, sitio no especificado'),
  ('M54.5', 'Lumbalgia'),
  ('R50.9', 'Fiebre, no especificada')
on conflict (code) do nothing;

insert into public.procedure_catalog (name, category)
values
  ('Curación simple', 'enfermeria'),
  ('Retiro de suturas', 'enfermeria'),
  ('Nebulización', 'general'),
  ('Canalización periférica', 'enfermeria'),
  ('Administración intramuscular', 'enfermeria')
on conflict (name) do nothing;

