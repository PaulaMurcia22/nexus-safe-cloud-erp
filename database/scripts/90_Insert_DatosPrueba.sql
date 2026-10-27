-- Datos deterministas, explícitamente sintéticos. Usuarios/hash y datos operativos se crean con seed-demo.ts.
INSERT INTO public.clients(id,legal_name,nit,nit_normalized,industry,contact_name,contact_position,contact_email,contact_phone,city,address,status,data_origin)
VALUES
 ('00000000-0000-4000-8000-000000000101','Centro Médico del Valle','901234567-3','9012345673','Salud','Laura Giraldo','Directora de Tecnología','laura.giraldo@centromedicovalle.example.com',NULL,'Medellín',NULL,'ACTIVE','SYNTHETIC'),
 ('00000000-0000-4000-8000-000000000102','Red de Servicios Integrados','900876543-2','9008765432','Tecnología','Felipe Ramírez','Gerente de Operaciones','felipe.ramirez@serviciosintegrados.example.com',NULL,'Bogotá',NULL,'ACTIVE','SYNTHETIC')
ON CONFLICT(id) DO UPDATE SET legal_name=EXCLUDED.legal_name,nit=EXCLUDED.nit,nit_normalized=EXCLUDED.nit_normalized,
 industry=EXCLUDED.industry,contact_name=EXCLUDED.contact_name,contact_position=EXCLUDED.contact_position,
 contact_email=EXCLUDED.contact_email,contact_phone=EXCLUDED.contact_phone,city=EXCLUDED.city,address=EXCLUDED.address,
 status=EXCLUDED.status,data_origin='SYNTHETIC';

INSERT INTO public.sites(id,code,name,city,kind,customer_id,data_origin)
VALUES ('00000000-0000-4000-8000-000000000201','CMV-MED-01','Sede principal Centro Médico del Valle','Medellín','CLIENT_SITE','00000000-0000-4000-8000-000000000101','SYNTHETIC')
ON CONFLICT(id) DO UPDATE SET code=EXCLUDED.code,name=EXCLUDED.name,city=EXCLUDED.city,kind=EXCLUDED.kind,
 customer_id=EXCLUDED.customer_id,data_origin='SYNTHETIC';

INSERT INTO public.projects(id,code,name,description,customer_id,service_type,status,priority,responsible_location,start_date,estimated_end_date,estimated_budget,estimated_hours,progress_percentage,data_origin)
VALUES ('00000000-0000-4000-8000-000000000301','NXS-ONB-001','Implementación Nexus Network Monitor','Configuración inicial del tenant, topología y alertas de infraestructura.',
 '00000000-0000-4000-8000-000000000101','MANAGED_MONITORING','IN_PROGRESS','HIGH','REMOTE_SHARED',date_trunc('year',CURRENT_DATE)::date,(date_trunc('year',CURRENT_DATE)+interval '1 year - 1 day')::date,18000000,240,78,'SYNTHETIC')
ON CONFLICT(id) DO UPDATE SET code=EXCLUDED.code,name=EXCLUDED.name,description=EXCLUDED.description,
 customer_id=EXCLUDED.customer_id,service_type=EXCLUDED.service_type,status=EXCLUDED.status,priority=EXCLUDED.priority,
 responsible_location=EXCLUDED.responsible_location,start_date=EXCLUDED.start_date,estimated_end_date=EXCLUDED.estimated_end_date,
 estimated_budget=EXCLUDED.estimated_budget,estimated_hours=EXCLUDED.estimated_hours,progress_percentage=EXCLUDED.progress_percentage,
 data_origin='SYNTHETIC';

INSERT INTO public.service_contracts(id,customer_id,site_id,code,status,starts_on,ends_on,monthly_fee,data_origin,extra)
VALUES ('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000201',
 'NXS-SVC-001','ACTIVE',date_trunc('year',CURRENT_DATE)::date,(date_trunc('year',CURRENT_DATE)+interval '1 year - 1 day')::date,1500000,'SYNTHETIC','{"product":"Nexus Network Monitor"}'::jsonb)
