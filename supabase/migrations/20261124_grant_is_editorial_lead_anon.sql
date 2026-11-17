-- La política de lectura de artículos llama a is_editorial_lead(); sin este permiso la consulta
-- de los visitantes anónimos falla entera y no ven ningún artículo publicado.
grant execute on function public.is_editorial_lead(uuid) to anon, authenticated;
