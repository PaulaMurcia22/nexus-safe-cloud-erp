-- Datos deterministas, explícitamente sintéticos. Usuarios/hash y datos operativos se crean con seed-demo.ts.
INSERT INTO public.clients(id,legal_name,nit,nit_normalized,industry,contact_name,contact_position,contact_email,contact_phone,city,address,status,data_origin)
VALUES
 ('00000000-0000-4000-8000-000000000101','DEMO - Centro de Salud Gestionado','DEMO-CL-0001','0001','DEMO - Salud','Contacto Sintético','Contacto demo','contacto-clinica@demo.invalid',NULL,'Sin confirmar',NULL,'ACTIVE','SYNTHETIC'),
 ('00000000-0000-4000-8000-000000000102','DEMO - Cliente Aislamiento','DEMO-CL-0002','0002','DEMO - Servicios','Contacto Sintético','Contacto demo','contacto-aislamiento@demo.invalid',NULL,'Sin confirmar',NULL,'ACTIVE','SYNTHETIC')
ON CONFLICT(id) DO UPDATE SET legal_name=EXCLUDED.legal_name,nit=EXCLUDED.nit,nit_normalized=EXCLUDED.nit_normalized,
 industry=EXCLUDED.industry,contact_name=EXCLUDED.contact_name,contact_position=EXCLUDED.contact_position,
 contact_email=EXCLUDED.contact_email,contact_phone=EXCLUDED.contact_phone,city=EXCLUDED.city,address=EXCLUDED.address,
 status=EXCLUDED.status,data_origin='SYNTHETIC';

INSERT INTO public.sites(id,code,name,city,kind,customer_id,data_origin)
VALUES ('00000000-0000-4000-8000-000000000201','HEALTH-DEMO','Sede DEMO del Centro de Salud','Sin confirmar','CLIENT_SITE','00000000-0000-4000-8000-000000000101','SYNTHETIC')
ON CONFLICT(id) DO UPDATE SET code=EXCLUDED.code,name=EXCLUDED.name,city=EXCLUDED.city,kind=EXCLUDED.kind,
 customer_id=EXCLUDED.customer_id,data_origin='SYNTHETIC';

INSERT INTO public.projects(id,code,name,description,customer_id,service_type,status,priority,responsible_location,start_date,estimated_end_date,estimated_budget,estimated_hours,progress_percentage,data_origin)
VALUES ('00000000-0000-4000-8000-000000000301','DEMO-MON-001','DEMO - Servicio gestionado de red','Proyecto sintético para el flujo académico de monitoreo.',
 '00000000-0000-4000-8000-000000000101','MANAGED_MONITORING','IN_PROGRESS','HIGH','REMOTE_SHARED','2026-10-01','2026-12-31',1500000,24,35,'SYNTHETIC')
ON CONFLICT(id) DO UPDATE SET code=EXCLUDED.code,name=EXCLUDED.name,description=EXCLUDED.description,
 customer_id=EXCLUDED.customer_id,service_type=EXCLUDED.service_type,status=EXCLUDED.status,priority=EXCLUDED.priority,
 responsible_location=EXCLUDED.responsible_location,start_date=EXCLUDED.start_date,estimated_end_date=EXCLUDED.estimated_end_date,
 estimated_budget=EXCLUDED.estimated_budget,estimated_hours=EXCLUDED.estimated_hours,progress_percentage=EXCLUDED.progress_percentage,
 data_origin='SYNTHETIC';

INSERT INTO public.service_contracts(id,customer_id,site_id,code,status,starts_on,ends_on,monthly_fee,data_origin,extra)
VALUES ('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000201',
 'DEMO-SVC-001','ACTIVE','2026-10-01','2026-12-31',1500000,'SYNTHETIC','{"demo":true}'::jsonb)
ON CONFLICT(id) DO UPDATE SET customer_id=EXCLUDED.customer_id,site_id=EXCLUDED.site_id,code=EXCLUDED.code,
 status=EXCLUDED.status,starts_on=EXCLUDED.starts_on,ends_on=EXCLUDED.ends_on,monthly_fee=EXCLUDED.monthly_fee,
 data_origin='SYNTHETIC',extra=EXCLUDED.extra;

INSERT INTO public.project_milestones(id,project_id,name,description,amount,status,closed_at,data_origin)
VALUES
 ('00000000-0000-4000-8000-000000000701','00000000-0000-4000-8000-000000000301','Línea base y colector','Hito sintético de configuración inicial.',500000,'INVOICED','2026-10-15','SYNTHETIC'),
 ('00000000-0000-4000-8000-000000000702','00000000-0000-4000-8000-000000000301','Syslog, NTP y SNMP en núcleo','Hito sintético de controles de núcleo.',750000,'INVOICED','2026-10-20','SYNTHETIC'),
 ('00000000-0000-4000-8000-000000000703','00000000-0000-4000-8000-000000000301','Cierre y documentación','Hito sintético de entrega documental.',250000,'INVOICED','2026-10-24','SYNTHETIC')
ON CONFLICT(id) DO UPDATE SET project_id=EXCLUDED.project_id,name=EXCLUDED.name,description=EXCLUDED.description,
 amount=EXCLUDED.amount,status=EXCLUDED.status,closed_at=EXCLUDED.closed_at,data_origin='SYNTHETIC';

