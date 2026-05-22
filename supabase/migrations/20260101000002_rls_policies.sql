-- Tenant isolation via JWT claims (custom access token hook injects tenant_id).

CREATE OR REPLACE FUNCTION public.jwt_tenant_id() RETURNS text AS $$
  SELECT COALESCE(auth.jwt() ->> 'tenant_id', '');
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE POLICY tenant_isolation_users ON users
  FOR ALL USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY tenant_isolation_cases ON cases
  FOR ALL USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY tenant_isolation_case_signals ON case_signals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.case_id = case_signals.case_id
        AND c.tenant_id = public.jwt_tenant_id()
    )
  );

CREATE POLICY tenant_isolation_ontology_objects ON ontology_objects
  FOR ALL USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY tenant_isolation_ingestion_jobs ON ingestion_jobs
  FOR ALL USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY tenant_isolation_lineage_events ON lineage_events
  FOR ALL USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY tenant_isolation_rule_runs ON rule_runs
  FOR ALL USING (tenant_id = public.jwt_tenant_id());

CREATE POLICY tenant_isolation_audit_log ON audit_log
  FOR ALL USING (tenant_id = public.jwt_tenant_id());

-- Tenants: readable when JWT tenant matches (bootstrap row visibility).
CREATE POLICY tenant_read_tenants ON tenants
  FOR SELECT USING (tenant_id = public.jwt_tenant_id());
