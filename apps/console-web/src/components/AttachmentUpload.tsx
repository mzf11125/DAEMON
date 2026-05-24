"use client";

import { useEffect, useState } from "react";
import { createDaemonClient } from "@/lib/daemon-client";

export function AttachmentUpload({
  resourceType,
  resourceId,
  role = "attachment",
  title,
}: {
  resourceType: string;
  resourceId: string;
  role?: "attachment" | "thumbnail";
  title?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const isThumbnail = role === "thumbnail";
  const heading = title ?? (isThumbnail ? "Thumbnail" : "Attachments");

  async function refresh() {
    const client = createDaemonClient();
    const res = await client.listAttachments({ resourceType, resourceId, role });
    setItems(res.items ?? []);
  }

  useEffect(() => {
    void refresh();
  }, [resourceType, resourceId, role]);

  useEffect(() => {
    if (!file || !isThumbnail || !file.type.startsWith("image/")) {
      setLocalPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(file);
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    return () => URL.revokeObjectURL(url);
  }, [file, isThumbnail]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setStatus(null);
    try {
      const client = createDaemonClient();
      await client.uploadAttachment({
        file,
        filename: file.name,
        resourceType,
        resourceId,
        role,
      });
      setFile(null);
      setStatus(isThumbnail ? "Thumbnail uploaded." : "Uploaded.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <section>
      <h2>{heading}</h2>
      {isThumbnail && localPreview && (
        <p style={{ marginBottom: "0.75rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={localPreview} alt="Thumbnail preview" style={{ maxWidth: 240, maxHeight: 160, objectFit: "cover" }} />
        </p>
      )}
      {isThumbnail && !localPreview && items.length > 0 && (
        <p className="muted">Thumbnail on file ({String(items[0].filename ?? items[0].attachmentId)}).</p>
      )}
      {!isThumbnail && (
        <>
          <button type="button" className="btn" onClick={() => void refresh()} style={{ marginBottom: "0.5rem" }}>
            Refresh attachments
          </button>
          {items.length === 0 ? (
            <p className="muted">No attachments yet.</p>
          ) : (
            <ul>
              {items.map((a) => (
                <li key={String(a.attachmentId)}>
                  {String(a.filename ?? a.attachmentId)} ({String(a.contentType ?? "file")})
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <form onSubmit={(e) => void upload(e)} style={{ marginTop: "1rem" }}>
        <input
          type="file"
          accept={isThumbnail ? "image/*" : undefined}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button type="submit" className="btn" disabled={!file} style={{ marginLeft: "0.5rem" }}>
          {isThumbnail ? "Upload thumbnail" : "Upload"}
        </button>
      </form>
      {status && <p className="muted">{status}</p>}
      {error && <p style={{ color: "#f87171" }}>{error}</p>}
    </section>
  );
}
