/* Fixed Kepler.gl 2.2.0 recipes shared by Dom's browser and live-map receiver.
 * This module validates data, never evaluates it, fetches assets, or writes Sheets.
 */
/* global window */
(function (host) {
  'use strict';
  const MAX_LAT = 85.05112878;
  const HIGHLIGHT_COLOR = '#ff4b63', CONTEXT_COLOR = '#567b80';
  const TIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSS[Z]';
  // Pinned Kepler 2.2 validateInputData re-analyzes every column unless all
  // fields have analyzerType and timestamps match type-analyzer 0.2.5's format.
  // ISO UTC source strings remain unchanged; this is runtime metadata only.
  const RUNTIME_TIME_FORMAT = 'YYYY-M-DTHH:mm:ss.SSSS';
  const ANALYZER_TYPES = { integer: 'INT', real: 'FLOAT', boolean: 'BOOLEAN', string: 'STRING', timestamp: 'DATETIME', geojson: 'GEOMETRY_FROM_STRING' };
  const TYPES = new Set(['integer', 'real', 'boolean', 'string', 'timestamp', 'geojson']);
  const LAYERS = new Set(['point', 'heatmap', 'grid', 'hexagon', 'cluster', 'arc', 'line', 'trip', 'geojson', 'icon', 'hexagonId', 's2']);
  const ROLES = new Set(['latitude', 'longitude', 'startLatitude', 'startLongitude', 'endLatitude', 'endLongitude', 'time', 'endTime', 'geometry', 'icon', 'h3', 's2', 'value', 'category']);
  // IDs verified against the icon atlas loaded by the existing Kepler 2.2 app.
  const ICONS = new Set(['circle', 'star', 'car', 'car-taxi', 'circle-check']);
  const NUMERIC_ROLES = new Set(['latitude', 'longitude', 'startLatitude', 'startLongitude', 'endLatitude', 'endLongitude', 'value']);
  const PAIRS = [['latitude', 'longitude'], ['startLatitude', 'startLongitude'], ['endLatitude', 'endLongitude']];
  const PENTAGONS = new Set([4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117]);
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const fail = message => { throw new Error(message); };
  const keys = (value, required, optional = []) => {
    if (!record(value) || required.some(key => !own(value, key)) || Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) fail('Unexpected geographic payload fields.');
  };
  const text = (value, maximum = 1000) => typeof value === 'string' && value.length > 0 && value.length <= maximum && !Array.from(value).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
  const name = value => text(value, 120) && value.trim() === value && !['__proto__', 'prototype', 'constructor'].includes(value);
  const dense = value => {
    if (!Array.isArray(value) || value.length > 200000) return false;
    for (let index = 0; index < value.length; index++) if (!own(value, index)) return false;
    return true;
  };
  const numeric = type => type === 'integer' || type === 'real';
  const timestamp = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
  const tripTime = value => Number.isSafeInteger(value) && value >= 100000000000 && value <= 253402300799999;
  const position = value => Array.isArray(value) && value.length >= 2 && value.length <= 4 && value.every(Number.isFinite) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= MAX_LAT;

  function h3(value) {
    if (typeof value !== 'string' || !/^8[0-9a-f]{14}$/.test(value)) return false;
    const id = BigInt(`0x${value}`), resolution = Number((id >> 52n) & 15n), base = Number((id >> 45n) & 127n);
    if (((id >> 59n) & 15n) !== 1n || ((id >> 56n) & 7n) !== 0n || base > 121) return false;
    let leading = 0;
    for (let i = 0; i < 15; i++) {
      const digit = Number((id >> BigInt((14 - i) * 3)) & 7n);
      if ((i < resolution && digit === 7) || (i >= resolution && digit !== 7)) return false;
      if (i < resolution && leading === 0 && digit !== 0) leading = digit;
    }
    return !PENTAGONS.has(base) || leading !== 1;
  }

  function s2(value) {
    if (typeof value !== 'string' || !/^[0-9a-f]{1,16}$/.test(value) || value.endsWith('0')) return false;
    const id = BigInt(`0x${value.padEnd(16, '0')}`);
    return id > 0n && (id >> 61n) < 6n && ((id & -id) & 0x1555555555555555n) !== 0n;
  }

  /* S2 Hilbert/cube transforms follow s2-geometry 1.2.10, ISC licensed:
   * https://unpkg.com/s2-geometry@1.2.10/src/s2geometry.js
   * Copyright (c) 2012-2016, Jon Atkins <github@jonatkins.com>
   * Copyright (c) 2016, AJ ONeal <aj@daplie.com>
   * Permission to use, copy, modify, and/or distribute this software for any
   * purpose with or without fee is hereby granted, provided that the above
   * copyright notice and this permission notice appear in all copies.
   * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
   * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
   * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
   * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
   * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
   * OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
   * CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
   * Boundary sampling matches deck.gl 8.0.15 s2-utils.js (MIT):
   * https://github.com/visgl/deck.gl/blob/v8.0.15/modules/geo-layers/src/s2-layer/s2-utils.js
   * Copyright (c) 2015-2017 Uber Technologies, Inc. Permission is hereby granted,
   * free of charge, to any person obtaining a copy of this software and
   * associated documentation files (the "Software"), to deal in the Software
   * without restriction, including without limitation the rights to use, copy,
   * modify, merge, publish, distribute, sublicense, and/or sell copies of the
   * Software, and to permit persons to whom the Software is furnished to do so,
   * subject to the following conditions: The above copyright notice and this
   * permission notice shall be included in all copies or substantial portions
   * of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
   * KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
   * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
   * NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
   * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
   * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
   * USE OR OTHER DEALINGS IN THE SOFTWARE.
   */
  function s2BoundaryVertexCount(token) {
    const bits = BigInt(`0x${token.padEnd(16, '0')}`).toString(2).padStart(64, '0');
    const face = parseInt(bits.slice(0, 3), 2), positionBits = bits.slice(3, bits.lastIndexOf('1'));
    const level = positionBits.length / 2;
    if (level === 0) fail('Kepler 2.2 cannot safely draw S2 level-zero faces. Choose finer regional cells or split polygon geometry.');
    const digits = Array.from({ length: level }, (_, index) => parseInt(positionBits.slice(index * 2, index * 2 + 2), 2));
    let i = 0, j = 0;
    for (let index = level - 1; index >= 0; index--) {
      const digit = digits[index], rx = digit >= 2 ? 1 : 0, ry = digit === 1 || digit === 2 ? 1 : 0;
      const scale = 2 ** (level - index - 1);
      if (ry === 0) { if (rx === 1) { i = scale - 1 - i; j = scale - 1 - j; } [i, j] = [j, i]; }
      i += scale * rx; j += scale * ry;
    }
    if (face % 2 === 1) [i, j] = [j, i];
    const quadratic = value => value >= 0.5 ? (4 * value * value - 1) / 3 : (1 - 4 * (1 - value) * (1 - value)) / 3;
    const offsets = [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]];
    const resolution = Math.max(1, Math.ceil(100 * 2 ** -level)), size = 2 ** level;
    let previous = null, first = null;
    const check = point => {
      if (!Number.isFinite(point[0]) || !Number.isFinite(point[1]) || Math.abs(point[1]) > MAX_LAT || (previous && Math.abs(point[0] - previous[0]) > 180)) fail('Kepler 2.2 cannot safely draw S2 cells across the antimeridian or Mercator limits. Choose a regional cell table or split polygon geometry.');
      if (!first) first = point;
      previous = point;
    };
    for (let edge = 0; edge < 4; edge++) {
      for (let part = 1; part <= resolution; part++) {
        const fraction = part / resolution;
        const u = quadratic((i + offsets[edge][0] + (offsets[edge + 1][0] - offsets[edge][0]) * fraction) / size);
        const v = quadratic((j + offsets[edge][1] + (offsets[edge + 1][1] - offsets[edge][1]) * fraction) / size);
        const xyz = [[1, u, v], [-u, 1, v], [-u, -v, 1], [-1, -v, -u], [v, -1, -u], [v, u, -1]][face];
        check([Math.atan2(xyz[1], xyz[0]) * 180 / Math.PI, Math.atan2(xyz[2], Math.hypot(xyz[0], xyz[1])) * 180 / Math.PI]);
      }
    }
    check(first);
    return 4 * resolution + 1;
  }

  function geometry(value, state, isTrip) {
    let parsed = value;
    if (typeof parsed === 'string') {
      if (!text(parsed)) fail('Serialized geometry exceeds 1,000 characters or contains control characters; use a geometry object for longer paths.');
      try { parsed = JSON.parse(parsed); } catch { fail('Invalid GeoJSON text.'); }
    }
    const addPosition = point => {
      if (!position(point)) fail('Use finite longitude/latitude geometry within Web Mercator bounds.');
      if (++state.vertices > 200000) fail('The geographic request exceeds 200,000 vertices.');
      return point.slice();
    };
    const line = (points, minimum = 2, closed = false) => {
      if (!dense(points) || points.length < minimum || points.length > 200000) fail('Invalid GeoJSON line or ring.');
      const output = points.map(addPosition);
      if (closed && (output[0].length !== output.at(-1).length || output[0].some((item, index) => item !== output.at(-1)[index]))) fail('Polygon rings must close with their first coordinate.');
      return output;
    };
    const group = (items, transform) => {
      if (!dense(items) || !items.length || items.length > 200000) fail('Empty or oversized GeoJSON coordinate group.');
      return items.map(transform);
    };
    const visit = (item, depth = 0) => {
      if (!record(item) || depth > 6) fail('Invalid or deeply nested GeoJSON.');
      if (item.type === 'Feature') {
        keys(item, ['type', 'geometry'], ['properties', 'id', 'bbox']);
        const properties = item.properties ?? {};
        if (!record(properties) || Object.keys(properties).length > 40) fail('GeoJSON properties must be a small attribute object.');
        for (const [key, attribute] of Object.entries(properties)) {
          if (!name(key) || (attribute !== null && typeof attribute !== 'boolean' && !(typeof attribute === 'number' && Number.isFinite(attribute)) && !(typeof attribute === 'string' && (attribute.length === 0 || text(attribute))))) fail('Use scalar GeoJSON attributes with bounded names and strings.');
        }
        if (own(item, 'id') && !(typeof item.id === 'string' && text(item.id)) && !(typeof item.id === 'number' && Number.isSafeInteger(item.id))) fail('Invalid GeoJSON feature ID.');
        if (own(item, 'bbox') && (!Array.isArray(item.bbox) || ![4, 6].includes(item.bbox.length) || !item.bbox.every(Number.isFinite))) fail('Invalid GeoJSON bounding box.');
        return { type: 'Feature', properties: { ...properties }, geometry: visit(item.geometry, depth + 1), ...(own(item, 'id') ? { id: item.id } : {}) };
      }
      if (item.type === 'GeometryCollection') {
        if (isTrip) fail('Animated trips require individual LineString geometries.');
        keys(item, ['type', 'geometries']);
        return { type: item.type, geometries: group(item.geometries, child => visit(child, depth + 1)) };
      }
      keys(item, ['type', 'coordinates']);
      if (isTrip && item.type !== 'LineString') fail('Animated trips require timestamped LineStrings, not endpoints or other geometry.');
      let coordinates;
      switch (item.type) {
        case 'Point': coordinates = addPosition(item.coordinates); break;
        case 'MultiPoint': coordinates = group(item.coordinates, addPosition); break;
        case 'LineString': coordinates = line(item.coordinates, isTrip ? 3 : 2); break;
        case 'MultiLineString': coordinates = group(item.coordinates, points => line(points)); break;
        case 'Polygon': coordinates = group(item.coordinates, points => line(points, 4, true)); break;
        case 'MultiPolygon': coordinates = group(item.coordinates, polygon => group(polygon, points => line(points, 4, true))); break;
        default: fail('Use supported GeoJSON geometry, with one feature per row.');
      }
      if (isTrip) {
        let previous = -Infinity;
        for (const point of coordinates) {
          if (point.length !== 4 || !tripTime(point[3]) || point[3] <= previous) fail('Trips need at least three [longitude, latitude, altitude, Unix milliseconds] vertices with strictly increasing observed times.');
          previous = point[3];
        }
      }
      return { type: item.type, coordinates };
    };
    return visit(parsed);
  }

  function inspect(request) {
    keys(request, ['data', 'layer'], ['highlight', 'emphasis']);
    if (!LAYERS.has(request.layer)) fail('Unsupported geographic layer for Kepler 2.2.0.');
    const input = request.data;
    keys(input, ['label', 'fields', 'rows', 'roles']);
    if (!text(input.label, 160) || input.label.trim() !== input.label) fail('Use a short dataset label.');
    if (!dense(input.fields) || !input.fields.length || input.fields.length > 40) fail('Use 1–40 typed geographic fields.');
    if (!dense(input.rows) || !input.rows.length || input.rows.length > 100000) fail('Use 1–100,000 prepared geographic rows.');
    keys(input.roles, [] , [...ROLES]);
    const fields = input.fields.map(field => {
      keys(field, ['name', 'type'], ['format']);
      if (!name(field.name) || !TYPES.has(field.type)) fail('Use unique bounded names and supported Kepler field types.');
      if ((field.type === 'timestamp' && field.format !== TIME_FORMAT) || (field.type !== 'timestamp' && own(field, 'format'))) fail('Timestamp fields require the canonical ISO UTC format; other field formats are not accepted.');
      return { name: field.name, type: field.type, ...(field.type === 'timestamp' ? { format: TIME_FORMAT } : {}) };
    });
    const indices = new Map(fields.map((field, index) => [field.name, index]));
    if (indices.size !== fields.length) fail('Geographic field names must be unique.');
    const roles = { ...input.roles }, assigned = new Set();
    for (const [role, fieldName] of Object.entries(roles)) {
      if (!name(fieldName) || !indices.has(fieldName) || assigned.has(fieldName)) fail('Each geographic role must reference a distinct existing field.');
      assigned.add(fieldName);
      const type = fields[indices.get(fieldName)].type;
      if (NUMERIC_ROLES.has(role) ? !numeric(type) : role === 'time' || role === 'endTime' ? type !== 'timestamp' : role === 'geometry' ? type !== 'geojson' : role === 'category' ? !['string', 'boolean', 'integer'].includes(type) : type !== 'string') fail(`Incorrect field type for geographic role ${role}.`);
    }
    for (const [latitude, longitude] of PAIRS) if (Boolean(roles[latitude]) !== Boolean(roles[longitude])) fail('Coordinate role pairs must be complete.');
    const pointPair = roles.latitude ? ['latitude', 'longitude'] : roles.startLatitude ? ['startLatitude', 'startLongitude'] : null;
    const required = [];
    if (['point', 'heatmap', 'grid', 'hexagon', 'cluster', 'icon', 'hexagonId', 's2'].includes(request.layer)) {
      if (!pointPair) fail('This layer needs observed latitude/longitude roles; indexed cells also need supplied centroid columns for camera bounds.');
      required.push(...pointPair);
    }
    if (request.layer === 'arc' || request.layer === 'line') required.push('startLatitude', 'startLongitude', 'endLatitude', 'endLongitude');
    if (request.layer === 'trip' || request.layer === 'geojson') required.push('geometry');
    if (request.layer === 'icon') required.push('icon');
    if (request.layer === 'hexagonId') required.push('h3');
    if (request.layer === 's2') required.push('s2');
    if (required.some(role => !roles[role])) fail('The requested layer lacks required geographic roles. Origin/destination pairs do not supply a measured trip path.');
    const state = { vertices: 0 }, h3Resolutions = new Set();
    const rows = input.rows.map(row => {
      if (!dense(row) || row.length !== fields.length) fail('Every geographic row must match the declared field count.');
      const normalized = row.map((value, index) => {
        if (value === null) return null;
        const type = fields[index].type;
        switch (type) {
          case 'integer': if (!Number.isSafeInteger(value)) fail('Integer fields require safe integer values or null.'); break;
          case 'real': if (typeof value !== 'number' || !Number.isFinite(value)) fail('Real fields require finite numbers or null.'); break;
          case 'boolean': if (typeof value !== 'boolean') fail('Boolean fields require true, false or null.'); break;
          case 'string': if (typeof value !== 'string' || (value.length !== 0 && !text(value))) fail('String fields require strings of at most 1,000 characters or null.'); break;
          case 'timestamp': if (!timestamp(value)) fail('Timestamp fields require exact observed ISO UTC values or null.'); break;
          case 'geojson': return geometry(value, state, request.layer === 'trip' && roles.geometry === fields[index].name);
        }
        return value;
      });
      if (required.some(role => normalized[indices.get(roles[role])] === null)) fail('Clean or exclude missing required geographic values before requesting a layer.');
      for (const [latitude, longitude] of PAIRS) {
        if (!roles[latitude]) continue;
        const lat = normalized[indices.get(roles[latitude])], lng = normalized[indices.get(roles[longitude])];
        if ((lat === null) !== (lng === null) || (lat !== null && (Math.abs(lat) > MAX_LAT || Math.abs(lng) > 180))) fail('Coordinate roles require complete finite Web Mercator longitude/latitude pairs.');
      }
      if (roles.time && roles.endTime) {
        const start = normalized[indices.get(roles.time)], end = normalized[indices.get(roles.endTime)];
        if (start !== null && end !== null && Date.parse(end) < Date.parse(start)) fail('Observed trip end time precedes its start time.');
      }
      if (roles.icon && normalized[indices.get(roles.icon)] !== null && !ICONS.has(normalized[indices.get(roles.icon)])) fail('Use a supported fixed icon name: circle, star, car, car-taxi or circle-check.');
      if (roles.h3 && normalized[indices.get(roles.h3)] !== null) {
        const value = normalized[indices.get(roles.h3)];
        if (!h3(value)) fail('Invalid canonical H3 cell index.');
        h3Resolutions.add(Number((BigInt(`0x${value}`) >> 52n) & 15n));
      }
      if (roles.s2 && normalized[indices.get(roles.s2)] !== null) {
        const value = normalized[indices.get(roles.s2)];
        if (!s2(value)) fail('Invalid canonical S2 cell token.');
        if (request.layer === 's2') {
          state.vertices += s2BoundaryVertexCount(value);
          if (state.vertices > 200000) fail('The geographic request exceeds 200,000 vertices including derived S2 boundaries.');
        }
      }
      return normalized;
    });
    if (request.layer === 'hexagonId' && h3Resolutions.size !== 1) fail('Use one declared H3 resolution per layer.');
    let highlight = null;
    if (own(request, 'highlight')) {
      keys(request.highlight, ['sourceRows']);
      const ids = request.highlight.sourceRows, sourceIndex = indices.get('source_row');
      if (!['point', 'arc', 'line', 'geojson', 'trip'].includes(request.layer)) fail('Exact source-row highlights require an individual point, connection or geometry layer.');
      if (!dense(ids) || !ids.length || ids.length > 2000 || ids.some(id => !Number.isSafeInteger(id) || id < 1) || new Set(ids).size !== ids.length) fail('Highlight 1–2,000 distinct positive source_row IDs.');
      if (sourceIndex === undefined || fields[sourceIndex].type !== 'integer') fail('Highlights require an integer source_row identity field.');
      const existing = new Set(rows.map(row => row[sourceIndex]));
      if (existing.size !== rows.length || [...existing].some(id => !Number.isSafeInteger(id) || id < 1) || ids.some(id => !existing.has(id))) fail('Highlighted IDs must exist in a unique positive source_row identity field.');
      highlight = { sourceRows: ids.slice().sort((a, b) => a - b), highlightedRows: ids.length, color: HIGHLIGHT_COLOR };
    }
    let emphasis = null;
    if (own(request, 'emphasis')) {
      keys(request.emphasis, ['field', 'value', 'selectedRows', 'caption']);
      const { field, value, selectedRows, caption } = request.emphasis, index = indices.get(field);
      if (highlight || request.layer !== 'point' || field !== roles.category || index === undefined || fields[index].type !== 'string') fail('Category emphasis requires a point layer and its string category role, without an identity highlight.');
      if (!text(value) || !text(caption, 700) || !caption.trim() || !Number.isSafeInteger(selectedRows) || selectedRows < 1 || selectedRows > rows.length || rows.filter(row => row[index] === value).length !== selectedRows) fail('Category emphasis must match the exact value and selected count across all mapped rows.');
      const distinctLocations = new Set(rows.map(row => `${row[indices.get(roles[pointPair[1]])]},${row[indices.get(roles[pointPair[0]])]}`)).size;
      emphasis = { field, value, selectedRows, caption, contextRows: rows.length - selectedRows, distinctLocations, color: HIGHLIGHT_COLOR, contextColor: CONTEXT_COLOR };
    }
    return { data: { label: input.label, fields, rows, roles }, layer: request.layer, pointPair, indices, highlight, emphasis };
  }

  function validate(request) { inspect(request); }

  function build(request) {
    const checked = inspect(request), { data, layer: type, pointPair, indices, highlight, emphasis } = checked;
    const { fields, rows, roles } = data;
    // The source retains its 40-field input budget. This single trusted derived
    // field is added only after validation and never overwrites a source column.
    let highlightField = null, highlightDomain = [];
    if (highlight || emphasis) {
      let name = 'dom_r_candidate'; while (indices.has(name)) name += '_';
      highlightField = { name, type: 'string' };
      const selected = new Set(highlight?.sourceRows), sourceIndex = indices.get('source_row'), categoryIndex = emphasis ? indices.get(emphasis.field) : null;
      indices.set(name, fields.length); fields.push(highlightField);
      for (const row of rows) row.push((emphasis ? row[categoryIndex] === emphasis.value : selected.has(row[sourceIndex])) ? '1_candidate' : '0_context');
      highlightDomain = [...new Set(rows.map(row => row[indices.get(name)]))].sort();
    }
    const dataId = 'dom_geography', layerId = `dom_geo_${type}`;
    let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
    let minimum = Infinity, maximum = -Infinity;
    const extend = coordinate => { west = Math.min(west, coordinate[0]); south = Math.min(south, coordinate[1]); east = Math.max(east, coordinate[0]); north = Math.max(north, coordinate[1]); };
    const time = value => { minimum = Math.min(minimum, value); maximum = Math.max(maximum, value); };
    const visitCoordinates = value => {
      if (typeof value[0] === 'number') { extend(value); if (type === 'trip') time(value[3]); }
      else for (const child of value) visitCoordinates(child);
    };
    const visitGeometry = value => {
      if (value.type === 'Feature') visitGeometry(value.geometry);
      else if (value.type === 'GeometryCollection') value.geometries.forEach(visitGeometry);
      else visitCoordinates(value.coordinates);
    };
    const timeRole = roles.time ?? roles.endTime;
    for (const row of rows) {
      if (type === 'arc' || type === 'line') {
        extend([row[indices.get(roles.startLongitude)], row[indices.get(roles.startLatitude)]]);
        extend([row[indices.get(roles.endLongitude)], row[indices.get(roles.endLatitude)]]);
      } else if (type === 'geojson' || type === 'trip') visitGeometry(row[indices.get(roles.geometry)]);
      else extend([row[indices.get(roles[pointPair[1]])], row[indices.get(roles[pointPair[0]])]]);
      if (type !== 'trip' && timeRole && row[indices.get(timeRole)] !== null) time(Date.parse(row[indices.get(timeRole)]));
    }
    const timeDomain = Number.isFinite(minimum) && maximum > minimum ? [minimum, maximum] : null;
    if (type === 'trip' && !timeDomain) fail('Measured trip trajectories require a finite nonzero time span.');
    const colorRange = { name: 'Dom warmth', type: 'sequential', category: 'Custom', colors: ['#24293E', '#5C4D7D', '#BC597B', '#EF8354', '#FFD08A', '#FFF4DB'] };
    const column = role => roles[role];
    const measure = role => roles[role] ? { name: roles[role], type: fields[indices.get(roles[role])].type } : null;
    let columns = pointPair ? { lat: column(pointPair[0]), lng: column(pointPair[1]) } : {};
    const label = { point: 'Individual observations', heatmap: 'Event-count density; not probability or risk', grid: 'Event counts per grid cell', hexagon: 'Event counts per hexagonal bin', cluster: 'Display clusters of observations', arc: 'Start → end flows; not traveled routes', line: 'Start → end flows; not traveled routes', geojson: 'Observed geographic features', trip: 'Measured timestamped trajectories', icon: 'Categorized locations', hexagonId: 'H3 indexed cells', s2: 'S2 indexed cells' }[type];
    let visConfig = { opacity: 0.8, colorRange }, visualChannels = {};
    const categoryColor = type === 'trip' ? measure('category') : null;
    const colorField = categoryColor ?? measure('value') ?? measure('category');
    if (['point', 'geojson', 'trip', 'icon', 'hexagonId', 's2', 'arc', 'line'].includes(type)) visualChannels = { colorField, colorScale: categoryColor || (colorField && !numeric(colorField.type)) ? 'ordinal' : 'quantile' };
    if (type === 'point') visConfig = { ...visConfig, radius: 5, fixedRadius: false, filled: true, stroked: false };
    if (type === 'heatmap') {
      visConfig = { ...visConfig, radius: 35 };
      visualChannels = { weightField: null, weightScale: 'linear' };
    }
    if (type === 'grid' || type === 'hexagon') {
      // Kepler expects kilometers. Target about 70 bins across the plotted
      // extent, rather than making sub-kilometer cells invisible on world maps.
      // Bounds remain conservative at the antimeridian; no wrapped path is made.
      const midLatitudeRadians = ((south + north) / 2) * Math.PI / 180;
      const spanKilometers = Math.max((north - south) * 111.32, (east - west) * 111.32 * Math.cos(midLatitudeRadians));
      const cellKilometers = Math.round(Math.min(250, Math.max(0.1, spanKilometers / 70)) * 1000) / 1000;
      visConfig = { ...visConfig, worldUnitSize: cellKilometers, coverage: 0.85, enable3d: false, colorAggregation: 'count', sizeAggregation: 'count', elevationScale: 5, sizeRange: [0, 500] };
      visualChannels = { colorField: null, colorScale: 'quantize', sizeField: null, sizeScale: 'linear' };
    }
    if (type === 'cluster') { visConfig = { ...visConfig, clusterRadius: 40, radiusRange: [5, 40], colorAggregation: 'count' }; visualChannels = { colorField: null, colorScale: 'quantize' }; }
    if (type === 'arc' || type === 'line') { columns = { lat0: column('startLatitude'), lng0: column('startLongitude'), lat1: column('endLatitude'), lng1: column('endLongitude') }; visConfig = { ...visConfig, opacity: 0.5, thickness: 1 }; }
    if (type === 'geojson') { columns = { geojson: column('geometry') }; visConfig = { ...visConfig, filled: true, stroked: true, enable3d: false, thickness: 0.8, radius: 5 }; }
    if (type === 'trip') {
      columns = { geojson: column('geometry') };
      // The pinned layer's thickness is zoom-scaled meters, not CSS pixels.
      // 1.2 is approximately 2.7 pixels around Porto at the fitted urban zoom.
      visConfig = { ...visConfig, opacity: 0.95, thickness: 1.2, trailLength: 180,
        colorRange: { name: 'Dom motion', type: 'qualitative', category: 'Custom', colors: ['#FFCA70', '#63E6DE', '#BE9AFF'] } };
    }
    if (type === 'icon') { columns.icon = column('icon'); visConfig = { ...visConfig, radius: 14, fixedRadius: false }; }
    if (type === 'hexagonId' || type === 's2') { columns = type === 'hexagonId' ? { hex_id: column('h3') } : { token: column('s2') }; visConfig = { ...visConfig, coverage: 0.9, filled: true, stroked: true, enable3d: false, elevationScale: 5, sizeRange: [0, 500] }; }
    if (highlight || emphasis) {
      visualChannels = { colorField: highlightField, colorScale: 'ordinal' };
      // Ordinal colors follow the sorted observed domain; an all-flagged sample
      // still maps its sole candidate category to red.
      visConfig = { ...visConfig, ...(emphasis ? { radius: 32 } : {}), opacity: type === 'trip' ? 0.95 : 0.85, colorRange: { name: emphasis ? 'Selected records and context' : 'R-screen candidates', type: 'qualitative', category: 'Custom', colors: highlightDomain.map(value => value === '1_candidate' ? HIGHLIGHT_COLOR : CONTEXT_COLOR) } };
      // Pinned GeoJsonLayer colors line paths and polygon outlines through a
      // separate channel; coloring only fills would leave measured paths orange.
      if (type === 'geojson') {
        visualChannels = { ...visualChannels, strokeColorField: highlightField, strokeColorScale: 'ordinal' };
        visConfig = { ...visConfig, strokeColorRange: { ...visConfig.colorRange, colors: visConfig.colorRange.colors.slice() }, strokeOpacity: 0.85 };
      }
    }
    const layer = { id: layerId, type, config: { dataId, label, color: [239, 131, 84], columns, isVisible: true, visConfig }, visualChannels };
    const filters = type !== 'trip' && timeDomain && timeRole ? [{ id: 'dom_geography_time', dataId: [dataId], name: [timeRole], type: 'timeRange', value: timeDomain.slice(), enlarged: true, plotType: 'histogram', animationWindow: 'free', speed: 1 }] : [];
    // Kepler 2.2 adds render-only `properties.index` to Feature objects. Keep
    // evidence in its actual data table immutable by giving it GeoJSON strings;
    // its renderer parses a separate object. Geometry roles/types stay GeoJSON.
    const preparedRows = rows.map(row => row.map((value, index) => fields[index].type === 'geojson' && value !== null ? JSON.stringify(value) : value));
    const preparedFields = fields.map(field => ({ name: field.name, type: field.type, format: field.type === 'timestamp' ? RUNTIME_TIME_FORMAT : '', analyzerType: ANALYZER_TYPES[field.type] }));
    // The pinned renderer sorts its ordinal domain. Match that exact ordering
    // for the visible key, including numeric/boolean category fields.
    const categoryValues = categoryColor ? [...new Set(rows.map(row => row[indices.get(roles.category)]).filter(value => value !== null))].sort() : [];
    const tripLegend = highlight ? [] : categoryValues.map((value, index) => ({ value, label: String(value), color: visConfig.colorRange.colors[index % visConfig.colorRange.colors.length] }));
    const tripIntervals = type === 'trip' ? rows.map(row => {
      const value = row[indices.get(roles.geometry)], coordinates = value.type === 'Feature' ? value.geometry.coordinates : value.coordinates;
      return [coordinates[0][3], coordinates[coordinates.length - 1][3]];
    }) : [];
    return { dataId, layerId, rowCount: rows.length, bounds: [west, south, east, north], timeDomain, animationKind: type === 'trip' ? 'trip' : filters.length ? 'filter' : null, tripLegend, tripIntervals, highlight, emphasis, highlightField, highlightDomain,
      payload: { datasets: { info: { id: dataId, label: data.label }, data: { fields: preparedFields, rows: preparedRows } }, options: { centerMap: true, readOnly: false, keepExistingConfig: false }, config: { version: 'v1', config: { visState: { layers: [layer], filters, animationConfig: { currentTime: type === 'trip' ? minimum : null, speed: 1 } } } } } };
  }

  host.DomGeographyTools = Object.freeze({ validate, build });
})(typeof window !== 'undefined' ? window : globalThis);
