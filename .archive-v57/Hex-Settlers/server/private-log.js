'use strict';

function sanitizeLogEntriesForViewer(entries, viewerId = null) {
  if (!Array.isArray(entries)) return [];
  const viewer = String(viewerId || '');

  return entries.map((source) => {
    if (!source || typeof source !== 'object') return source;
    const entry = { ...source };
    const sourceData = source.data && typeof source.data === 'object' ? source.data : null;
    if (!sourceData) return entry;

    const data = { ...sourceData };
    const detail = data.privateSteal && typeof data.privateSteal === 'object' ? data.privateSteal : null;
    if (detail) {
      const thiefId = String(detail.thiefId || '');
      const victimId = String(detail.victimId || '');
      const resourceKind = String(detail.resourceKind || '').trim().toLowerCase();
      if (resourceKind && viewer && (viewer === thiefId || viewer === victimId)) {
        entry.text = String(entry.text || '').replace(/\b1 resource\b/i, `1 ${resourceKind}`);
      }
      delete data.privateSteal;
    }
    entry.data = data;
    return entry;
  });
}

module.exports = { sanitizeLogEntriesForViewer };
