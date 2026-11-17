/** IndexedDB records that let an upload continue after a page refresh. Failures are non-fatal. */

export interface ResumeRecord {
  key: string; // fileKey(): case|name|size|lastModified
  caseId: string;
  jobId: string;
  name: string;
  size: number;
  lastModified: number;
}

const DB = 'tarka-uploads';
const STORE = 'jobs';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'key' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T | undefined> {
  try {
    const db = await open();
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    }).finally(() => db.close());
  } catch {
    return undefined; // private mode / blocked storage: uploads still work, just not resumable
  }
}

export const resumeDb = {
  put: (r: ResumeRecord) => tx<void>('readwrite', (s) => s.put(r)),
  remove: (key: string) => tx<void>('readwrite', (s) => s.delete(key)),
  all: async (caseId: string) =>
    ((await tx<ResumeRecord[]>('readonly', (s) => s.getAll())) ?? []).filter((r) => r.caseId === caseId),
};
