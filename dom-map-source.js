/* global document, window */
(() => {
  'use strict';
  if (window.DomMapSource) return;
  const previews = new WeakSet();
  const LAYERS = new Set(['point', 'heatmap', 'grid', 'hexagon', 'cluster', 'arc', 'line', 'trip', 'geojson', 'icon', 'hexagonId', 's2']);
  const TYPES = new Set(['integer', 'real', 'boolean', 'string', 'timestamp', 'geojson']);
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
  const exact = (value, keys) => record(value) && Object.keys(value).sort().join(',') === keys.slice().sort().join(',');
  const count = value => Number.isSafeInteger(value) && value >= 0;
  const control = character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127;
  const text = (value, max, optional = false) => optional && value === null || typeof value === 'string' && value.trim().length > 0 && value.length <= max && !Array.from(value).some(control);
  const clean = (value, max = 240) => Array.from(String(value)).map(character => control(character) ? ' ' : character).join('').slice(0, max);
  const number = value => value.toLocaleString('en-US');

  function publicUrl(value) {
    if (typeof value !== 'string' || value.length > 2048) return null;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.port
          || /^(?:localhost|127\.|0\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|169\.254\.|\[|.*\.local$)/i.test(url.hostname)
          || [...url.searchParams.keys()].some(key => /auth|token|key|secret|password|credential|signature|sig$|session/i.test(key))) return null;
      return url.href.length <= 2048 ? url.href : null;
    } catch { return null; }
  }
  function validateSummary(value) {
    if (!exact(value, ['version', 'sourceLabel', 'description', 'sourceUrl', 'license', 'attribution', 'examinedRows', 'notShownRows', 'warnings', 'analysis'])
        || value.version !== 1 || !text(value.sourceLabel, 160) || !text(value.description, 1200)
        || !(value.sourceUrl === null || typeof value.sourceUrl === 'string' && value.sourceUrl.length <= 2048)
        || !text(value.license, 300, true) || !text(value.attribution, 1200, true)
        || !count(value.examinedRows) || !count(value.notShownRows) || value.notShownRows > value.examinedRows
        || !Array.isArray(value.warnings) || value.warnings.length > 8 || !value.warnings.every(warning => text(warning, 500))) throw new Error('The map source summary is invalid or exceeds its display budget.');
    const analysis = value.analysis;
    if (analysis !== null && (!exact(analysis, ['summary', 'eligibleRows', 'candidateRows', 'qualityExcludedRows']) || !text(analysis.summary, 1200)
        || !count(analysis.eligibleRows) || !count(analysis.candidateRows) || analysis.candidateRows > analysis.eligibleRows
        || !(analysis.qualityExcludedRows === null || count(analysis.qualityExcludedRows)))) throw new Error('The map analysis summary is invalid.');
    return Object.freeze({ ...value, sourceUrl: publicUrl(value.sourceUrl), warnings: Object.freeze(value.warnings.slice()),
      analysis: analysis === null ? null : Object.freeze({ ...analysis }) });
  }
  function geometry(value) {
    let item = value;
    if (typeof item === 'string') { try { item = JSON.parse(item); } catch { return 'Geometry'; } }
    if (!record(item)) return 'Geometry';
    if (item.type === 'Feature') return geometry(item.geometry);
    if (item.type === 'FeatureCollection' && Array.isArray(item.features)) return `FeatureCollection · ${number(item.features.length)} features`;
    if (item.type === 'GeometryCollection' && Array.isArray(item.geometries)) return `GeometryCollection · ${number(item.geometries.length)} geometries`;
    let positions = 0;
    const stack = Array.isArray(item.coordinates) ? [item.coordinates] : [];
    while (stack.length) {
      const coordinates = stack.pop();
      if (coordinates.length >= 2 && typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') positions++;
      else for (const child of coordinates) if (Array.isArray(child)) stack.push(child);
    }
    return `${clean(item.type || 'Geometry', 40)}${positions ? ` · ${number(positions)} positions` : ''}`;
  }
  const cell = (value, field) => value === null || value === undefined ? '—' : field.type === 'geojson' ? geometry(value) : clean(value, 2000);
  function preview(payload, sourceSummary) {
    if (!record(payload)) throw new Error('A map payload is required.');
    const summary = sourceSummary === undefined || sourceSummary === null ? null : validateSummary(sourceSummary);
    let data = payload.data, layer = payload.layer;
    if (!data && Array.isArray(payload.rows)) {
      const names = ['source_row', 'latitude', 'longitude', 'failed', 'requested_at', 'zero_coordinate_pair'];
      data = { label: 'Dispatch failure locations', fields: names.map(name => ({ name, type: name === 'requested_at' ? 'timestamp' : name === 'zero_coordinate_pair' ? 'boolean' : name === 'latitude' || name === 'longitude' ? 'real' : 'integer' })),
        rows: payload.rows.map(row => names.map(name => row[name])), roles: { latitude: 'latitude', longitude: 'longitude', time: 'requested_at' } };
      layer = 'heatmap';
    }
    if (!record(data) || !text(data.label, 300) || !LAYERS.has(layer) || !Array.isArray(data.fields) || data.fields.length < 1 || data.fields.length > 40
        || !data.fields.every(field => record(field) && text(field.name, 120) && TYPES.has(field.type))
        || new Set(data.fields.map(field => field.name)).size !== data.fields.length || !Array.isArray(data.rows) || !data.rows.length || data.rows.length > 100000
        || !data.rows.every(row => Array.isArray(row) && row.length === data.fields.length)) throw new Error('The mapped table is invalid or exceeds its display budget.');
    const roles = record(data.roles) ? data.roles : {};
    const identity = data.fields.findIndex(field => field.name === 'source_row' && field.type === 'integer'
      && data.rows.every(row => Number.isSafeInteger(row[data.fields.indexOf(field)]) && row[data.fields.indexOf(field)] > 0)
      && new Set(data.rows.map(row => row[data.fields.indexOf(field)])).size === data.rows.length);
    const ids = data.rows.map((row, index) => identity >= 0 ? row[identity] : index + 1);
    if (ids.some(id => !Number.isSafeInteger(id) || id < 1) || new Set(ids).size !== ids.length) throw new Error('The map preview needs distinct positive record identities.');
    const highlights = payload.highlight?.sourceRows ?? [];
    if (!Array.isArray(highlights) || highlights.length > 2000 || highlights.some(id => !ids.includes(id)) || new Set(highlights).size !== highlights.length) throw new Error('The map highlights do not match its displayed records.');
    const prepared = window.DomGeographyTools && payload.data ? window.DomGeographyTools.build({ data, layer, ...(payload.highlight ? { highlight: payload.highlight } : {}), ...(payload.emphasis ? { emphasis: payload.emphasis } : {}) }) : null;
    if (payload.emphasis && !prepared?.emphasis) throw new Error('The category selection needs full-table validation before source preview.');
    const selected = new Set(highlights);
    if (prepared?.emphasis) {
      const index = data.fields.findIndex(field => field.name === prepared.emphasis.field);
      data.rows.forEach((row, rowIndex) => { if (row[index] === prepared.emphasis.value) selected.add(ids[rowIndex]); });
    }
    const flagged = selected.size > 0;
    const fieldIndex = name => data.fields.findIndex(field => field.name === name);
    const prioritized = [roles.time, roles.endTime, roles.value, roles.category, roles.latitude, roles.longitude, roles.startLatitude, roles.startLongitude, roles.endLatitude, roles.endLongitude]
      .map(fieldIndex).filter(index => index >= 0 && index !== identity && data.fields[index].type !== 'geojson');
    const scalars = [...new Set([...prioritized, ...data.fields.map((field, index) => field.type !== 'geojson' && index !== identity ? index : -1).filter(index => index >= 0)])];
    const shape = data.fields.findIndex(field => field.type === 'geojson');
    const capacity = 8 - 1 - (flagged ? 1 : 0), indices = scalars.slice(0, capacity - (shape >= 0 ? 1 : 0));
    if (shape >= 0) indices.push(shape);
    const columns = [{ name: identity >= 0 ? data.fields[identity].name : 'Map row', type: 'integer' }, ...(flagged ? [{ name: 'Review', type: 'string' }] : []), ...indices.map(index => ({ name: data.fields[index].name, type: data.fields[index].type }))];
    const ordering = [...data.rows.keys()].sort((left, right) => Number(selected.has(ids[right])) - Number(selected.has(ids[left]))).slice(0, 12);
    const records = ordering.map(index => Object.freeze({ sourceRow: ids[index], candidate: selected.has(ids[index]), cells: Object.freeze([String(ids[index]), ...(flagged ? [selected.has(ids[index]) ? prepared?.emphasis ? 'Selected category' : 'Highlighted candidate' : 'Comparison record'] : []), ...indices.map(field => cell(data.rows[index][field], data.fields[field]))]) }));
    let timeDomain = null;
    if (prepared) timeDomain = prepared.timeDomain;
    else {
      const time = fieldIndex(roles.time), end = fieldIndex(roles.endTime);
      let first = Infinity, last = -Infinity;
      for (const row of data.rows) for (const index of [time, end]) {
        const value = index >= 0 && typeof row[index] === 'string' ? Date.parse(row[index]) : NaN;
        if (Number.isFinite(value)) { first = Math.min(first, value); last = Math.max(last, value); }
      }
      if (Number.isFinite(first)) timeDomain = [first, last];
    }
    const unit = roles.h3 || roles.s2 ? 'mapped cells' : layer === 'trip' ? 'recorded trip segments' : 'mapped records';
    const result = Object.freeze({ version: 1, label: data.label, layer, rowCount: data.rows.length, unit, highlightedRows: selected.size,
      columns: Object.freeze(columns.map(column => Object.freeze(column))), records: Object.freeze(records),
      selectionLabel: `${flagged ? 'Highlighted records first' : 'First mapped records'} · showing ${records.length} of ${number(data.rows.length)} ${unit}.`,
      timeDomain: timeDomain ? Object.freeze(timeDomain.slice()) : null, summary });
    previews.add(result); return result;
  }

  function create({ summary, content, renderSheet }) {
    if (!summary || summary.tagName !== 'SUMMARY' || !content || typeof renderSheet !== 'function') throw new Error('The map source disclosure needs its summary, content and original Sheet renderer.');
    const disclosure = summary.closest('details');
    let state = 'sheet', current = null, message = '', disposed = false;
    const paragraph = (value, className = '') => { const node = document.createElement('p'); node.textContent = value; if (className) node.className = className; return node; };
    function render() {
      if (disposed) return;
      content.replaceChildren();
      if (disclosure && !disclosure.open) return;
      if (state === 'sheet') { renderSheet(); return; }
      if (state !== 'imported') { content.append(paragraph(message, 'dom-map-source-state')); return; }
      const view = current, source = view.summary;
      const title = document.createElement('h4'); title.textContent = view.label; content.append(title);
      if (source) content.append(paragraph(source.description));
      const metrics = document.createElement('dl'); metrics.className = 'dom-map-source-metrics';
      const metric = (label, value) => { const group = document.createElement('div'), key = document.createElement('dt'), count = document.createElement('dd'); key.textContent = label; count.textContent = number(value); group.append(key, count); metrics.append(group); };
      metric(view.unit, view.rowCount);
      if (source) { metric('Examined source rows', source.examinedRows); metric('Not shown in this view', source.notShownRows); }
      if (view.highlightedRows) metric('Highlighted in this map', view.highlightedRows);
      content.append(metrics);
      if (view.timeDomain) content.append(paragraph(`Observed time: ${view.timeDomain.map(time => new Date(time).toISOString()).join(' – ')} UTC.`, 'dom-map-source-scope'));
      if (source?.analysis) {
        content.append(paragraph(source.analysis.summary, 'dom-map-source-finding'));
        content.append(paragraph(`${number(source.analysis.candidateRows)} review candidates among ${number(source.analysis.eligibleRows)} eligible source records.${source.analysis.qualityExcludedRows === null ? '' : ` ${number(source.analysis.qualityExcludedRows)} ${source.analysis.qualityExcludedRows === 1 ? 'record' : 'records'} excluded by the quality screen.`}`, 'dom-map-source-scope'));
      } else content.append(paragraph('No anomaly analysis is attached to this map.', 'dom-map-source-scope'));
      if (source?.sourceUrl) { const link = document.createElement('a'); link.href = source.sourceUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.referrerPolicy = 'no-referrer'; link.textContent = 'Original source ↗'; content.append(link); }
      if (source?.license) content.append(paragraph(`License: ${source.license}`, 'dom-map-source-provenance'));
      if (source?.attribution) content.append(paragraph(source.attribution, 'dom-map-source-provenance'));
      if (!source?.sourceUrl) content.append(paragraph('No public source link is attached to this imported data.', 'dom-map-source-provenance'));
      const scroll = document.createElement('div'); scroll.className = 'dom-map-source-table-scroll'; scroll.tabIndex = 0;
      const table = document.createElement('table'), caption = document.createElement('caption'); caption.textContent = view.selectionLabel; table.append(caption);
      const head = document.createElement('thead'), header = document.createElement('tr');
      view.columns.forEach(column => { const field = document.createElement('th'); field.scope = 'col'; field.textContent = column.name; const type = document.createElement('small'); type.textContent = column.type; field.append(document.createElement('br'), type); header.append(field); }); head.append(header); table.append(head);
      const body = document.createElement('tbody');
      view.records.forEach(record => { const row = document.createElement('tr'); row.classList.toggle('is-candidate', record.candidate); row.dataset.sourceRow = String(record.sourceRow);
        record.cells.forEach((value, index) => { const cell = document.createElement(index === 0 ? 'th' : 'td'); if (index === 0) cell.scope = 'row'; cell.textContent = value.length > 180 ? `${value.slice(0, 177)}…` : value; if (value.length > 180) { cell.title = value; cell.tabIndex = 0; } row.append(cell); }); body.append(row); }); table.append(body); scroll.append(table); content.append(scroll);
      if (source?.warnings.length) { const notes = document.createElement('details'), heading = document.createElement('summary'), list = document.createElement('ul'); heading.textContent = 'Source and selection notes'; source.warnings.forEach(warning => { const item = document.createElement('li'); item.textContent = warning; list.append(item); }); notes.append(heading, list); content.append(notes); }
    }
    const toggle = event => { if (event.target === disclosure) render(); };
    disclosure?.addEventListener('toggle', toggle);
    summary.textContent = 'Live Google Sheet data · read-only view'; render();
    return Object.freeze({
      pending(label) { if (disposed) return; state = 'pending'; current = null; message = `Loading ${clean(label, 300)}. The source table will appear after Kepler confirms the map.`; summary.textContent = 'Map data · loading'; render(); },
      error(value) { if (disposed) return; state = 'error'; current = null; message = `Map data is unverified. ${clean(value, 1200)}`; summary.textContent = 'Map data · unverified'; render(); },
      commit(view) { if (disposed) return; if (!previews.has(view)) throw new Error('Use the preview derived from the exact confirmed map payload.'); current = view; state = 'imported'; summary.textContent = `Data behind this map · ${view.summary?.sourceLabel ?? view.label}`; render(); },
      dispose() { if (disposed) return; disposed = true; disclosure?.removeEventListener('toggle', toggle); content.replaceChildren(); current = null; }
    });
  }
  Object.defineProperty(window, 'DomMapSource', { configurable: true, value: Object.freeze({ validateSummary, preview, create }) });
})();
