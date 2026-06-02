export interface DaemonDataSourceOptions {
  apiUrl: string;
  tenantId: string;
  authToken: string;
  oidcEnabled: boolean;
}

export interface DaemonQuery {
  queryType:
    | "listObjects"
    | "listSignals"
    | "listCases"
    | "auditEvents"
    | "metricQuery"
    | "geoMap"
    | "caseDetail";
  objectType?: string;
  filters?: Array<{ field: string; operator: string; value: string }>;
  metric?: "count" | "sum" | "avg" | "max" | "min";
  metricField?: string;
  groupBy?: string;
  caseId?: string;
  limit?: number;
}
