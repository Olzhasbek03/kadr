"use client";

import type { MediaType } from "@/lib/types";

/**
 * Persistent upload queue. Captures are written to IndexedDB first and
 * deleted only after the server accepts them, so venue wifi dropping —
 * or the guest locking their phone mid-upload — never loses a shot.
 * On reopening the camera the queue drains whatever is still pending.
 */

const DB_NAME = "kormem-uploads";
const STORE = "pending";
const MAX_TRIES = 6;

export interface PendingUpload {
  id: string;
  slug: string;
  mediaType: MediaType;
  filter: string;
  durationS: number | null;
  blob: Blob;
  mime: string;
  thumb: Blob | null;
  tries: number;
  createdAt: number;
}

export interface UploadOutcome {
  item: PendingUpload;
  status: "uploaded" | "rejected" | "retrying" | "dropped";
  /** Server error code for rejected items (out_of_film, video_cap, …). */
  code?: string;
  /** Fresh allowance from the server, when it sent one. */
  allowance?: { shotsLeft: number; videosLeft: number; audiosLeft: number };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueue(item: PendingUpload): Promise<void> {
  try {
    const db = await openDb();
    await tx(db, "readwrite", (s) => s.put(item));
    db.close();
  } catch {
    // IndexedDB unavailable (private mode on some browsers) — the caller
    // keeps the item in memory for this session; it just won't survive
    // a tab close.
  }
}

async function remove(id: string): Promise<void> {
  try {
    const db = await openDb();
    await tx(db, "readwrite", (s) => s.delete(id));
    db.close();
  } catch {
    /* best effort */
  }
}

async function bump(item: PendingUpload): Promise<void> {
  try {
    const db = await openDb();
    await tx(db, "readwrite", (s) => s.put(item));
    db.close();
  } catch {
    /* best effort */
  }
}

export async function loadPending(slug: string): Promise<PendingUpload[]> {
  try {
    const db = await openDb();
    const all = await tx<PendingUpload[]>(db, "readonly", (s) => s.getAll());
    db.close();
    return all
      .filter((i) => i.slug === slug)
      .sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

/**
 * Try to upload one item. Returns what happened so the UI can update
 * counts; persistence bookkeeping (delete on success / terminal failure,
 * bump tries otherwise) is handled here.
 */
export async function uploadOne(item: PendingUpload): Promise<UploadOutcome> {
  const form = new FormData();
  form.append("mediaType", item.mediaType);
  form.append("file", item.blob, `capture.${item.mime.split("/")[1] ?? "bin"}`);
  if (item.thumb) form.append("thumb", item.thumb, "thumb.jpg");
  form.append("filter", item.filter);
  if (item.durationS !== null) form.append("duration", String(item.durationS));

  let res: Response;
  try {
    res = await fetch(`/api/e/${item.slug}/upload`, { method: "POST", body: form });
  } catch {
    // Network failure — keep for retry.
    item.tries += 1;
    if (item.tries >= MAX_TRIES) {
      await remove(item.id);
      return { item, status: "dropped" };
    }
    await bump(item);
    return { item, status: "retrying" };
  }

  if (res.status === 201) {
    const data = await res.json().catch(() => ({}));
    await remove(item.id);
    return { item, status: "uploaded", allowance: pickAllowance(data) };
  }

  if (res.status === 403 || res.status === 400 || res.status === 401) {
    // Server says never — limit hit, invalid file, session gone. Drop it.
    const data = await res.json().catch(() => ({}));
    await remove(item.id);
    return {
      item,
      status: "rejected",
      code: typeof data.error === "string" ? data.error : undefined,
      allowance: pickAllowance(data),
    };
  }

  // 429/5xx — worth retrying later.
  item.tries += 1;
  if (item.tries >= MAX_TRIES) {
    await remove(item.id);
    return { item, status: "dropped" };
  }
  await bump(item);
  return { item, status: "retrying" };
}

function pickAllowance(
  data: Record<string, unknown>
): UploadOutcome["allowance"] {
  if (
    typeof data.shotsLeft === "number" &&
    typeof data.videosLeft === "number" &&
    typeof data.audiosLeft === "number"
  ) {
    return {
      shotsLeft: data.shotsLeft,
      videosLeft: data.videosLeft,
      audiosLeft: data.audiosLeft,
    };
  }
  return undefined;
}