ON CONFLICT(id) DO UPDATE SET customer_id=EXCLUDED.customer_id,site_id=EXCLUDED.site_id,code=EXCLUDED.code,
 status=EXCLUDED.status,starts_on=EXCLUDED.starts_on,ends_on=EXCLUDED.ends_on,monthly_fee=EXCLUDED.monthly_fee,
 data_origin='SYNTHETIC',extra=EXCLUDED.extra;

INSERT INTO public.project_milestones(id,project_id,name,description,amount,status,closed_at,data_origin)
VALUES
 ('00000000-0000-4000-8000-000000000701','00000000-0000-4000-8000-000000000301','Línea base y colector','Configuración inicial de fuentes de telemetría.',500000,'INVOICED',CURRENT_DATE-12,'SYNTHETIC'),
 ('00000000-0000-4000-8000-000000000702','00000000-0000-4000-8000-000000000301','Syslog, NTP y SNMP en núcleo','Integración de señales de infraestructura.',750000,'INVOICED',CURRENT_DATE-7,'SYNTHETIC'),
 ('00000000-0000-4000-8000-000000000703','00000000-0000-4000-8000-000000000301','Cierre y documentación','Entrega de documentación operativa.',250000,'INVOICED',CURRENT_DATE-3,'SYNTHETIC')
ON CONFLICT(id) DO UPDATE SET project_id=EXCLUDED.project_id,name=EXCLUDED.name,description=EXCLUDED.description,
 amount=EXCLUDED.amount,status=EXCLUDED.status,closed_at=EXCLUDED.closed_at,data_origin='SYNTHETIC';

-- Clientes adicionales para demostrar el ciclo comercial/operativo con variedad de sectores.
-- Nombres y NIT de ejemplo; los correos usan example.com, un dominio reservado para documentación.
INSERT INTO public.clients(id,legal_name,nit,nit_normalized,industry,contact_name,contact_position,contact_email,contact_phone,city,address,status,data_origin)
VALUES
 ('00000000-0000-4000-8000-000000000103','Salud Integral del Valle','901345678-0','9013456780','Salud','Mariana Ríos','Coordinadora TI','ti@salud-integral.example.com','+57 300 555 0103','Medellín','Sede principal','ACTIVE','SYNTHETIC'),
 ('00000000-0000-4000-8000-000000000104','Servicios Financieros Andinos','901456789-7','9014567897','Servicios financieros','Julián Torres','Director de Tecnología','tecnologia@financieros-andinos.example.com','+57 300 555 0104','Bogotá','Sede administrativa','ACTIVE','SYNTHETIC'),
 ('00000000-0000-4000-8000-000000000105','Universidad Metropolitana','901567890-3','9015678903','Educación','Camila Pardo','Líder de Infraestructura','infraestructura@universidad-metropolitana.example.com','+57 300 555 0105','Medellín','Campus principal','ACTIVE','SYNTHETIC'),
 ('00000000-0000-4000-8000-000000000106','Logística Cordillera','901678901-0','9016789010','Logística','Andrés Mejía','Jefe de Operaciones','operaciones@logistica-cordillera.example.com','+57 300 555 0106','Bogotá','Centro de distribución','ACTIVE','SYNTHETIC')
ON CONFLICT(id) DO UPDATE SET legal_name=EXCLUDED.legal_name,nit=EXCLUDED.nit,nit_normalized=EXCLUDED.nit_normalized,
 industry=EXCLUDED.industry,contact_name=EXCLUDED.contact_name,contact_position=EXCLUDED.contact_position,
 contact_email=EXCLUDED.contact_email,contact_phone=EXCLUDED.contact_phone,city=EXCLUDED.city,address=EXCLUDED.address,
 status=EXCLUDED.status,data_origin='SYNTHETIC';

