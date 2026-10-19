// Public-page references stay separate from timestamped AIS observations.
const time = value => Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
export function mergeReferenceDatasets(first, second) {
  if (!first?.vessels) return second;
  if (!second?.vessels) return first;
  const byIMO = new Map(second.vessels.map(v => [v.imo, v]));
  const vessels = first.vessels.map(v => {
    const other = byIMO.get(v.imo);
    if (!other) return v;
    const result = {...v};
    for (const key of ['vesselfinder', 'marinetraffic']) {
      const a = v[key], b = other[key];
      if (!a || !b) { result[key] = b ?? a; continue; }
      const successful = time(b.checked_at) > time(a.checked_at) ? b : a;
      const attempt = time(b.last_attempt_at) > time(a.last_attempt_at) ? b : a;
      result[key] = {...successful, last_attempt_at: attempt.last_attempt_at,
        last_attempt_status: attempt.last_attempt_status ?? attempt.access_status,
        last_attempt_note: attempt.last_attempt_note ?? attempt.note ?? null};
    }
    return result;
  });
  const latest = time(second.checked_at) > time(first.checked_at) ? second : first;
  return {...latest, vessels};
}
export function referenceFor(data, row) {
  const vessel = data?.vessels?.find(v => v.imo === row.imo);
  if (!vessel) return null;
  return [vessel.vesselfinder, vessel.marinetraffic]
    .filter(s => s?.access_status === 'available' && s.mmsi && s.mmsi_verification_status !== 'conflict' &&
      (!s.reported_imo || s.reported_imo === row.imo) &&
      (!row.identity?.mmsi || String(row.identity.mmsi) === String(s.mmsi)))
    .sort((a, b) => time(b.checked_at) - time(a.checked_at))[0] ?? null;
}
export function courtReferenceLabel(court) {
  if (!court?.name || court.status === 'unverified') return 'Jurisdiction not verified';
  return court.name + (court.status === 'preliminary' ? ' (preliminary; confirm locally)' : '');
}
