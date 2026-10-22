import fs from 'node:fs';
import path from 'node:path';
import {createResolver} from '../public/destinations.js';
import {mergeReferenceDatasets} from '../public/reference-data.js';

export function publicPageText(html) {
  return String(html).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ').replace(/&#(x[0-9a-f]+|\d+);/gi, (_, v) => {
      const n = v[0].toLowerCase() === 'x' ? parseInt(v.slice(1), 16) : Number(v);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ' ';
    }).replace(/&(amp|nbsp|quot|apos|lt|gt);/g, (_, v) => ({amp:'&',nbsp:' ',quot:'"',apos:"'",lt:'<',gt:'>'}[v]))
    .replace(/\s+/g, ' ').trim();
}

export function parsePublicVesselPage(input, imo) {
  const text = publicPageText(input);
  // A title/name or an opaque JS payload is not identity or voyage evidence.
  const identity = text.match(/IMO\s*:?\s*(\d{7})\s*,?\s*MMSI\s*:?\s*(\d{9})/i)
    ?? text.match(/IMO\s*\/\s*MMSI\s*\|?\s*(\d{7})\s*\/\s*(\d{9})/i);
  if (!identity || identity[1] !== String(imo)) throw new Error('Public IMO/MMSI pair not verifiable');
  const area = text.match(/current position of .+? is at (.+?) reported (.+?) by AIS\./i);
  const enRoute = text.match(/vessel is en route to (?:the port of )?(.+?)(?:, sailing|, and expected| and expected|\. The vessel)/i);
  const arrived = text.match(/vessel arrived at (?:the port of )?(.+?) on ([A-Z][a-z]{2} \d{1,2}, \d\d:\d\d(?: UTC)?)/i);
  const eta = text.match(/expected to arrive there on ([A-Z][a-z]{2} \d{1,2}, \d\d:\d\d(?: UTC)?)/i);
  if (!area && !enRoute && !arrived) throw new Error('Public voyage information unavailable');
  return {reported_imo: identity[1], mmsi: identity[2], area: area?.[1]?.trim() ?? null,
    position_age_reported: area?.[2]?.trim() ?? null, signal_at: null, coordinates: null,
    destination_reported: (arrived?.[1] ?? enRoute?.[1])?.trim() ?? null,
    eta_reported: eta?.[1] ?? null, arrival_reported: arrived?.[2] ?? null,
    voyage_status: arrived ? 'reported_arrival' : enRoute ? 'en_route' : 'destination_unavailable'};
}

export function referenceFromPage(input, vessel, previous, directory, legal, at) {
  const parsed = parsePublicVesselPage(input, vessel.imo);
  const destination = parsed.destination_reported;
  const resolve = createResolver(directory, legal);
  let d = resolve(destination);
  if (!d.port && destination) d = resolve(destination.split(',').slice(0, -1).join(',').trim());
  const split = destination?.lastIndexOf(',') ?? -1;
  const same = previous?.destination_reported === destination;
  const court = d.court ? {...d.court, checked_at: d.court.checked_at ?? legal.checked_at} :
    same ? previous?.court_reference : null;
  return {source: previous?.source ?? 'VesselFinder', url: previous?.url ??
      'https://www.vesselfinder.com/vessels/details/' + vessel.imo,
    ...parsed, ...(previous?.mmsi === parsed.mmsi && previous.mmsi_verification_status === 'conflict' ?
      {mmsi_verification_status:'conflict',identity_check:previous.identity_check,identity_sources:previous.identity_sources} : {}),
    checked_at: at, access_status: 'available',
    port: d.port ?? (split > 0 ? destination.slice(0, split) : null),
    country: d.country ?? (split > 0 ? destination.slice(split + 1).trim() : null),
    court_reference: court ?? {name:null,status:'unverified',checked_at:at.slice(0,10),sources:[],
      note:'Civil ship-arrest jurisdiction has not been verified from an official source.'},
    retrieval_crawl_note:'Public page retrieved at consultation; upstream caching is possible',
    temporal_status:'reference_only_no_absolute_signal_timestamp',
    last_attempt_at:at, last_attempt_status:'available'};
}

