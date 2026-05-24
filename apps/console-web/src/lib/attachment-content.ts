const platformApiUrl = () =>
  process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? "http://localhost:8080";

const tenantId = () => process.env.NEXT_PUBLIC_TENANT_ID ?? "tenant-demo";

/** Fetch attachment bytes and return an object URL for image preview (caller must revoke). */
export async function fetchAttachmentObjectUrl(attachmentId: string): Promise<string | null> {
  const res = await fetch(`${platformApiUrl()}/v1/attachments/${attachmentId}/content`, {
    headers: { "X-Tenant-Id": tenantId() },
  });
  if (!res.ok) return null;
  const blob = await res.blob();
  if (!blob.type.startsWith("image/")) return null;
  return URL.createObjectURL(blob);
}