INSERT INTO public.sites(id,code,name,city,kind,customer_id,data_origin)
VALUES
 ('00000000-0000-4000-8000-000000000202','SALUD-VALLE','Sede principal Salud Integral','Medellín','CLIENT_SITE','00000000-0000-4000-8000-000000000103','SYNTHETIC'),
 ('00000000-0000-4000-8000-000000000203','FIN-ANDINOS','Sede administrativa Servicios Financieros','Bogotá','CLIENT_SITE','00000000-0000-4000-8000-000000000104','SYNTHETIC'),
 ('00000000-0000-4000-8000-000000000204','UNIV-METRO','Campus principal Universidad Metropolitana','Medellín','CLIENT_SITE','00000000-0000-4000-8000-000000000105','SYNTHETIC'),
 ('00000000-0000-4000-8000-000000000205','LOG-CORDILLERA','Centro de distribución Logística Cordillera','Bogotá','CLIENT_SITE','00000000-0000-4000-8000-000000000106','SYNTHETIC')
ON CONFLICT(id) DO UPDATE SET code=EXCLUDED.code,name=EXCLUDED.name,city=EXCLUDED.city,kind=EXCLUDED.kind,
 customer_id=EXCLUDED.customer_id,data_origin='SYNTHETIC';

INSERT INTO public.projects(id,code,name,description,customer_id,service_type,status,priority,responsible_location,start_date,estimated_end_date,estimated_budget,estimated_hours,progress_percentage,data_origin)
VALUES
 ('00000000-0000-4000-8000-000000000302','NXS-SAL-2026','Monitoreo de infraestructura clínica','Puesta en marcha del producto y configuración de fuentes de datos.', '00000000-0000-4000-8000-000000000103','MANAGED_MONITORING','IN_PROGRESS','HIGH','MEDELLIN',(date_trunc('year',CURRENT_DATE)::date+14),(date_trunc('year',CURRENT_DATE)+interval '1 year - 1 day')::date,38400000,480,72,'SYNTHETIC'),
 ('00000000-0000-4000-8000-000000000303','NXS-FIN-2026','Seguridad y continuidad financiera','Configuración de alertas, integraciones y políticas de acceso.', '00000000-0000-4000-8000-000000000104','CYBERSECURITY','IN_PROGRESS','HIGH','BOGOTA',(date_trunc('year',CURRENT_DATE)::date+31),(date_trunc('year',CURRENT_DATE)+interval '1 year - 1 day')::date,46200000,520,64,'SYNTHETIC'),
 ('00000000-0000-4000-8000-000000000304','NXS-UNI-2026','Operación de campus conectado','Integración de switching, Wi-Fi y segmentación al panel SaaS.', '00000000-0000-4000-8000-000000000105','INFRASTRUCTURE_SUPPORT','IN_PROGRESS','MEDIUM','MEDELLIN',(date_trunc('year',CURRENT_DATE)::date+59),(date_trunc('year',CURRENT_DATE)+interval '1 year - 1 day')::date,27600000,360,58,'SYNTHETIC'),
 ('00000000-0000-4000-8000-000000000305','NXS-LOG-2026','Disponibilidad de centros logísticos','Despliegue de monitoreo y conectividad para operación multisede.', '00000000-0000-4000-8000-000000000106','MANAGED_MONITORING','IN_PROGRESS','HIGH','REMOTE_SHARED',(date_trunc('year',CURRENT_DATE)::date+90),(date_trunc('year',CURRENT_DATE)+interval '1 year - 1 day')::date,33000000,420,49,'SYNTHETIC')
ON CONFLICT(id) DO UPDATE SET code=EXCLUDED.code,name=EXCLUDED.name,description=EXCLUDED.description,
 customer_id=EXCLUDED.customer_id,service_type=EXCLUDED.service_type,status=EXCLUDED.status,priority=EXCLUDED.priority,
 responsible_location=EXCLUDED.responsible_location,start_date=EXCLUDED.start_date,estimated_end_date=EXCLUDED.estimated_end_date,
 estimated_budget=EXCLUDED.estimated_budget,estimated_hours=EXCLUDED.estimated_hours,
 progress_percentage=EXCLUDED.progress_percentage,data_origin='SYNTHETIC';

