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
 '00000000-0000-4000-8000-000000000101','MANAGED_MONITORING','IN_PROGRESS','HIGH','REMOTE_SHARED','2026-01-01','2026-12-31',18000000,240,78,'SYNTHETIC')
ON CONFLICT(id) DO UPDATE SET code=EXCLUDED.code,name=EXCLUDED.name,description=EXCLUDED.description,
 customer_id=EXCLUDED.customer_id,service_type=EXCLUDED.service_type,status=EXCLUDED.status,priority=EXCLUDED.priority,
 responsible_location=EXCLUDED.responsible_location,start_date=EXCLUDED.start_date,estimated_end_date=EXCLUDED.estimated_end_date,
 estimated_budget=EXCLUDED.estimated_budget,estimated_hours=EXCLUDED.estimated_hours,progress_percentage=EXCLUDED.progress_percentage,
 data_origin='SYNTHETIC';

INSERT INTO public.service_contracts(id,customer_id,site_id,code,status,starts_on,ends_on,monthly_fee,data_origin,extra)
VALUES ('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000201',
 'DEMO-SVC-001','ACTIVE','2026-01-01','2026-12-31',1500000,'SYNTHETIC','{"demo":true}'::jsonb)
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

-- Clientes adicionales para demostrar el ciclo comercial/operativo con variedad de sectores.
-- Nombres, NIT de demostración y contactos son sintéticos; los correos usan el dominio reservado .invalid.
INSERT INTO public.clients(id,legal_name,nit,nit_normalized,industry,contact_name,contact_position,contact_email,contact_phone,city,address,status,data_origin)
VALUES
 ('00000000-0000-4000-8000-000000000103','DEMO - Salud Integral del Valle','DEMO-CL-0003','0003','DEMO - Salud','Mariana Ríos','Coordinadora TI','ti@salud-integral.demo.invalid','+57 300 000 0103','Medellín','Sede de demostración Medellín','ACTIVE','SYNTHETIC'),
 ('00000000-0000-4000-8000-000000000104','DEMO - Servicios Financieros Andinos','DEMO-CL-0004','0004','DEMO - Servicios financieros','Julián Torres','Director de Tecnología','tecnologia@financieros-andinos.demo.invalid','+57 300 000 0104','Bogotá','Sede de demostración Bogotá','ACTIVE','SYNTHETIC'),
 ('00000000-0000-4000-8000-000000000105','DEMO - Universidad Metropolitana','DEMO-CL-0005','0005','DEMO - Educación','Camila Pardo','Líder de Infraestructura','infraestructura@universidad-metropolitana.demo.invalid','+57 300 000 0105','Medellín','Campus de demostración Medellín','ACTIVE','SYNTHETIC'),
 ('00000000-0000-4000-8000-000000000106','DEMO - Logística Cordillera','DEMO-CL-0006','0006','DEMO - Logística','Andrés Mejía','Jefe de Operaciones','operaciones@logistica-cordillera.demo.invalid','+57 300 000 0106','Bogotá','Centro de demostración Bogotá','ACTIVE','SYNTHETIC')
ON CONFLICT(id) DO UPDATE SET legal_name=EXCLUDED.legal_name,nit=EXCLUDED.nit,nit_normalized=EXCLUDED.nit_normalized,
 industry=EXCLUDED.industry,contact_name=EXCLUDED.contact_name,contact_position=EXCLUDED.contact_position,
 contact_email=EXCLUDED.contact_email,contact_phone=EXCLUDED.contact_phone,city=EXCLUDED.city,address=EXCLUDED.address,
 status=EXCLUDED.status,data_origin='SYNTHETIC';

INSERT INTO public.sites(id,code,name,city,kind,customer_id,data_origin)
VALUES
 ('00000000-0000-4000-8000-000000000202','SALUD-VALLE-DEMO','Sede de demostración Salud Integral','Medellín','CLIENT_SITE','00000000-0000-4000-8000-000000000103','SYNTHETIC'),
 ('00000000-0000-4000-8000-000000000203','FIN-ANDINOS-DEMO','Sede de demostración Servicios Financieros','Bogotá','CLIENT_SITE','00000000-0000-4000-8000-000000000104','SYNTHETIC'),
 ('00000000-0000-4000-8000-000000000204','UNIV-METRO-DEMO','Campus de demostración Universidad Metropolitana','Medellín','CLIENT_SITE','00000000-0000-4000-8000-000000000105','SYNTHETIC'),
 ('00000000-0000-4000-8000-000000000205','LOG-CORDILLERA-DEMO','Centro de demostración Logística Cordillera','Bogotá','CLIENT_SITE','00000000-0000-4000-8000-000000000106','SYNTHETIC')
ON CONFLICT(id) DO UPDATE SET code=EXCLUDED.code,name=EXCLUDED.name,city=EXCLUDED.city,kind=EXCLUDED.kind,
 customer_id=EXCLUDED.customer_id,data_origin='SYNTHETIC';

