/* global document, window */
(() => {
  'use strict';
  if (window.DomLiveTools) return;
  const VERSION = 1, READY_TIMEOUT = 60000, COMMAND_TIMEOUT = 60000, SUBMIT_TIMEOUT = 180000, GUIDED_REVIEW_TIMEOUT = 600000, MAX_PENDING = 4, MAX_REQUESTS = 256;
  const HENRYS_SHEET = 'https://docs.google.com/spreadsheets/d/1dbPJFuL9uoZl-pwMCb-XigVU1n2RRrUW3h13l4-7lnw/preview?gid=1292912831#gid=1292912831';
  const ACTIONS = Object.freeze({ henrys: ['henry-prepare-booking', 'henry-start-guided-booking', 'henry-advance-booking', 'henry-submit-booking', 'henry-read-booking'], kepler: ['kepler-load-failures', 'kepler-render-geography', 'kepler-set-controls'] });
  const GUIDED_STEPS = Object.freeze(['date', 'city', 'service', 'email', 'phone', 'address', 'personnel', 'assignment', 'book']);
  const REVIEW_FIELDS = ['runId', 'reviewId', 'reviewHash', 'date', 'time', 'city', 'service', 'assignedName'];
  const PROGRESS = Object.freeze({ 'henry-prepare-booking': ['opening-form', 'entering-details', 'choosing-assignment'], 'henry-submit-booking': ['pressing-book', 'checking-sheet'], 'henry-read-booking': ['checking-sheet'] });
  const POINT_FIELDS = ['source_row', 'latitude', 'longitude', 'failed', 'requested_at', 'zero_coordinate_pair'];
  let configuration = { henrys: null, kepler: null }, active = null;
  // One owned session per fixed tool. Presentation switches must not revoke a
  // booking already in flight or rebuild an imported map behind the visitor.
  const contexts = new Map();
  const seen = new Set(), recoveries = new Map();
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [null, Object.prototype].includes(Object.getPrototypeOf(value));
  const keys = (value, expected) => record(value) && Object.keys(value).sort().join(',') === [...expected].sort().join(',');
  const text = (value, maximum = 120) => typeof value === 'string' && value.length > 0 && value.length <= maximum && !Array.from(value).some(character => character.charCodeAt(0) < 32);
  const token = value => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
  const runId = value => typeof value === 'string' && /^DOMTEST-[a-f0-9]{32}$/.test(value);
  const reviewId = value => text(value, 128) && /^[a-zA-Z0-9_-]{8,128}$/.test(value);
  const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
  const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
  const time = value => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  const city = value => ['Mesa', 'Chandler'].includes(value);
  const service = value => ['Standard Poop Pickup', 'Premium Service'].includes(value);
  const labFrame = () => document.querySelector('iframe.portfolio-lab-frame');
  const availability = () => ({ henrys: configuration.henrys !== null, kepler: configuration.kepler !== null });
  function nonce() {
    const bytes = new Uint8Array(16); window.crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  function validEnvelope(value) {
    const base = ['type', 'id', 'tool', 'action', 'payload'];
    return (keys(value, base) || (keys(value, [...base, 'sourceSummary']) && value.tool === 'kepler' && value.action !== 'kepler-set-controls')) && value.type === 'dom-live-tool-request' && token(value.id)
      && Object.hasOwn(ACTIONS, value.tool) && ACTIONS[value.tool].includes(value.action) && record(value.payload);
  }
  function copyPayload(tool, action, payload) {
    if (tool === 'kepler' && action === 'kepler-set-controls') {
      if (!keys(payload, ['visible']) || typeof payload.visible !== 'boolean') throw new Error('Choose whether to show or hide the map controls.');
      return { visible: payload.visible };
    }
    if (tool === 'kepler' && action === 'kepler-render-geography') {
      if (!keys(payload, ['data', 'layer', 'play', ...['highlight', 'emphasis'].filter(key => Object.hasOwn(payload, key))]) || typeof payload.play !== 'boolean' || !window.DomGeographyTools) throw new Error('Use a typed geographic table and one supported map view.');
      window.DomGeographyTools.validate({ data: payload.data, layer: payload.layer, ...(Object.hasOwn(payload, 'highlight') ? { highlight: payload.highlight } : {}), ...(Object.hasOwn(payload, 'emphasis') ? { emphasis: payload.emphasis } : {}) });
      return JSON.parse(JSON.stringify(payload));
    }
    if (tool === 'kepler') {
      if (!(keys(payload, ['rows']) || (keys(payload, ['rows', 'play']) && typeof payload.play === 'boolean')) || !Array.isArray(payload.rows) || payload.rows.length < 1 || payload.rows.length > 100000) throw new Error('Choose 1–100,000 validated failure points and an optional playback choice.');
      const ids = new Set();
      const rows = payload.rows.map(point => {
        if (!keys(point, POINT_FIELDS) || !Number.isSafeInteger(point.source_row) || point.source_row < 1 || ids.has(point.source_row)) throw new Error('Failure points need distinct positive source-row IDs and the expected fields.');
        ids.add(point.source_row);
        if (!Number.isFinite(point.latitude) || Math.abs(point.latitude) > 85.05112878 || !Number.isFinite(point.longitude) || Math.abs(point.longitude) > 180 || point.failed !== 1
          || point.zero_coordinate_pair !== (point.latitude === 0 && point.longitude === 0)) throw new Error('Failure-point coordinates or outcome flags are invalid.');
        if (point.requested_at !== null && (typeof point.requested_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(point.requested_at)
          || !Number.isFinite(Date.parse(point.requested_at)) || new Date(point.requested_at).toISOString() !== point.requested_at)) throw new Error('Failure points need normalized observed UTC times or null.');
        return Object.fromEntries(POINT_FIELDS.map(name => [name, point[name]]));
      });
      return { rows, ...(Object.hasOwn(payload, 'play') ? { play: payload.play } : {}) };
    }
    if (action === 'henry-prepare-booking' || action === 'henry-start-guided-booking') {
      if (!keys(payload, ['runId', 'date', 'time', 'city', 'service']) || !runId(payload.runId) || !day(payload.date) || !time(payload.time) || !city(payload.city) || !service(payload.service)) throw new Error('Choose a valid labeled test booking, date, time, city and service.');
      return { runId: payload.runId, date: payload.date, time: payload.time, city: payload.city, service: payload.service };
    }
    if (action === 'henry-advance-booking') {
      if (!keys(payload, ['runId', 'reviewId', 'reviewHash', 'step']) || !runId(payload.runId) || !reviewId(payload.reviewId) || !hash(payload.reviewHash)
        || !GUIDED_STEPS.includes(payload.step)) throw new Error('Continue the current guided review using its next fixed step.');
      return { runId: payload.runId, reviewId: payload.reviewId, reviewHash: payload.reviewHash, step: payload.step };
    }
    if (action === 'henry-submit-booking') {
      if (!keys(payload, ['runId', 'reviewId', 'reviewHash', 'visitorConfirmed']) || !runId(payload.runId) || !reviewId(payload.reviewId) || !hash(payload.reviewHash) || payload.visitorConfirmed !== true) throw new Error('Review the prepared booking and explicitly confirm it before submission.');
      return { runId: payload.runId, reviewId: payload.reviewId, reviewHash: payload.reviewHash, visitorConfirmed: true };
    }
    if (!keys(payload, ['runId']) || !runId(payload.runId)) throw new Error('Choose the labeled test booking to check.');
    return { runId: payload.runId };
  }
  function localResult(request, message, context = null, sequence = 0, phase = 'error') {
    return { type: 'dom-live-tool-result', version: VERSION, tool: request.tool, session: context?.session ?? null,
      id: request.id, seq: sequence, action: request.action, ok: false, phase, message };
  }
  function sendAvailability(target) {
    target?.postMessage({ type: 'dom-live-tool-availability', available: availability() }, window.location.origin);
  }
  function finish(context, pending, result) {
    if (!context.pending.has(pending.request.id)) return;
    window.clearTimeout(pending.timer); context.pending.delete(pending.request.id);
    if (context.inflight === pending) context.inflight = null;
    pending.reply(result); pending.resolve(result);
    if (contexts.get(context.tool) === context && !context.stopped) pump(context);
  }
  function rejectPending(context, pending, message) {
    const uncertain = pending.sent && pending.request.action === 'henry-submit-booking';
    if (context.tool === 'kepler' && pending.sent && pending.request.action !== 'kepler-set-controls') context.view?.sourceError?.(message);
    context.view?.narrate?.(uncertain ? 'unverified' : 'error');
    context.status.textContent = message;
    finish(context, pending, localResult(pending.request, message, context, pending.seq, uncertain ? 'unverified' : 'error'));
  }
  function stop() {
    for (const context of [...contexts.values()]) stopContext(context);
  }
  function stopContext(context, { retainView = false } = {}) {
    if (!context || contexts.get(context.tool) !== context) return;
    contexts.delete(context.tool);
    if (active === context) active = [...contexts.values()].at(-1) ?? null;
    context.stopped = true; window.clearTimeout(context.readyTimer);
    // Presentation changes can be queued while React replaces one tour with
    // another. Revoke only the run which actually owned this tool session.
    if (context.tool === 'henrys' && runId(context.ownerRunId))
      context.callerFrame?.contentWindow?.postMessage({ type: 'dom-henry-tour-stop', runId: context.ownerRunId }, window.location.origin);
    window.removeEventListener('message', context.listener);
    context.callerFrame?.removeEventListener('load', context.onCallerLoad);
    context.panel.removeEventListener(context.disposeEvent ?? 'dom-henrys-disposed', context.onDispose);
    if (context.onVisible) context.panel.removeEventListener('dom-henrys-revealed', context.onVisible);
    for (const pending of [...context.pending.values()]) rejectPending(context, pending,
      pending.sent && pending.request.action === 'henry-submit-booking'
        ? 'The view was closed after submission. The booking may still complete; closing does not undo it.' : 'The tool session was stopped.');
    context.prepared = null; context.guidedReview = null; context.guidedCursor = 0; context.guidedExpiresAt = null; context.guidedAudit = null;
    context.transaction = null; context.source = null;
    context.unsubscribeClose?.();
    if (context.view) { if (!retainView) context.view.dispose(); }
    else { context.frame.removeAttribute('src'); context.sheet?.removeAttribute('src'); context.panel.remove(); }
  }
  function validReview(context, request) {
    const payload = request.payload;
    if (request.action === 'henry-advance-booking') {
      const guided = context.guidedReview;
      if (!guided || guided.runId !== payload.runId || guided.reviewId !== payload.reviewId || guided.reviewHash !== payload.reviewHash
        || payload.step !== GUIDED_STEPS[context.guidedCursor] || Date.now() >= context.guidedExpiresAt)
        throw new Error('This step does not match the next step of the current guided review. Start a fresh review if it has expired.');
    }
    if (request.action === 'henry-submit-booking') {
      const prepared = context.prepared;
      if (!prepared || prepared.runId !== payload.runId || prepared.reviewId !== payload.reviewId || prepared.reviewHash !== payload.reviewHash || payload.visitorConfirmed !== true
        || (context.guidedReview && (context.guidedCursor !== GUIDED_STEPS.length || Date.now() >= context.guidedExpiresAt)))
        throw new Error('This confirmation does not match the latest prepared booking. Prepare and review it again.');
    }
    if (request.action === 'henry-read-booking' && context.transaction?.runId !== payload.runId) throw new Error('Only the test booking submitted in this active session can be checked.');
  }
  function pump(context) {
    if (contexts.get(context.tool) !== context || !context.source || context.inflight || context.stopped) return;
    // A retained Google iframe needs a render turn after display:none. The
    // presentation host acknowledges that boundary before native DOM actions.
    if (context.tool === 'henrys' && context.panel.dataset.resuming === 'true') return;
    const pending = context.pending.values().next().value; if (!pending) return;
    try { validReview(context, pending.request); }
    catch (error) { rejectPending(context, pending, error.message); return; }
    if (pending.request.action === 'henry-submit-booking') {
      context.transaction = { ...context.prepared }; context.prepared = null;
      // A stopped/failed view revokes its write capability, not the exact run's
      // read-only recovery reference. Keep this bounded and only in this page.
      recoveries.delete(context.transaction.runId);
      recoveries.set(context.transaction.runId, { transaction: { ...context.transaction }, callerFrame: context.callerFrame });
      if (recoveries.size > 16) recoveries.delete(recoveries.keys().next().value);
    }
    pending.sent = true; context.inflight = pending;
    if (context.tool === 'kepler' && pending.request.action !== 'kepler-set-controls') context.view?.sourcePending?.(pending.sourcePreview?.label ?? 'Imported map data');
    if (pending.request.action === 'henry-advance-booking') context.view?.prepareStep?.(pending.request.payload.step, { ...context.guidedReview });
    if (pending.request.action === 'henry-start-guided-booking') context.view?.narrate?.('opening-form');
    if (Object.hasOwn(PROGRESS, pending.request.action)) context.view?.narrate?.(pending.request.action === 'henry-prepare-booking' ? 'opening-form' : pending.request.action === 'henry-submit-booking' ? 'pressing-book' : 'checking-sheet');
    context.status.textContent = pending.request.action === 'kepler-render-geography' ? 'Sending typed geography to Kepler and checking the selected layer…'
      : pending.request.action === 'kepler-set-controls' ? 'Updating the existing map controls…'
      : pending.request.action === 'kepler-load-failures' ? 'Sending reviewed failure locations to Kepler…'
      : pending.request.action === 'henry-prepare-booking' ? 'Preparing the test booking for review…'
        : pending.request.action === 'henry-start-guided-booking' ? 'Preparing the guided test review without submitting a booking…'
          : pending.request.action === 'henry-advance-booking' ? `Checking the ${pending.request.payload.step} step in the original booking form…`
        : pending.request.action === 'henry-submit-booking' ? 'Submitting the confirmed test booking and checking the Sheet…' : 'Checking the submitted test booking in the Sheet…';
    pending.timer = window.setTimeout(() => rejectPending(context, pending, pending.request.action === 'henry-submit-booking'
      ? 'The response timed out after submission. The booking may exist; check the booking instead of submitting it again.' : 'The tool did not return a result in time.'), pending.request.action === 'henry-submit-booking' ? SUBMIT_TIMEOUT : pending.request.action === 'kepler-set-controls' ? 6000 : COMMAND_TIMEOUT);
    try {
      context.source.postMessage({ type: 'dom-live-tool-command', version: VERSION, tool: context.tool, session: context.session,
        id: pending.request.id, seq: pending.seq, action: pending.request.action, payload: pending.request.payload }, context.configuration.origin);
    } catch { rejectPending(context, pending, 'The tool connection could not receive this command.'); }
  }
  function safeReview(data, expected) {
    if (!keys(data, REVIEW_FIELDS) || !reviewId(data.reviewId) || !hash(data.reviewHash) || !text(data.assignedName)) throw new Error('Henry’s did not return a valid booking review.');
    for (const name of ['runId', 'date', 'time', 'city', 'service']) if (data[name] !== expected[name]) throw new Error('The prepared booking differs from the requested test details.');
    return Object.fromEntries(REVIEW_FIELDS.map(name => [name, data[name]]));
  }
  function safeAudit(data, review) {
    if (data === null) return null;
    const safeText = value => typeof value === 'string' && /^[\p{L}\p{N} .,'’_:;()/-]{1,100}$/u.test(value);
    const optionalBoolean = value => value === null || typeof value === 'boolean';
    if (!keys(data, ['checkedAt', 'timezone', 'date', 'time', 'city', 'windowStart', 'windowEnd', 'selectedName', 'selectionMatches', 'workers'])
      || typeof data.checkedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(data.checkedAt)
      || !Number.isFinite(Date.parse(data.checkedAt)) || new Date(data.checkedAt).toISOString() !== data.checkedAt
      || data.timezone !== 'America/Phoenix' || !day(data.date) || !day(data.windowStart) || !day(data.windowEnd) || !time(data.time) || !city(data.city)
      || data.date !== review.date || data.time !== review.time || data.city !== review.city || data.selectedName !== review.assignedName || !safeText(data.selectedName)
      || data.windowStart !== review.date || Date.parse(data.windowEnd + 'T00:00:00Z') - Date.parse(data.windowStart + 'T00:00:00Z') !== 7 * 86400000
      || !optionalBoolean(data.selectionMatches) || !Array.isArray(data.workers) || data.workers.length > 50
      || !data.workers.every(worker => keys(worker, ['row', 'name', 'region', 'workingHours', 'calendarConfigured', 'regionMatches', 'withinHours', 'weeklyAppointments', 'slotConflict', 'selected'])
        && Number.isSafeInteger(worker.row) && worker.row >= 2 && worker.row <= 500 && safeText(worker.name) && safeText(worker.region) && safeText(worker.workingHours)
        && typeof worker.calendarConfigured === 'boolean' && typeof worker.regionMatches === 'boolean' && typeof worker.selected === 'boolean'
        && optionalBoolean(worker.withinHours) && optionalBoolean(worker.slotConflict)
        && (worker.weeklyAppointments === null || Number.isSafeInteger(worker.weeklyAppointments) && worker.weeklyAppointments >= 0 && worker.weeklyAppointments <= 10000)))
      throw new Error('Henry’s returned an invalid personnel snapshot.');
    return JSON.parse(JSON.stringify(data));
  }
  function safeData(context, pending, message) {
    const data = message.data, request = pending.request;
    if (message.phase === 'error' || message.phase === 'unverified') {
      if (data === undefined) return undefined;
      if (!keys(data, ['runId']) || data.runId !== request.payload.runId) throw new Error('The tool returned unexpected result data.');
      return { runId: data.runId };
    }
    if (request.tool === 'kepler') {
      if (request.action === 'kepler-set-controls') {
        if (message.phase !== 'controls' || message.ok !== true || !keys(data, ['visible']) || data.visible !== request.payload.visible) throw new Error('Kepler did not confirm the requested map control visibility.');
        return { visible: data.visible };
      }
      if (request.action === 'kepler-render-geography') {
        const expected = window.DomGeographyTools.build({ data: request.payload.data, layer: request.payload.layer, ...(Object.hasOwn(request.payload, 'highlight') ? { highlight: request.payload.highlight } : {}), ...(Object.hasOwn(request.payload, 'emphasis') ? { emphasis: request.payload.emphasis } : {}) });
        const fieldTypes = expected.payload.datasets.data.fields.map(field => `${field.name}:${field.type}`);
        if (message.phase !== 'imported' || message.ok !== true || !keys(data, ['importedRows', 'layerId', 'dataId', 'layerType', 'fieldTypes', 'timeDomain', ...(expected.highlight ? ['highlight'] : []), ...(expected.emphasis ? ['emphasis'] : [])])
          || data.importedRows !== expected.rowCount || data.layerId !== expected.layerId || data.dataId !== expected.dataId || data.layerType !== request.payload.layer
          || JSON.stringify(data.fieldTypes) !== JSON.stringify(fieldTypes) || JSON.stringify(data.timeDomain) !== JSON.stringify(expected.timeDomain)
          || (expected.highlight && (!keys(data.highlight, ['highlightedRows', 'sourceRows', 'color']) || data.highlight.highlightedRows !== expected.highlight.highlightedRows || data.highlight.color !== expected.highlight.color || JSON.stringify(data.highlight.sourceRows) !== JSON.stringify(expected.highlight.sourceRows)))
          || (expected.emphasis && (!keys(data.emphasis, Object.keys(expected.emphasis)) || Object.entries(expected.emphasis).some(([key, value]) => data.emphasis[key] !== value)))) throw new Error('Kepler did not confirm the exact geographic schema, layer, selection and observed time domain.');
        return JSON.parse(JSON.stringify(data));
      }
      if (message.phase !== 'imported' || message.ok !== true || !keys(data, ['importedRows', 'layerId', 'dataId']) || data.importedRows !== request.payload.rows.length
        || data.layerId !== 'dom_failure_density' || data.dataId !== 'dom_failure_events') throw new Error('Kepler did not confirm the requested import count and fixed layer.');
      return { importedRows: data.importedRows, layerId: data.layerId, dataId: data.dataId };
    }
    if (request.action === 'henry-prepare-booking') {
      if (message.phase !== 'prepared' || message.ok !== true) throw new Error('Henry’s did not return a valid booking review.');
      return safeReview(data, request.payload);
    }
    if (request.action === 'henry-start-guided-booking' || request.action === 'henry-advance-booking') {
      const starting = request.action === 'henry-start-guided-booking';
      if (!starting) validReview(context, request);
      if (!starting && request.payload.step === 'book') {
        if (message.phase !== 'prepared' || message.ok !== true || context.guidedCursor !== GUIDED_STEPS.length - 1) throw new Error('Henry’s did not finish the final guided review step.');
        const review = safeReview(data, context.guidedReview);
        if (REVIEW_FIELDS.some(name => review[name] !== context.guidedReview[name])) throw new Error('The guided booking review changed during the walkthrough.');
        return review;
      }
      if (message.phase !== 'guided' || message.ok !== true || !keys(data, ['review', 'step', 'stepIndex', 'stepCount', 'controlVisible', 'valueMatches', 'audit'])
        || data.step !== (starting ? 'ready' : request.payload.step) || data.stepIndex !== (starting ? 0 : context.guidedCursor + 1) || data.stepCount !== GUIDED_STEPS.length
        || typeof data.controlVisible !== 'boolean' || typeof data.valueMatches !== 'boolean' || (!starting && (!data.controlVisible || !data.valueMatches))
        || (starting && data.audit !== null)) throw new Error('Henry’s did not confirm the expected guided step and visible value.');
      const review = safeReview(data.review, starting ? request.payload : context.guidedReview);
      if (!starting && REVIEW_FIELDS.some(name => review[name] !== context.guidedReview[name])) throw new Error('The guided booking review changed during the walkthrough.');
      return { review, step: data.step, stepIndex: data.stepIndex, stepCount: GUIDED_STEPS.length,
        controlVisible: data.controlVisible, valueMatches: data.valueMatches, audit: safeAudit(data.audit, review) };
    }
    const transaction = context.transaction;
    if (message.phase !== 'verified' || message.ok !== true || !transaction || !keys(data, ['runId', 'row', 'date', 'time', 'city', 'service', 'status', 'assignedName', 'calendarReferencePresent'])
      || !Number.isSafeInteger(data.row) || data.row < 2 || !text(data.status, 60) || typeof data.calendarReferencePresent !== 'boolean') throw new Error('Henry’s did not return a complete, verified Sheet receipt.');
    for (const name of ['runId', 'date', 'time', 'city', 'service', 'assignedName']) if (data[name] !== transaction[name]) throw new Error('The Sheet readback differs from the reviewed test booking.');
    return { runId: data.runId, row: data.row, date: data.date, time: data.time, city: data.city, service: data.service,
      status: data.status, assignedName: data.assignedName, calendarReferencePresent: data.calendarReferencePresent };
  }
  function receive(context, event) {
    if (contexts.get(context.tool) !== context || event.origin !== context.configuration.origin || !event.source || event.source === window) return;
    const message = event.data;
    if (keys(message, ['type', 'version', 'tool', 'session']) && message.type === 'dom-live-tool-ready' && message.version === VERSION
      && message.tool === context.tool && message.session === context.session) {
      if (context.source) return;
      context.source = event.source; window.clearTimeout(context.readyTimer); context.status.textContent = 'Tool connected.'; pump(context); return;
    }
    if (event.source !== context.source || !record(message)) return;
    const pending = context.inflight;
    if (pending && message.type === 'dom-live-tool-progress') {
      if (keys(message, ['type', 'version', 'tool', 'session', 'id', 'seq', 'phase']) && message.version === VERSION && message.tool === context.tool
        && message.session === context.session && message.id === pending.request.id && message.seq === pending.seq
        && PROGRESS[pending.request.action]?.includes(message.phase)) context.view?.narrate?.(message.phase);
      return;
    }
    if (!pending || message.type !== 'dom-live-tool-result' || message.version !== VERSION || message.tool !== context.tool || message.session !== context.session
      || message.id !== pending.request.id || message.seq !== pending.seq || message.action !== pending.request.action) return;
    try {
      const expected = ['type', 'version', 'tool', 'session', 'id', 'seq', 'action', 'ok', 'phase', 'message'];
      if (Object.hasOwn(message, 'data')) expected.push('data');
      if (!keys(message, expected) || typeof message.ok !== 'boolean' || !text(message.message, 600)
        || !['prepared', 'guided', 'verified', 'unverified', 'imported', 'controls', 'error'].includes(message.phase)
        // The installed Henry receiver reports a completed read with ok:true
        // even when no matching row is verified. Treat that as uncertainty,
        // never as success; keep all successful phases strictly validated.
        || (message.ok && message.phase === 'error') || (!message.ok && !['error', 'unverified'].includes(message.phase))) throw new Error('The tool returned an invalid receipt.');
      const data = safeData(context, pending, message);
      if (context.tool === 'kepler' && message.phase === 'imported') {
        const description = pending.request.action === 'kepler-render-geography'
          ? { label: pending.request.payload.data.label, rows: data.importedRows, layer: data.layerType, timeDomain: data.timeDomain }
          : { label: 'Dispatch failure locations', rows: data.importedRows, layer: 'heatmap', timeDomain: null };
        try { context.view?.describeMap?.({ ...description, ...(pending.sourcePreview ? { sourcePreview: pending.sourcePreview } : {}) }); }
        catch {
          rejectPending(context, pending, 'Kepler imported the data, but its matching source details could not be displayed.');
          return;
        }
      }
      if (context.tool === 'kepler' && !message.ok && pending.sent && pending.request.action !== 'kepler-set-controls') context.view?.sourceError?.(message.message);
      const guidedAction = ['henry-start-guided-booking', 'henry-advance-booking'].includes(pending.request.action);
      if (message.phase === 'guided') {
        if (pending.request.action === 'henry-start-guided-booking') {
          context.guidedReview = Object.freeze({ ...data.review }); context.guidedExpiresAt = Date.now() + GUIDED_REVIEW_TIMEOUT;
        }
        context.guidedCursor = data.stepIndex; context.guidedAudit = data.audit === null ? null : JSON.parse(JSON.stringify(data.audit));
        context.view?.guideStep?.(data.step, data.review, data.audit);
      }
      if (message.phase === 'prepared') {
        context.prepared = Object.freeze({ ...data });
        if (guidedAction) {
          context.guidedCursor = GUIDED_STEPS.length;
          context.view?.guideStep?.('book', data, context.guidedAudit === null ? null : JSON.parse(JSON.stringify(context.guidedAudit)));
        }
      }
      if (!guidedAction || ['error', 'unverified'].includes(message.phase)) context.view?.narrate?.(message.phase, data);
      if (message.phase === 'verified' && context.sheet) {
        // A Google-rendered projection brings the actual saved assignment into
        // view without horizontal scrolling or changing the workbook.
        const refresh = new URL(HENRYS_SHEET); refresh.pathname = refresh.pathname.replace(/\/preview$/, '/gviz/tq'); refresh.hash = '';
        refresh.searchParams.set('range', `A1:K${data.row}`); refresh.searchParams.set('headers', '1'); refresh.searchParams.set('tqx', 'out:html');
        refresh.searchParams.set('tq', `select A,B,C,H,I limit 1 offset ${data.row - 2}`);
        refresh.searchParams.set('domRefresh', String(Date.now())); context.sheet.src = refresh.href;
      }
      context.status.textContent = message.phase === 'verified' ? `Verified in the Sheet: row ${data.row}, assigned to ${data.assignedName}.`
        : message.phase === 'imported' ? `Kepler confirmed ${data.importedRows.toLocaleString('en-US')} ${data.layerType ? 'typed geographic records in its data layer' : 'failure locations in its data layer'}.`
          : message.phase === 'prepared' ? 'The test details are ready. Dom is continuing with your booking request.' : message.message;
      const result = { type: 'dom-live-tool-result', version: VERSION, tool: context.tool, session: context.session, id: pending.request.id,
        seq: pending.seq, action: pending.request.action, ok: message.ok && message.phase !== 'unverified', phase: message.phase, message: message.message };
      if (data !== undefined) result.data = data;
      finish(context, pending, result);
    } catch (error) { rejectPending(context, pending, error.message); }
  }
  function reveal(context, background = false) {
    if (context.view) { context.view.reveal({ background }); return; }
    if (background) return;
    if (context.panel.open) return;
    if (typeof context.panel.show === 'function') context.panel.show(); else context.panel.setAttribute('open', '');
  }
  function begin(tool, callerFrame, existingView = null) {
    if (contexts.has(tool)) stopContext(contexts.get(tool));
    const configured = configuration[tool], session = nonce();
    if (tool === 'henrys' || existingView) {
      const view = existingView ?? window.DomHenrysDemo?.show();
      if (!view || !view.panel || !view.frame || (tool === 'henrys' && !view.sheet) || !view.status) throw new Error('The inline project view is unavailable.');
      const context = { tool, session, configuration: configured, view, panel: view.panel, frame: view.frame, sheet: view.sheet ?? null, status: view.status,
        callerFrame, source: null, pending: new Map(), sequence: 0, inflight: null, prepared: null, guidedReview: null, guidedCursor: 0, guidedExpiresAt: null, guidedAudit: null, transaction: null, stopped: false };
      connect(context);
      context.unsubscribeClose = view.onClose?.(() => stopContext(context));
      context.onDispose = () => stopContext(context);
      context.disposeEvent = tool === 'henrys' ? 'dom-henrys-disposed' : 'dom-kepler-disposed';
      context.panel.addEventListener(context.disposeEvent, context.onDispose);
      if (tool === 'henrys') {
        context.onVisible = () => { if (context.panel.dataset.resuming !== 'true') pump(context); };
        context.panel.addEventListener('dom-henrys-revealed', context.onVisible);
      }
      return context;
    }
    const panel = document.createElement('dialog'); panel.id = 'dom-live-tool-panel'; panel.className = 'dom-live-tool-panel';
    panel.setAttribute('aria-label', 'Kepler geographic visualization');
    panel.style.cssText = 'position:fixed;inset:4vh auto auto 50%;transform:translateX(-50%);z-index:20000;width:min(1240px,96vw);max-width:96vw;max-height:92vh;padding:20px;border:1px solid #dce1e7;border-radius:12px;color:#2d3142;background:#fff;font:inherit;overflow:auto;';
    const header = document.createElement('header'); header.style.cssText = 'position:sticky;top:0;z-index:2;background:#fff;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding-bottom:10px;';
    const heading = document.createElement('h2'); heading.textContent = 'Kepler · geographic exploration';
    const back = document.createElement('button'); back.type = 'button'; back.className = 'btn btn-primary'; back.textContent = 'Back to Dom'; back.setAttribute('aria-label', 'Back to Dom · keep connected');
    back.addEventListener('click', () => {
      if (tool === 'kepler' && context.source) context.source.postMessage({ type: 'dom-live-tool-visibility', version: VERSION, tool, session, visible: false }, configured.origin);
      if (typeof panel.close === 'function') panel.close(); else panel.removeAttribute('open');
      callerFrame?.scrollIntoView?.({ block: 'start' }); callerFrame?.focus();
    });
    const close = document.createElement('button'); close.type = 'button'; close.className = 'btn btn-outline-secondary'; close.textContent = 'Stop and close'; close.addEventListener('click', () => stopContext(context));
    header.append(heading, back, close);
    const status = document.createElement('p'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); status.textContent = 'Connecting to the configured project tool…';
    const split = document.createElement('div'); split.className = 'kepler-split dom-live-tool-split';
    split.style.gridTemplateColumns = 'minmax(0,1fr)';
    const frame = document.createElement('iframe'); frame.title = 'Kepler live geographic visualization';
    frame.style.cssText = 'width:100%;min-height:60vh;border:1px solid #dce1e7;border-radius:8px;'; frame.referrerPolicy = 'no-referrer';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads'); split.append(frame);
    const note = document.createElement('p'); note.className = 'small'; note.textContent = 'Requested map data is sent to the connected Kepler app without editing its Google Sheet. Heatmaps show counts; endpoint connections do not establish road routes. Observed timestamps drive playback.';
    panel.append(header, status, split, note); document.body.append(panel);
    const context = { tool, session, configuration: configured, panel, frame, sheet: null, status, callerFrame, source: null,
      pending: new Map(), sequence: 0, inflight: null, prepared: null, guidedReview: null, guidedCursor: 0, guidedExpiresAt: null, guidedAudit: null, transaction: null, stopped: false };
    panel.addEventListener('cancel', event => { event.preventDefault(); stopContext(context); });
    connect(context);
    return context;
  }
  function connect(context) {
    context.status.textContent = 'Connecting to the configured project tool…';
    context.listener = event => receive(context, event);
    // A card/deep-link presentation exists independently of the Lab's first load.
    // Once chat supplies data or a booking action, its owning document must stay mounted.
    context.onCallerLoad = () => { if (context.ownerRequestId) stopContext(context); };
    contexts.set(context.tool, context); active = context;
    window.addEventListener('message', context.listener); context.callerFrame?.addEventListener('load', context.onCallerLoad);
    context.readyTimer = window.setTimeout(() => {
      if (contexts.get(context.tool) !== context) return;
      const message = 'The configured tool did not become ready within 60 seconds. Use Open to check Google access, or retry the connection.';
      for (const pending of [...context.pending.values()]) rejectPending(context, pending, message);
      const retainView = context.tool === 'kepler' && typeof context.view?.connectionError === 'function';
      stopContext(context, { retainView });
      if (retainView) context.view.connectionError(message);
    }, READY_TIMEOUT);
    const address = new URL(context.configuration.url); address.searchParams.set('domSession', context.session); address.searchParams.set('domParent', window.location.origin); context.frame.src = address.href;
    reveal(context);
  }
  function accept(request, reply = () => {}, callerFrame = null) {
    if (!validEnvelope(request)) return Promise.reject(new Error('Invalid live-tool request.'));
    const reject = message => { const result = localResult(request, message); reply(result); return Promise.resolve(result); };
    if (seen.has(request.id)) return reject('This live-tool request has already been handled.');
    if (seen.size >= MAX_REQUESTS) return reject('This page has reached its live-tool request limit. Reload to begin a new session.');
    seen.add(request.id);
    let payload, sourcePreview;
    try {
      payload = copyPayload(request.tool, request.action, request.payload);
      if (request.tool === 'kepler' && request.action !== 'kepler-set-controls') {
        if (Object.hasOwn(request, 'sourceSummary') && !window.DomMapSource) throw new Error('The map source viewer is unavailable. Reload the portfolio.');
        if (window.DomMapSource) sourcePreview = window.DomMapSource.preview(payload, Object.hasOwn(request, 'sourceSummary') ? window.DomMapSource.validateSummary(request.sourceSummary) : undefined);
      }
    }
    catch (error) { return reject(error.message); }
    if (!configuration[request.tool]) return reject('This project tool is not configured and verified on this page.');
    let context = contexts.get(request.tool);
    if (request.action === 'kepler-set-controls' && (!context || context.callerFrame !== callerFrame || !context.source || context.pending.size))
      return reject('Open a Kepler map and wait for it to finish loading before changing its controls.');
    const recovery = request.action === 'henry-read-booking' ? recoveries.get(payload.runId) : null;
    if (request.action === 'henry-read-booking' && (!recovery || recovery.callerFrame !== callerFrame))
      return reject('No read-only recovery reference remains for this test run on this page. Use its exact TEST run ID in the Appointments Sheet; do not submit another copy.');
    const cleanRequest = { type: request.type, id: request.id, tool: request.tool, action: request.action, payload };
    // Reject foreign, skipped and stale guided controls before replacing another
    // project view, changing cleanup ownership, or revealing any booking frame.
    if (request.action === 'henry-advance-booking' || request.action === 'henry-submit-booking') {
      if (!context || context.callerFrame !== callerFrame) return reject('Prepare a test booking in this session before continuing it.');
      try { validReview(context, cleanRequest); }
      catch (error) { return reject(error.message); }
      if (request.action === 'henry-advance-booking' && context.pending.size) return reject('Wait for the current guided step before continuing it.');
    }
    if (request.action === 'henry-start-guided-booking' && context?.callerFrame === callerFrame && context.pending.size)
      return reject('Wait for the current booking operation before starting another guided review.');
    if (context && (context.callerFrame !== callerFrame || (recovery && context.transaction?.runId !== payload.runId))) {
      stopContext(context); context = null;
    }
    if (context?.pending.size >= MAX_PENDING) return reject('The tool already has the maximum number of pending requests.');
    try {
      // The portfolio owns one mounted map inside its project card. Open that
      // view before falling back to the standalone host's dialog, then reuse
      // the connection attachKeplerView created synchronously.
      if (!context && request.tool === 'kepler' && callerFrame === labFrame() && typeof window.__shoegunPresentation?.showProject === 'function') {
        window.__shoegunPresentation.showProject('kepler');
        context = contexts.get('kepler');
      }
      context = context || begin(request.tool, callerFrame);
    }
    catch { return reject('The live tool view could not be opened.'); }
    active = context;
    if (recovery) context.transaction = { ...recovery.transaction };
    try { validReview(context, cleanRequest); }
    catch (error) { return reject(error.message); }
    // Only the latest data/booking action owns component cleanup. Chat-only
    // control changes preserve that owner; a stale component cannot close a new view.
    if (request.action !== 'kepler-set-controls') context.ownerRequestId = request.id;
    if (request.tool === 'henrys') context.ownerRunId = payload.runId;
    reveal(context, ['henry-advance-booking', 'henry-submit-booking', 'henry-read-booking'].includes(request.action));
    if (request.action === 'henry-prepare-booking' || request.action === 'henry-start-guided-booking') {
      context.prepared = null; context.guidedReview = null; context.guidedCursor = 0; context.guidedExpiresAt = null; context.guidedAudit = null;
    }
    return new Promise(resolve => {
      const pending = { request: cleanRequest, sourcePreview, reply, resolve, seq: ++context.sequence, sent: false, timer: null };
      context.pending.set(request.id, pending); pump(context);
    });
  }
  function configure(value) {
    if (!record(value) || Object.keys(value).some(name => !Object.hasOwn(ACTIONS, name))) throw new Error('Configure only the fixed Henry’s and Kepler tools.');
    const next = { henrys: null, kepler: null };
    for (const tool of Object.keys(next)) {
      const option = value[tool]; if (option === undefined || option === null) continue;
      const expected = ['url', 'origin']; if (Object.hasOwn(option, 'allowPrivateDev')) expected.push('allowPrivateDev');
      if (!keys(option, expected) || typeof option.url !== 'string' || typeof option.origin !== 'string' || (option.allowPrivateDev !== undefined && typeof option.allowPrivateDev !== 'boolean')) throw new Error('Each tool needs its fixed Apps Script exec URL and exact verified content origin.');
      const address = new URL(option.url), origin = new URL(option.origin);
      const privateHost = ['http://127.0.0.1:4179', 'http://localhost:4179', 'https://desktop-6he0t2k.taile5e8da.ts.net:10443'].includes(window.location.origin);
      const endpoint = /^\/macros\/s\/[A-Za-z0-9_-]+\/(exec|dev)$/.exec(address.pathname);
      if (address.origin !== 'https://script.google.com' || address.username || address.password || address.search || address.hash || !endpoint
        || (endpoint[1] === 'dev' && (!privateHost || option.allowPrivateDev !== true))) throw new Error('Use a fixed HTTPS Apps Script exec URL; owner dev previews require explicit private-host configuration.');
      if (origin.protocol !== 'https:' || origin.port || option.origin !== origin.origin || !/^(?:[a-z0-9-]+-)?script\.googleusercontent\.com$/.test(origin.hostname)) throw new Error('Use the exact verified Googleusercontent origin; wildcards are not allowed.');
      next[tool] = Object.freeze({ url: address.href, origin: origin.origin });
    }
    stop(); configuration = next; sendAvailability(labFrame()?.contentWindow); return availability();
  }
  function attachKeplerView(view) {
    const panel = document.getElementById('dom-project-demo');
    if (!configuration.kepler || !panel || view?.panel !== panel || view.frame !== panel.querySelector('iframe[title="Live Kepler mapping application"]')
        || !view.status || !panel.contains(view.status) || typeof view.reveal !== 'function' || typeof view.dispose !== 'function')
      throw new Error('The configured Kepler project view is unavailable.');
    const current = contexts.get('kepler');
    if (current?.view === view) { active = current; reveal(current); return; }
    begin('kepler', labFrame(), view);
  }
  const onRequest = event => {
    const frame = labFrame();
    if (event.origin !== window.location.origin || !frame || event.source !== frame.contentWindow) return;
    if (keys(event.data, ['type']) && event.data.type === 'dom-live-tool-availability') { sendAvailability(event.source); return; }
    if (event.data?.type === 'dom-live-tool-stop') {
      if (keys(event.data, ['type'])) stop();
      else if (keys(event.data, ['type', 'id']) && typeof event.data.id === 'string' && /^[a-f0-9]{32}$/.test(event.data.id)) {
        for (const context of contexts.values()) if (context.callerFrame === frame && context.ownerRequestId === event.data.id) stopContext(context);
      }
      return;
    }
    if (!validEnvelope(event.data)) return;
    accept(event.data, result => event.source.postMessage(result, window.location.origin), frame).catch(() => {});
  };
  window.addEventListener('message', onRequest);
  Object.defineProperty(window, 'DomLiveTools', { configurable: true, value: Object.freeze({ configure, availability,
    status: () => ({ tool: active?.tool ?? null, ready: Boolean(active?.source), pending: active?.pending.size ?? 0 }),
    request: value => accept(record(value) && !Object.hasOwn(value, 'type') ? { type: 'dom-live-tool-request', ...value } : value), attachKeplerView, stop }) });
})();