INSERT INTO public.service_contracts(id,customer_id,site_id,code,status,starts_on,ends_on,monthly_fee,data_origin,extra)
VALUES
 ('00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000202','NXS-SVC-002','ACTIVE',(date_trunc('year',CURRENT_DATE)::date+14),(date_trunc('year',CURRENT_DATE)+interval '1 year - 1 day')::date,3200000,'SYNTHETIC','{"product":"Nexus Network Monitor"}'::jsonb),
 ('00000000-0000-4000-8000-000000000403','00000000-0000-4000-8000-000000000104','00000000-0000-4000-8000-000000000203','NXS-SVC-003','ACTIVE',(date_trunc('year',CURRENT_DATE)::date+31),(date_trunc('year',CURRENT_DATE)+interval '1 year - 1 day')::date,3850000,'SYNTHETIC','{"product":"Nexus Network Monitor"}'::jsonb),
 ('00000000-0000-4000-8000-000000000404','00000000-0000-4000-8000-000000000105','00000000-0000-4000-8000-000000000204','NXS-SVC-004','ACTIVE',(date_trunc('year',CURRENT_DATE)::date+59),(date_trunc('year',CURRENT_DATE)+interval '1 year - 1 day')::date,2300000,'SYNTHETIC','{"product":"Nexus Network Monitor"}'::jsonb),
 ('00000000-0000-4000-8000-000000000405','00000000-0000-4000-8000-000000000106','00000000-0000-4000-8000-000000000205','NXS-SVC-005','ACTIVE',(date_trunc('year',CURRENT_DATE)::date+90),(date_trunc('year',CURRENT_DATE)+interval '1 year - 1 day')::date,2750000,'SYNTHETIC','{"product":"Nexus Network Monitor"}'::jsonb)
ON CONFLICT(id) DO UPDATE SET customer_id=EXCLUDED.customer_id,site_id=EXCLUDED.site_id,code=EXCLUDED.code,
 status=EXCLUDED.status,starts_on=EXCLUDED.starts_on,ends_on=EXCLUDED.ends_on,monthly_fee=EXCLUDED.monthly_fee,
 data_origin='SYNTHETIC',extra=EXCLUDED.extra;

-- Hitos mensuales que alimentan facturación y cartera desde enero hasta el mes actual.
INSERT INTO public.project_milestones(id,project_id,name,description,amount,status,closed_at,data_origin)
SELECT ('00000000-0000-4000-8000-' || lpad((1100 + (p.ordinal-1)*20 + m.month_no)::text,12,'0'))::uuid,
       p.project_id,
       'Servicio gestionado ' || to_char(make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int,m.month_no,1),'YYYY-MM'),
       'Suscripción mensual al servicio de observabilidad y operación de red.',
       p.monthly_fee,
       'INVOICED',
       CASE WHEN m.month_no=EXTRACT(MONTH FROM CURRENT_DATE)::int THEN CURRENT_DATE ELSE (make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int,m.month_no,1) + interval '1 month - 1 day')::date END,
       'SYNTHETIC'
FROM (VALUES
 ('00000000-0000-4000-8000-000000000301'::uuid,1,1500000::numeric),
 ('00000000-0000-4000-8000-000000000302'::uuid,2,3200000::numeric),
 ('00000000-0000-4000-8000-000000000303'::uuid,3,3850000::numeric),
 ('00000000-0000-4000-8000-000000000304'::uuid,4,2300000::numeric),
 ('00000000-0000-4000-8000-000000000305'::uuid,5,2750000::numeric)
) AS p(project_id,ordinal,monthly_fee)
CROSS JOIN generate_series(1,EXTRACT(MONTH FROM CURRENT_DATE)::int) AS m(month_no)
ON CONFLICT(id) DO UPDATE SET project_id=EXCLUDED.project_id,name=EXCLUDED.name,
 description=EXCLUDED.description,amount=EXCLUDED.amount,status=EXCLUDED.status,
 closed_at=EXCLUDED.closed_at,data_origin='SYNTHETIC';

