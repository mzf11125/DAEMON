const BASE = process.env.NEXT_PUBLIC_ONTOLOGY_BUILDER_URL || "http://localhost:8085";

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Tenant-Id": typeof window !== "undefined" ? localStorage.getItem("tenantId") || "tenant-demo" : "tenant-demo",
  };
}

export interface Workspace {
  id: string;
  name: string;
  status: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface Template {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  category?: string;
  tags: string[];
}

export interface ObjectType {
  id: string;
  workspaceId: string;
  apiName: string;
  displayName: string;
  primaryKey: string;
  titleProperty: string;
  description?: string;
  icon?: string;
  category?: string;
  properties: Property[];
  createdAt: string;
  updatedAt: string;
}

export interface Property {
  id: string;
  name: string;
  type: string;
  required: boolean;
  config?: any;
  sortOrder: number;
}

export interface LinkType {
  id: string;
  workspaceId: string;
  apiName: string;
  displayName: string;
  fromObjectType: string;
  toObjectType: string;
  cardinality: string;
  description?: string;
}

export interface ActionType {
  id: string;
  workspaceId: string;
  apiName: string;
  displayName: string;
  targetObjectType: string;
  requiresApproval: boolean;
  description?: string;
  parameters: ActionParam[];
}

export interface ActionParam {
  id: string;
  name: string;
  type: string;
  required: boolean;
  config?: any;
}

// ── Workspaces ──────────────────────────────────────

export async function getWorkspaces(): Promise<Workspace[]> {
  const res = await fetch(`${BASE}/v1/workspaces`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Failed to fetch workspaces");
  const data = await res.json();
  return data.items || [];
}

export async function createWorkspace(name: string, templateId?: string) {
  const res = await fetch(`${BASE}/v1/workspaces`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ name, baseTemplateId: templateId || undefined }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create workspace");
  }
  return res.json();
}

export async function deleteWorkspace(id: string) {
  const res = await fetch(`${BASE}/v1/workspaces/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete workspace");
  return true;
}

// ── Templates ───────────────────────────────────────

export async function getTemplates(): Promise<Template[]> {
  const res = await fetch(`${BASE}/v1/templates`, { headers: getHeaders() });
  if (!res.ok) return [];
  const data = await res.json();
  return data.templates || [];
}

// ── Object Types ─────────────────────────────────────

export async function getObjects(workspaceId: string): Promise<ObjectType[]> {
  const res = await fetch(`${BASE}/v1/workspaces/${workspaceId}/objects`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Failed to fetch objects");
  const data = await res.json();
  return data.objectTypes || [];
}

export async function createObject(workspaceId: string, object: {
  apiName: string; displayName: string; primaryKey?: string;
  titleProperty?: string; description?: string; properties?: { name: string; type: string; required?: boolean; config?: any }[];
}) {
  const res = await fetch(`${BASE}/v1/workspaces/${workspaceId}/objects`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(object),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create object");
  }
  return res.json();
}

export async function deleteObject(workspaceId: string, objectTypeId: string) {
  const res = await fetch(`${BASE}/v1/workspaces/${workspaceId}/objects/${objectTypeId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete object");
  return true;
}

// ── Link Types ───────────────────────────────────────

export async function getLinks(workspaceId: string): Promise<LinkType[]> {
  const res = await fetch(`${BASE}/v1/workspaces/${workspaceId}/links`, { headers: getHeaders() });
  if (!res.ok) return [];
  const data = await res.json();
  return data.linkTypes || [];
}

export async function createLink(workspaceId: string, link: {
  apiName: string; displayName: string; fromObjectType: string;
  toObjectType: string; cardinality?: string; description?: string;
}) {
  const res = await fetch(`${BASE}/v1/workspaces/${workspaceId}/links`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(link),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create link");
  }
  return res.json();
}

export async function deleteLink(workspaceId: string, linkId: string) {
  const res = await fetch(`${BASE}/v1/workspaces/${workspaceId}/links/${linkId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete link");
  return true;
}

// ── Action Types ─────────────────────────────────────

export async function getActions(workspaceId: string): Promise<ActionType[]> {
  const res = await fetch(`${BASE}/v1/workspaces/${workspaceId}/actions`, { headers: getHeaders() });
  if (!res.ok) return [];
  const data = await res.json();
  return data.actionTypes || [];
}

export async function createAction(workspaceId: string, action: {
  apiName: string; displayName: string; targetObjectType: string;
  requiresApproval?: boolean; description?: string; parameters?: { name: string; type: string; required?: boolean }[];
}) {
  const res = await fetch(`${BASE}/v1/workspaces/${workspaceId}/actions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(action),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create action");
  }
  return res.json();
}

export async function deleteAction(workspaceId: string, actionId: string) {
  const res = await fetch(`${BASE}/v1/workspaces/${workspaceId}/actions/${actionId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete action");
  return true;
}

// ── Validation & Compile ─────────────────────────────

export async function validateWorkspace(workspaceId: string) {
  const res = await fetch(`${BASE}/v1/workspaces/${workspaceId}/validate`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Validation failed");
  return res.json();
}

export async function compileWorkspace(workspaceId: string, changeSummary?: string) {
  const res = await fetch(`${BASE}/v1/workspaces/${workspaceId}/compile`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ changeSummary }),
  });
  if (!res.ok) throw new Error("Compile failed");
  return res.json();
}
