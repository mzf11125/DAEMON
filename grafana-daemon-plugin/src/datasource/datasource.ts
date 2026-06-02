import { DataSourceInstanceSettings, CoreApp, ScopedVars } from "@grafana/data";
import { DataSourceWithBackend, getTemplateSrv } from "@grafana/runtime";
import { DaemonDataSourceOptions, DaemonQuery } from "./types";

export class DaemonDataSource extends DataSourceWithBackend<
  DaemonQuery,
  DaemonDataSourceOptions
> {
  apiUrl: string;
  tenantId: string;
  authToken: string;

  constructor(
    instanceSettings: DataSourceInstanceSettings<DaemonDataSourceOptions>,
  ) {
    super(instanceSettings);
    this.apiUrl = instanceSettings.jsonData.apiUrl ?? "";
    this.tenantId = instanceSettings.jsonData.tenantId ?? "";
    this.authToken = instanceSettings.jsonData.authToken ?? "";
  }

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }
    if (this.tenantId) {
      headers["X-Tenant-Id"] = this.tenantId;
    }
    return headers;
  }

  async query(options: any) {
    const targets: DaemonQuery[] = options.targets;
    const results: any[] = [];

    for (const target of targets.filter((t: DaemonQuery) => !t.hide)) {
      const result = await this.executeQuery(target);
      results.push(result);
    }

    return { data: results };
  }

  async executeQuery(query: DaemonQuery): Promise<any> {
    switch (query.queryType) {
      case "listSignals":
        return this.fetchSignals(query);
      case "listCases":
        return this.fetchCases(query);
      case "listObjects":
        return this.fetchObjects(query);
      case "auditEvents":
        return this.fetchAuditEvents(query);
      case "geoMap":
        return this.fetchGeoMap(query);
      case "caseDetail":
        return this.fetchCaseDetail(query);
      case "metricQuery":
        return this.fetchMetric(query);
      default:
        throw new Error(`Unknown query type: ${query.queryType}`);
    }
  }

  async fetchSignals(query: DaemonQuery) {
    const params = new URLSearchParams();
    if (query.limit) params.set("limit", String(query.limit));
    return this.request(`/v1/objects/Signal?${params.toString()}`);
  }

  async fetchCases(query: DaemonQuery) {
    const params = new URLSearchParams();
    if (query.limit) params.set("limit", String(query.limit));
    return this.request(`/v1/cases?${params.toString()}`);
  }

  async fetchObjects(query: DaemonQuery) {
    const params = new URLSearchParams();
    if (query.limit) params.set("limit", String(query.limit));
    const type = query.objectType ?? "Signal";
    return this.request(`/v1/objects/${type}?${params.toString()}`);
  }

  async fetchAuditEvents(query: DaemonQuery) {
    const params = new URLSearchParams();
    if (query.limit) params.set("limit", String(query.limit));
    return this.request(`/v1/audit/events?${params.toString()}`);
  }

  async fetchGeoMap(_query: DaemonQuery) {
    return this.request("/v1/geo/map");
  }

  async fetchCaseDetail(query: DaemonQuery) {
    if (!query.caseId) throw new Error("caseId required for caseDetail query");
    return this.request(`/v1/cases/${query.caseId}`);
  }

  async fetchMetric(query: DaemonQuery) {
    const type = query.objectType ?? "Signal";
    const params = new URLSearchParams();
    if (query.metricField) params.set("field", query.metricField);
    if (query.groupBy) params.set("groupBy", query.groupBy);
    return this.request(
      `/v1/metrics/${type}/${query.metric ?? "count"}?${params.toString()}`,
    );
  }

  async request(path: string): Promise<any> {
    const response = await fetch(`${this.apiUrl}${path}`, {
      headers: { "Content-Type": "application/json", ...this.getAuthHeaders() },
    });
    const body = await response.json();
    return body.data ?? body;
  }

  async testDatasource() {
    try {
      await this.request("/v1/me");
      return { status: "success", message: "DAEMON connection successful" };
    } catch (err) {
      return {
        status: "error",
        message: err instanceof Error ? err.message : "Connection failed",
      };
    }
  }
}
