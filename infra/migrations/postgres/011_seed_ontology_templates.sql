-- DAEMON Ontology Studio — Seed Templates
-- Phase 1: Pre-built pack templates for the template gallery
-- Each template mirrors an existing pack from ontology/v2/examples/packs/

INSERT INTO ontology_templates (id, name, display_name, description, category, tags, visibility, snapshot, created_at, updated_at) VALUES
(
  'tpl-logistics-express-cargo',
  'logistics-express-cargo',
  'Express Cargo',
  'Parcel tracking, SLA monitoring, route optimization for DHL-style express cargo operations',
  'logistics',
  ARRAY['cargo', 'express', 'sla', 'tracking', 'parcel'],
  'public',
  '{"objectTypes":[{"apiName":"Shipment","displayName":"Shipment","primaryKey":"shipment_id","titleProperty":"tracking_number","properties":[{"name":"shipment_id","type":"string","required":true}]},{"apiName":"CustomerAccount","displayName":"Customer Account","primaryKey":"account_id","titleProperty":"name","properties":[{"name":"account_id","type":"string","required":true}]}],"linkTypes":[],"actionTypes":[]}',
  NOW(), NOW()
),
(
  'tpl-logistics-nvocc',
  'logistics-nvocc',
  'Maritime NVOC',
  'Non-vessel operating carrier operations: container tracking, bill of lading, port calls',
  'logistics',
  ARRAY['maritime', 'nvocc', 'container', 'shipping', 'port'],
  'public',
  '{"objectTypes":[{"apiName":"Container","displayName":"Container","primaryKey":"container_id","titleProperty":"container_number","properties":[{"name":"container_id","type":"string","required":true}]},{"apiName":"Vessel","displayName":"Vessel","primaryKey":"vessel_imo","titleProperty":"vessel_name","properties":[{"name":"vessel_imo","type":"string","required":true}]}],"linkTypes":[],"actionTypes":[]}',
  NOW(), NOW()
),
(
  'tpl-aml-fintech',
  'aml-fintech',
  'AML Fintech',
  'Anti-money laundering: transaction monitoring, customer risk scoring, suspicious activity detection',
  'finance',
  ARRAY['aml', 'fintech', 'compliance', 'transaction', 'kyc'],
  'public',
  '{"objectTypes":[{"apiName":"Transaction","displayName":"Transaction","primaryKey":"txn_id","titleProperty":"txn_id","properties":[{"name":"txn_id","type":"string","required":true}]},{"apiName":"Account","displayName":"Account","primaryKey":"account_id","titleProperty":"account_number","properties":[{"name":"account_id","type":"string","required":true}]},{"apiName":"Customer","displayName":"Customer","primaryKey":"customer_id","titleProperty":"name","properties":[{"name":"customer_id","type":"string","required":true}]}],"linkTypes":[],"actionTypes":[]}',
  NOW(), NOW()
),
(
  'tpl-healthcare-ops',
  'healthcare-ops',
  'Healthcare Ops',
  'Healthcare operations: patient tracking, resource allocation, incident management',
  'healthcare',
  ARRAY['healthcare', 'patient', 'hospital', 'clinical'],
  'public',
  '{"objectTypes":[{"apiName":"Patient","displayName":"Patient","primaryKey":"patient_id","titleProperty":"name","properties":[{"name":"patient_id","type":"string","required":true}]}],"linkTypes":[],"actionTypes":[]}',
  NOW(), NOW()
),
(
  'tpl-government-ops',
  'government-ops',
  'Government Ops',
  'Government operations: case management, citizen services, regulatory compliance',
  'government',
  ARRAY['government', 'ops', 'citizen', 'case-management'],
  'public',
  '{"objectTypes":[{"apiName":"Case","displayName":"Case","primaryKey":"case_id","titleProperty":"title","properties":[{"name":"case_id","type":"string","required":true}]}],"linkTypes":[],"actionTypes":[]}',
  NOW(), NOW()
),
(
  'tpl-web3-intel',
  'web3-intel',
  'Web3 Intel',
  'Blockchain intelligence: wallet monitoring, transaction tracing, DeFi risk assessment',
  'web3',
  ARRAY['web3', 'crypto', 'blockchain', 'defi', 'wallet'],
  'public',
  '{"objectTypes":[{"apiName":"Wallet","displayName":"Wallet","primaryKey":"address","titleProperty":"address","properties":[{"name":"address","type":"string","required":true}]}],"linkTypes":[],"actionTypes":[]}',
  NOW(), NOW()
),
(
  'tpl-agri-food',
  'agri-food',
  'Agri Food',
  'Agriculture and food supply chain: farm-to-table tracking, cold chain, quality control',
  'agriculture',
  ARRAY['agriculture', 'food', 'supply-chain', 'cold-chain'],
  'public',
  '{"objectTypes":[{"apiName":"FarmProduct","displayName":"Farm Product","primaryKey":"product_id","titleProperty":"name","properties":[{"name":"product_id","type":"string","required":true}]}],"linkTypes":[],"actionTypes":[]}',
  NOW(), NOW()
),
(
  'tpl-banking-core',
  'banking-core',
  'Banking Core',
  'Core banking operations: account management, reconciliation, audit trails',
  'finance',
  ARRAY['banking', 'finance', 'reconciliation', 'audit'],
  'public',
  '{"objectTypes":[{"apiName":"BankAccount","displayName":"Bank Account","primaryKey":"account_number","titleProperty":"account_number","properties":[{"name":"account_number","type":"string","required":true}]}],"linkTypes":[],"actionTypes":[]}',
  NOW(), NOW()
),
(
  'tpl-defense-maritime',
  'defense-maritime',
  'Maritime Domain Awareness',
  'Defense MDA: vessel tracking, EEZ monitoring, dark ship detection, threat assessment',
  'defense',
  ARRAY['defense', 'maritime', 'mda', 'navy', 'coast-guard', 'ais'],
  'public',
  '{"objectTypes":[{"apiName":"Vessel","displayName":"Vessel","primaryKey":"mmsi","titleProperty":"vessel_name","properties":[{"name":"mmsi","type":"string","required":true},{"name":"vessel_name","type":"string","required":true},{"name":"flag_state","type":"string"},{"name":"vessel_type","type":"enum","required":false,"config":{"values":["CARGO","TANKER","FISHING","MILITARY","PLEASURE","OTHER"]}},{"name":"current_position","type":"geo_point"},{"name":"last_ais_update","type":"timestamp"}]},{"apiName":"ThreatAssessment","displayName":"Threat Assessment","primaryKey":"assessment_id","titleProperty":"title","properties":[{"name":"assessment_id","type":"string","required":true},{"name":"threat_level","type":"enum","required":true,"config":{"values":["LOW","MEDIUM","HIGH","CRITICAL"]}}]}],"linkTypes":[{"apiName":"VesselThreat","fromObjectType":"Vessel","toObjectType":"ThreatAssessment","cardinality":"ONE_TO_MANY"}],"actionTypes":[{"apiName":"FlagDarkShip","displayName":"Flag Dark Ship","targetObjectType":"Vessel","requiresApproval":true,"parameters":[{"name":"reason","type":"string","required":true}]},{"apiName":"EscalateThreat","displayName":"Escalate Threat","targetObjectType":"ThreatAssessment","requiresApproval":true,"parameters":[{"name":"new_level","type":"enum","required":true,"config":{"values":["LOW","MEDIUM","HIGH","CRITICAL"]}}]}]}',
  NOW(), NOW()
),
(
  'tpl-defense-logistics',
  'defense-logistics',
  'Military Logistics C2',
  'Military logistics command & control: supply classes, unit tracking, mission readiness',
  'defense',
  ARRAY['defense', 'logistics', 'military', 'supply-chain', 'c2'],
  'public',
  '{"objectTypes":[{"apiName":"SupplyItem","displayName":"Supply Item","primaryKey":"nato_stock_number","titleProperty":"item_name","properties":[{"name":"nato_stock_number","type":"string","required":true},{"name":"item_name","type":"string","required":true},{"name":"supply_class","type":"enum","required":true,"config":{"values":["I","II","III","IV","V","VI","VII","VIII","IX","X"]}},{"name":"quantity_on_hand","type":"number"}]},{"apiName":"Unit","displayName":"Unit","primaryKey":"unit_code","titleProperty":"unit_name","properties":[{"name":"unit_code","type":"string","required":true},{"name":"unit_name","type":"string","required":true},{"name":"location","type":"geo_point"},{"name":"readiness_status","type":"enum","required":true,"config":{"values":["GREEN","AMBER","RED"]}}]}],"linkTypes":[{"apiName":"UnitSupply","fromObjectType":"Unit","toObjectType":"SupplyItem","cardinality":"MANY_TO_MANY"}],"actionTypes":[{"apiName":"RequestSupply","displayName":"Request Supply","targetObjectType":"SupplyItem","requiresApproval":true,"parameters":[{"name":"quantity","type":"number","required":true},{"name":"priority","type":"enum","required":true,"config":{"values":["ROUTINE","PRIORITY","CRITICAL"]}}]}]}',
  NOW(), NOW()
),
(
  'tpl-commerce-trade-finance',
  'commerce-trade-finance',
  'Trade Finance',
  'Trade finance operations: letter of credit, document checking, compliance screening',
  'finance',
  ARRAY['trade', 'finance', 'lc', 'compliance', 'document'],
  'public',
  '{"objectTypes":[{"apiName":"LetterOfCredit","displayName":"Letter of Credit","primaryKey":"lc_number","titleProperty":"lc_number","properties":[{"name":"lc_number","type":"string","required":true},{"name":"amount","type":"number","required":true},{"name":"currency","type":"enum","required":true,"config":{"values":["USD","EUR","GBP","JPY","CNY","SGD"]}},{"name":"expiry_date","type":"date"}]}],"linkTypes":[],"actionTypes":[]}',
  NOW(), NOW()
),
(
  'tpl-energy-utilities',
  'energy-utilities',
  'Energy Utilities',
  'Energy and utilities operations: grid monitoring, asset management, outage response',
  'energy',
  ARRAY['energy', 'utilities', 'grid', 'asset'],
  'public',
  '{"objectTypes":[{"apiName":"GridAsset","displayName":"Grid Asset","primaryKey":"asset_id","titleProperty":"asset_name","properties":[{"name":"asset_id","type":"string","required":true}]}],"linkTypes":[],"actionTypes":[]}',
  NOW(), NOW()
)
ON CONFLICT (name) DO NOTHING;
