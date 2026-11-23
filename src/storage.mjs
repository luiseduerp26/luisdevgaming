export async function getCatalog(store, forUpdate = false) {
  const entry = forUpdate ? await getVersionedJSON(store, 'projects') :
    await store.getWithMetadata('projects', { type: 'json' });
  return { projects: entry?.data ?? [], etag: entry?.etag };
}

// Netlify CLI's local Blobs server can omit ETags on GET while returning
// them from list. Resolve a stable version before a conditional write.
export async function getVersionedJSON(store, key) {
  const record = await store.getWithMetadata(key, { type: 'json' });
  if (!record || record.etag) return record;
  async function listedTag() {
    const { blobs } = await store.list({ prefix: key });
    return blobs.find((blob) => blob.key === key)?.etag;
  }
  for (let retry = 0; retry < 4; retry++) {
    const before = await listedTag();
    const fresh = await store.getWithMetadata(key, { type: 'json' });
    if (!fresh || fresh.etag) return fresh;
    if (before && before === await listedTag()) return { ...fresh, etag: before };
  }
  throw new Error('No se pudo obtener una versión estable del registro.');
}

export async function putCatalog(store, snapshot, projects) {
  const { modified } = await store.setJSON('projects', projects,
    snapshot.etag ? { onlyIfMatch: snapshot.etag } : { onlyIfNew: true });
  return modified;
}

export async function removeImage(store, key) {
  if (!key) return;
  try {
    await store.delete('covers/' + key);
  } catch (error) {
    console.error('No se pudo retirar una portada reemplazada:', error);
  }
}
