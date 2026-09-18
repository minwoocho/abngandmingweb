import { defaultWishes, asset } from './content';

export type Photo = { id: string; caption: string; createdAt: number; bundled?: string; blob?: Blob };
export type AppData = {
  version: 1; tickets: number; carry: number; roaming: boolean;
  wishes: { title: string; used: boolean }[]; photos: Photo[];
};
type StoredPhoto = Omit<Photo, 'blob'> & { bytes?: ArrayBuffer; mime?: string };
type StoredData = Omit<AppData, 'photos'> & { photos: StoredPhoto[] };
export function initialData(): AppData {
  return {
    version: 1, tickets: 15, carry: 0, roaming: true,
    wishes: defaultWishes.map(title => ({ title, used: false })),
    photos: Array.from({ length: 9 }, (_, i) => ({ id: `default-${i + 1}`, caption: '', createdAt: 9 - i, bundled: `photos/default-${String(i + 1).padStart(2, '0')}.jpg` })),
  };
}
let database: Promise<IDBDatabase> | undefined;
function db() {
  return database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('hbd-ang-ming', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('local');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('다른 탭을 닫고 다시 열어주세요.'));
  });
}
export async function loadData(): Promise<AppData> {
  const database = await db();
  const saved = await new Promise<StoredData | undefined>((resolve, reject) => {
    const request = database.transaction('local').objectStore('local').get('state');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  if (saved) return { ...saved, photos: saved.photos.map(({ bytes, mime, ...photo }) => ({ ...photo, ...(bytes ? { blob: new Blob([bytes], { type: mime || 'image/jpeg' }) } : {}) })) };
  const fresh = initialData();
  await saveData(fresh);
  return fresh;
}
export async function saveData(data: AppData) {
  // Store plain bytes: some WebKit contexts cannot persist Blob/File objects.
  // Convert before opening the transaction so async work cannot close it early.
  const photos: StoredPhoto[] = [];
  for (const { blob, ...photo } of data.photos) photos.push({ ...photo, ...(blob ? { bytes: await blob.arrayBuffer(), mime: blob.type } : {}) });
  const stored: StoredData = { ...data, photos };
  const database = await db();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction('local', 'readwrite');
    transaction.objectStore('local').put(stored, 'state');
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
function dataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
export async function exportBackup(data: AppData) {
  const photos = [];
  for (const photo of data.photos) photos.push({ ...photo, blob: undefined, image: photo.blob ? await dataURL(photo.blob) : undefined });
  const blob = new Blob([JSON.stringify({ ...data, format: 'hbd-ang-ming-backup', photos })], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `hbd-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
export async function importBackup(file: File): Promise<AppData> {
  if (file.size > 100 * 1024 * 1024) throw new Error('백업 파일은 100MB 이하로 선택해주세요.');
  const raw = JSON.parse(await file.text());
  const fail = () => { throw new Error('올바른 앙&밍 백업 파일이 아니에요.'); };
  if (raw.format !== 'hbd-ang-ming-backup' || raw.version !== 1 || ![raw.tickets, raw.carry].every(n => Number.isSafeInteger(n) && n >= 0 && n < 1e12) || typeof raw.roaming !== 'boolean' || !Array.isArray(raw.wishes) || raw.wishes.length !== 5 || !Array.isArray(raw.photos) || raw.photos.length > 2000) fail();
  const wishes = raw.wishes.map((w: { title: string; used: boolean }) => {
    if (typeof w?.title !== 'string' || w.title.length > 100 || typeof w.used !== 'boolean') fail();
    return { title: w.title, used: w.used };
  });
  const photos: Photo[] = [];
  const ids = new Set();
  for (const photo of raw.photos) {
    if (typeof photo?.id !== 'string' || photo.id.length > 100 || ids.has(photo.id) || typeof photo.caption !== 'string' || photo.caption.length > 500 || !Number.isFinite(photo.createdAt)) fail();
    ids.add(photo.id);
    let blob: Blob | undefined;
    if (photo.image) {
      if (typeof photo.image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo.image)) fail();
      blob = await (await fetch(photo.image)).blob();
      if (blob.size > 15 * 1024 * 1024) fail();
    } else if (typeof photo.bundled !== 'string' || !/^photos\/default-0[1-9]\.jpg$/.test(photo.bundled)) fail();
    photos.push({ id: photo.id, caption: photo.caption, createdAt: photo.createdAt, ...(blob ? { blob } : { bundled: photo.bundled }) });
  }
  return { version: 1, tickets: raw.tickets, carry: raw.carry, roaming: raw.roaming, wishes, photos };
}
export async function preparePhoto(file: File): Promise<Photo> {
  if (file.size > 30 * 1024 * 1024) throw new Error('사진 한 장은 30MB 이하로 선택해주세요.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => { throw new Error('이 사진을 읽을 수 없어요. JPEG 또는 PNG로 다시 선택해주세요.'); });
    const scale = Math.min(1, 2000 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('사진을 준비할 수 없어요.');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('사진 변환에 실패했어요.')), 'image/jpeg', .86));
    return { id: crypto.randomUUID(), caption: '', createdAt: Date.now(), blob };
  } finally { URL.revokeObjectURL(url); }
}
export function bundledURL(photo: Photo) { return photo.bundled ? asset(photo.bundled) : ''; }