INSERT INTO public.projects(id,code,name,description,customer_id,service_type,status,priority,responsible_location,start_date,estimated_end_date,estimated_budget,estimated_hours,progress_percentage,data_origin)
VALUES
 ('00000000-0000-4000-8000-000000000302','DEMO-SAL-2026','Monitoreo de infraestructura clínica','Operación administrada de red, respaldos de configuración y atención de eventos.', '00000000-0000-4000-8000-000000000103','MANAGED_MONITORING','IN_PROGRESS','HIGH','MEDELLIN','2026-01-15','2026-12-31',38400000,480,72,'SYNTHETIC'),
 ('00000000-0000-4000-8000-000000000303','DEMO-FIN-2026','Seguridad y continuidad financiera','Administración de firewalls, revisión de exposición y continuidad de enlaces.', '00000000-0000-4000-8000-000000000104','CYBERSECURITY','IN_PROGRESS','HIGH','BOGOTA','2026-02-01','2026-12-31',46200000,520,64,'SYNTHETIC'),
 ('00000000-0000-4000-8000-000000000304','DEMO-UNI-2026','Operación de campus conectado','Soporte de switching, Wi-Fi y segmentación para servicios institucionales.', '00000000-0000-4000-8000-000000000105','INFRASTRUCTURE_SUPPORT','IN_PROGRESS','MEDIUM','MEDELLIN','2026-03-01','2026-12-31',27600000,360,58,'SYNTHETIC'),
 ('00000000-0000-4000-8000-000000000305','DEMO-LOG-2026','Disponibilidad de centros logísticos','Monitoreo y soporte de conectividad para operación logística multi-sede.', '00000000-0000-4000-8000-000000000106','MANAGED_MONITORING','IN_PROGRESS','HIGH','REMOTE_SHARED','2026-04-01','2026-12-31',33000000,420,49,'SYNTHETIC')
ON CONFLICT(id) DO UPDATE SET code=EXCLUDED.code,name=EXCLUDED.name,description=EXCLUDED.description,
 customer_id=EXCLUDED.customer_id,service_type=EXCLUDED.service_type,status=EXCLUDED.status,priority=EXCLUDED.priority,
 responsible_location=EXCLUDED.responsible_location,start_date=EXCLUDED.start_date,estimated_end_date=EXCLUDED.estimated_end_date,
 estimated_budget=EXCLUDED.estimated_budget,estimated_hours=EXCLUDED.estimated_hours,
 progress_percentage=EXCLUDED.progress_percentage,data_origin='SYNTHETIC';

INSERT INTO public.service_contracts(id,customer_id,site_id,code,status,starts_on,ends_on,monthly_fee,data_origin,extra)
VALUES
 ('00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000202','DEMO-SVC-002','ACTIVE','2026-01-15','2026-12-31',3200000,'SYNTHETIC','{"demo":true}'::jsonb),
 ('00000000-0000-4000-8000-000000000403','00000000-0000-4000-8000-000000000104','00000000-0000-4000-8000-000000000203','DEMO-SVC-003','ACTIVE','2026-02-01','2026-12-31',3850000,'SYNTHETIC','{"demo":true}'::jsonb),
 ('00000000-0000-4000-8000-000000000404','00000000-0000-4000-8000-000000000105','00000000-0000-4000-8000-000000000204','DEMO-SVC-004','ACTIVE','2026-03-01','2026-12-31',2300000,'SYNTHETIC','{"demo":true}'::jsonb),
 ('00000000-0000-4000-8000-000000000405','00000000-0000-4000-8000-000000000106','00000000-0000-4000-8000-000000000205','DEMO-SVC-005','ACTIVE','2026-04-01','2026-12-31',2750000,'SYNTHETIC','{"demo":true}'::jsonb)
ON CONFLICT(id) DO UPDATE SET customer_id=EXCLUDED.customer_id,site_id=EXCLUDED.site_id,code=EXCLUDED.code,
 status=EXCLUDED.status,starts_on=EXCLUDED.starts_on,ends_on=EXCLUDED.ends_on,monthly_fee=EXCLUDED.monthly_fee,
 data_origin='SYNTHETIC',extra=EXCLUDED.extra;

-- Hitos mensuales que alimentan facturación/cartera desde enero hasta octubre de 2026.
INSERT INTO public.project_milestones(id,project_id,name,description,amount,status,closed_at,data_origin)
SELECT ('00000000-0000-4000-8000-' || lpad((1100 + (p.ordinal-1)*20 + m.month_no)::text,12,'0'))::uuid,
       p.project_id,
       'Servicio gestionado 2026-' || lpad(m.month_no::text,2,'0'),
       'Mensualidad sintética para operación y soporte de servicios de red.',
       p.monthly_fee,
       'INVOICED',
       CASE WHEN m.month_no=10 THEN DATE '2026-10-26' ELSE (make_date(2026,m.month_no,1) + interval '1 month - 1 day')::date END,
       'SYNTHETIC'
FROM (VALUES
 ('00000000-0000-4000-8000-000000000301'::uuid,1,1500000::numeric),
 ('00000000-0000-4000-8000-000000000302'::uuid,2,3200000::numeric),
 ('00000000-0000-4000-8000-000000000303'::uuid,3,3850000::numeric),
 ('00000000-0000-4000-8000-000000000304'::uuid,4,2300000::numeric),
 ('00000000-0000-4000-8000-000000000305'::uuid,5,2750000::numeric)
) AS p(project_id,ordinal,monthly_fee)
CROSS JOIN generate_series(1,10) AS m(month_no)
ON CONFLICT(id) DO UPDATE SET project_id=EXCLUDED.project_id,name=EXCLUDED.name,
 description=EXCLUDED.description,amount=EXCLUDED.amount,status=EXCLUDED.status,
 closed_at=EXCLUDED.closed_at,data_origin='SYNTHETIC';

