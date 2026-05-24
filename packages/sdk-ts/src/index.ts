export type ApiEnvelope<T> = {
  data?: T;
  error?: { code: string; message: string; requestId?: string; timestamp?: string };
};

export type ListMeta = {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  returned: number;
};

export type ListParams = { limit?: number; offset?: number };

export type DaemonClientConfig = {
  platformApiUrl: string;
  ontologyServiceUrl: string;
  caseServiceUrl: string;
  rulesEngineUrl?: string;
  ingestionServiceUrl?: string;
  tenantId?: string;
  bearerToken?: string;
};

export function createClient(config: DaemonClientConfig) {
  const headers = (): HeadersInit => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (config.bearerToken) {
      h.Authorization = `Bearer ${config.bearerToken}`;
    }
    if (config.tenantId) {
      h["X-Tenant-Id"] = config.tenantId;
    }
    return h;
  };

  async function parse<T>(res: Response): Promise<T> {
    const body = (await res.json()) as ApiEnvelope<T>;
    if (!res.ok || body.error) {
      throw new Error(body.error?.message ?? `HTTP ${res.status}`);
    }
    return body.data as T;
  }

  async function get<T>(url: string): Promise<T> {
    const res = await fetch(url, { headers: headers() });
    return parse<T>(res);
  }

  async function post<T>(url: string, payload?: unknown): Promise<T> {
    const res = await fetch(url, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload ?? {}),
    });
    return parse<T>(res);
  }

  return {
    me: () => get<Record<string, unknown>>(`${config.platformApiUrl}/v1/me`),
    manifest: () =>
      get<Record<string, unknown>>(`${config.ontologyServiceUrl}/v1/ontology/v2/manifest`),
    listSignals: (params?: ListParams) => {
      const q = listQuery(params);
      return get<{
        items: Array<{ rid: string; primaryKey: string; properties: Record<string, unknown> }>;
        meta?: ListMeta;
      }>(`${config.ontologyServiceUrl}/v1/objects/Signal${q}`);
    },
    listCases: (params?: ListParams) => {
      const q = listQuery(params);
      return get<{ items: Array<Record<string, unknown>>; meta?: ListMeta }>(
        `${config.caseServiceUrl}/v1/cases${q}`,
      );
    },
    evaluateRules: () => {
      const base = config.rulesEngineUrl ?? "http://localhost:8083";
      return post<{ signalsCreated: Array<Record<string, unknown>>; count: number }>(
        `${base}/v1/evaluate`,
        {},
      );
    },
    openCase: (params: { title: string; signalIds?: string[] }) =>
      post<Record<string, unknown>>(
        `${config.ontologyServiceUrl}/v1/actions/OpenCase`,
        params,
      ),
    getCase: (caseId: string) =>
      get<Record<string, unknown>>(`${config.caseServiceUrl}/v1/cases/${caseId}`),
    recordDecision: (params: { caseId: string; outcome: string; rationale?: string }) =>
      post<Record<string, unknown>>(
        `${config.ontologyServiceUrl}/v1/actions/RecordDecision`,
        params,
      ),
    listAuditEvents: (params?: {
      resourceType?: string;
      resourceId?: string;
      limit?: number;
      offset?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.resourceType) q.set("resourceType", params.resourceType);
      if (params?.resourceId) q.set("resourceId", params.resourceId);
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.offset) q.set("offset", String(params.offset));
      const qs = q.toString();
      return get<{ items: Array<Record<string, unknown>>; meta?: ListMeta }>(
        `${config.platformApiUrl}/v1/audit/events${qs ? `?${qs}` : ""}`,
      );
    },
    listObjects: (objectType: string, params?: ListParams) => {
      const q = listQuery(params);
      return get<{
        items: Array<{ rid: string; primaryKey: string; properties: Record<string, unknown> }>;
        meta?: ListMeta;
      }>(`${config.ontologyServiceUrl}/v1/objects/${objectType}${q}`);
    },
    listSites: (params?: ListParams) => {
      const q = listQuery(params);
      return get<{
        items: Array<{ rid: string; primaryKey: string; properties: Record<string, unknown> }>;
        meta?: ListMeta;
      }>(`${config.ontologyServiceUrl}/v1/objects/Site${q}`);
    },
    geoMap: () =>
      get<{
        sites: Array<Record<string, unknown>>;
        assets: Array<Record<string, unknown>>;
        signals: Array<Record<string, unknown>>;
      }>(`${config.platformApiUrl}/v1/geo/map`),
    listAttachments: (params?: {
      resourceType?: string;
      resourceId?: string;
      role?: string;
    }) => {
      const q = new URLSearchParams();
      if (params?.resourceType) q.set("resourceType", params.resourceType);
      if (params?.resourceId) q.set("resourceId", params.resourceId);
      if (params?.role) q.set("role", params.role);
      const qs = q.toString();
      return get<{ items: Array<Record<string, unknown>>; meta?: ListMeta }>(
        `${config.platformApiUrl}/v1/attachments${qs ? `?${qs}` : ""}`,
      );
    },
    uploadAttachment: async (params: {
      file: File | Blob;
      filename?: string;
      resourceType?: string;
      resourceId?: string;
      role?: string;
    }) => {
      const form = new FormData();
      form.append("file", params.file, params.filename ?? "upload.bin");
      if (params.resourceType) form.append("resourceType", params.resourceType);
      if (params.resourceId) form.append("resourceId", params.resourceId);
      if (params.role) form.append("role", params.role);
      const h: Record<string, string> = {};
      if (config.bearerToken) h.Authorization = `Bearer ${config.bearerToken}`;
      if (config.tenantId) h["X-Tenant-Id"] = config.tenantId;
      const res = await fetch(`${config.platformApiUrl}/v1/attachments`, {
        method: "POST",
        headers: h,
        body: form,
      });
      return parse<Record<string, unknown>>(res);
    },
    createWorkOrder: (params: { title: string; assetId?: string; caseId?: string }) =>
      post<Record<string, unknown>>(
        `${config.ontologyServiceUrl}/v1/actions/CreateWorkOrder`,
        params,
      ),
    executeWorkOrder: (params: { workOrderId: string; status: string }) =>
      post<Record<string, unknown>>(
        `${config.ontologyServiceUrl}/v1/actions/ExecuteWorkOrder`,
        params,
      ),
    summarizeCaseContext: (caseId: string) =>
      post<{ summary: string; caseId: string; signalCount: number }>(
        `${config.ontologyServiceUrl}/v1/functions/summarizeCaseContext`,
        { caseId },
      ),
    createJob: (
      connector?: string,
      params?: Record<string, unknown>,
    ) => {
      const base = config.ingestionServiceUrl ?? "http://localhost:8082";
      const body: { connector: string; params?: Record<string, unknown> } = {
        connector: connector ?? "seed-csv",
      };
      if (params !== undefined) {
        body.params = params;
      }
      return post<{ jobId: string; status: string }>(`${base}/v1/jobs`, body);
    },
    getJob: (jobId: string) => {
      const base = config.ingestionServiceUrl ?? "http://localhost:8082";
      return get<Record<string, unknown>>(`${base}/v1/jobs/${jobId}`);
    },
  };
}

function listQuery(params?: ListParams): string {
  if (!params?.limit && params?.offset === undefined) {
    return "";
  }
  const q = new URLSearchParams();
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.offset !== undefined) q.set("offset", String(params.offset));
  const qs = q.toString();
  return qs ? `?${qs}` : "";
}