export class ReferenceMonitor {
  constructor({fleet, seed, directory, legal, dataDir, getAISRow = () => null, fetchPage = fetch, clock = () => new Date().toISOString()}) {
    this.fleet = fleet; this.directory = directory; this.legal = legal;
    this.fetchPage = fetchPage; this.clock = clock; this.getAISRow = getAISRow; this.job = null; this.active = null; this.error = null;
    this.file = path.join(dataDir, 'public-references.json');
    let saved = null; try { saved = JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch {}
    this.data = mergeReferenceDatasets(seed, saved);
  }
  snapshot() { return {data:this.data, job:this.job, error:this.error}; }
  refresh() {
    if (this.active) return this.active;
    if (this.job?.completed_at && Date.now() - Date.parse(this.job.completed_at) < 60000) return Promise.resolve();
    this.job = {state:'running',started_at:this.clock(),completed:0,total:this.fleet.vessels.length * 2};
    this.active = this.run().catch(() => { this.job.state = 'failed'; this.error = 'Public reference check failed; last valid data retained'; })
      .finally(() => { this.job.completed_at = this.clock(); this.active = null; });
    return this.active;
  }
  async run() {
    // Pick up updates published by the research workflow, without redeploying AIS.
    try {
      const res = await this.fetchPage('https://alexandercerato.github.io/vessel-watch/data/supplemental.json', {signal:AbortSignal.timeout(10000)});
      if (res.ok) { const d = await res.json(); if (d.schema_version === 1 && d.vessels?.length === this.fleet.vessels.length) this.data = mergeReferenceDatasets(this.data, d); }
    } catch {}
    const tasks = this.data.vessels.flatMap(v => ['vesselfinder','marinetraffic'].map(key => ({v,key})));
    let index = 0;
    const worker = async () => {
      while (index < tasks.length) {
        const {v,key} = tasks[index++], old = v[key], at = this.clock();
        const url = key === 'vesselfinder' ? 'https://www.vesselfinder.com/vessels/details/' + v.imo :
          'https://www.marinetraffic.com/en/ais/details/ships/imo:' + v.imo;
        try {
          const res = await this.fetchPage(url, {headers:{accept:'text/html'},signal:AbortSignal.timeout(12000)});
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const body = await res.text();
          const next = referenceFromPage(body, v, {...old,url}, this.directory, this.legal, at);
          if (key === 'marinetraffic') next.source = 'MarineTraffic';
          const row = this.getAISRow(v.imo);
          if (row) {
            next.comparison = {backend_position_at:row.position?.at??null,backend_destination:row.static?.destination??null,
              backend_static_at:row.static?.at??null,merge_applied:false};
            next.identity_check = next.mmsi_verification_status === 'conflict' ? next.identity_check :
              !row.identity ? 'Backend identity pending' : String(row.identity.mmsi) === next.mmsi ? 'Matches current backend IMO/MMSI' : 'MMSI conflict - do not merge';
          }
          v[key] = next;
        } catch (e) {
          v[key] = {...old, url, last_attempt_at:at, last_attempt_status:'unavailable',
            last_attempt_note:String(e.message).slice(0,160)};
        }
        this.job.completed++;
      }
    };
    await Promise.all(Array.from({length:3}, worker));
    const count = key => this.data.vessels.filter(v => v[key]?.last_attempt_status === 'available').length;
    const vf = count('vesselfinder'), mt = count('marinetraffic');
    this.data.checked_at = this.clock();
    if (this.fleet.vessels.some(v => this.getAISRow(v.imo))) this.data.backend_compared_at = this.data.checked_at;
    this.data.coverage = {fleet:this.fleet.vessels.length,vesselfinder_accessible:vf,vesselfinder_unavailable:this.fleet.vessels.length-vf,
      marinetraffic_accessible:mt,marinetraffic_unavailable:this.fleet.vessels.length-mt};
    const noteAt = this.data.checked_at.replace(/\.\d{3}Z$/, 'Z');
    this.data.notes = [
      `${noteAt}: VesselFinder returned readable public pages for ${vf} of ${this.fleet.vessels.length} vessels; last valid supplemental values were retained where unavailable.`,
      `${noteAt}: MarineTraffic public pages were accessible for ${mt} of ${this.fleet.vessels.length} vessels; unavailable pages or pages without verifiable absolute-timestamp voyage data were not imported.`,
      'Relative-age provider references remain supplemental and do not overwrite newer timestamped AIS data.'
    ];
    this.job.state = 'completed'; this.job.accessible = {vesselfinder:vf,marinetraffic:mt};
    try { fs.mkdirSync(path.dirname(this.file), {recursive:true}); fs.writeFileSync(this.file+'.tmp', JSON.stringify(this.data)); fs.renameSync(this.file+'.tmp', this.file); this.error = null; }
    catch { this.error = 'Public references could not be saved; retained in memory'; }
  }
}
