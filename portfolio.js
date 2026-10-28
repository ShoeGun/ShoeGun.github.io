/* global document, window */
(() => {
  'use strict';
  const contactForm = document.querySelector('form[data-email-draft]');
  contactForm?.addEventListener('submit', event => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;
    const fields = new window.FormData(contactForm);
    const draft = new URL(contactForm.action);
    if (draft.protocol !== 'mailto:') return;
    const subject = `Portfolio message from ${String(fields.get('name') || '').trim()}`;
    const body = `Name: ${String(fields.get('name') || '').trim()}\nEmail: ${String(fields.get('_replyto') || '').trim()}\n\n${String(fields.get('message') || '')}`;
    draft.search = `?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const link = document.createElement('a'); link.href = draft.href; link.click();
  });
  const guideFrame = document.querySelector('iframe.portfolio-lab-frame');
  const chatHome = guideFrame?.closest('#data-lab');
  const chatPurpose = chatHome?.querySelector('.data-lab-purpose');
  const chatPresence = chatHome?.querySelector('.dom-chat-presence');
  const chatPresenceStatus = chatPresence?.querySelector('.dom-chat-presence-status');
  const chatPresenceShow = chatPresence?.querySelector('.dom-chat-presence-show');
  const henryTourSteps = ['date', 'city', 'service', 'email', 'phone', 'address', 'personnel', 'assignment', 'book'];
  let chatDockButton = null, chatHideButton = null, chatDocked = false, chatDockOpen = false, chatDockHidden = false;
  const sendTourControl = action => guideFrame?.contentWindow?.postMessage({ type: 'dom-henry-tour-control', action }, window.location.origin);
  const runTourControl = action => {
    if (window.DomTourConsole) return window.DomTourConsole[action]();
    return sendTourControl(action);
  };
  const syncChatDock = () => {
    if (!guideFrame) return;
    guideFrame.classList.toggle('is-tour-docked', chatDocked);
    guideFrame.classList.toggle('is-tour-peek', chatDocked && !chatDockOpen);
    guideFrame.classList.toggle('is-tour-collapsed', chatDocked && chatDockHidden);
    guideFrame.inert = chatDocked && chatDockHidden;
    if (chatDocked && chatDockHidden) guideFrame.setAttribute('aria-hidden', 'true'); else guideFrame.removeAttribute('aria-hidden');
    document.body.classList.toggle('dom-following-chat', chatDocked);
    document.body.classList.toggle('dom-chat-expanded', chatDocked && chatDockOpen && !chatDockHidden);
    document.body.classList.toggle('dom-chat-hidden', chatDocked && chatDockHidden);
    chatHome?.classList.toggle('is-chat-following', chatDocked);
    if (chatPurpose) chatPurpose.hidden = chatDocked;
    if (chatPresence) {
      chatPresence.hidden = !chatDocked;
      chatPresence.dataset.chatState = chatDockHidden ? 'minimized' : 'following';
    }
    if (chatPresenceStatus) chatPresenceStatus.textContent = chatDockHidden
      ? 'Chat is minimized. Show it again to ask a question while the map or demo keeps running.'
      : 'Your conversation follows the projects. Ask a question while the map or demo keeps running.';
    if (chatPresenceShow) {
      chatPresenceShow.setAttribute('aria-controls', guideFrame.id);
      chatPresenceShow.setAttribute('aria-expanded', String(chatDocked && chatDockOpen && !chatDockHidden));
    }
    if (chatDockButton) {
      chatDockButton.hidden = !chatDocked || chatDockHidden;
      chatDockButton.textContent = chatDockOpen ? 'Compact chat' : 'Expand chat';
      chatDockButton.setAttribute('aria-expanded', String(chatDockOpen));
    }
    if (chatHideButton) {
      chatHideButton.hidden = !chatDocked;
      chatHideButton.textContent = chatDockHidden ? 'Ask Dom' : '−';
      chatHideButton.classList.toggle('is-chat-restore', chatDockHidden);
      chatHideButton.setAttribute('aria-label', chatDockHidden ? 'Ask Dom · restore chat' : 'Minimize Dom chat');
      chatHideButton.setAttribute('aria-expanded', String(!chatDockHidden));
    }
    guideFrame.contentWindow?.postMessage({ type: 'dom-project-context', project: chatDocked ? activeProject : null }, window.location.origin);
    guideFrame.contentWindow?.postMessage({ type: 'dom-chat-mode', expanded: chatDocked && chatDockOpen && !chatDockHidden }, window.location.origin);
    guideFrame.contentWindow?.postMessage({ type: 'dom-chat-layout', compact: chatDocked }, window.location.origin);
  };
  const dockChat = active => {
    if (!guideFrame) return;
    if (!chatDockButton) {
      if (!guideFrame.id) guideFrame.id = 'dom-project-chat';
      chatDockButton = document.createElement('button'); chatDockButton.type = 'button'; chatDockButton.className = 'dom-tour-chat-toggle';
      chatDockButton.setAttribute('aria-controls', guideFrame.id);
      chatDockButton.addEventListener('click', () => {
        chatDockOpen = !chatDockOpen;
        syncChatDock();
      });
      chatHideButton = document.createElement('button'); chatHideButton.type = 'button'; chatHideButton.className = 'dom-tour-chat-hide';
      chatHideButton.setAttribute('aria-controls', guideFrame.id);
      chatHideButton.addEventListener('click', () => {
        chatDockHidden = !chatDockHidden;
        if (!chatDockHidden) chatDockOpen = false;
        syncChatDock();
        if (!chatDockHidden) guideFrame.focus({ preventScroll: true });
      });
      document.body.append(chatDockButton, chatHideButton);
    }
    if (active && !chatDocked) chatDockOpen = false;
    if (!active) chatDockHidden = false;
    chatDocked = active; syncChatDock();
  };
  chatPresenceShow?.addEventListener('click', () => {
    if (!chatDocked || !guideFrame) return;
    chatDockHidden = false; chatDockOpen = true; syncChatDock();
    guideFrame.focus({ preventScroll: true });
  });
  guideFrame?.addEventListener('load', () => { if (chatDocked) syncChatDock(); });
  window.addEventListener('message', event => {
    if (!chatDocked || event.source !== guideFrame?.contentWindow || event.origin !== window.location.origin
        || !event.data || typeof event.data !== 'object' || Array.isArray(event.data)
        || Object.keys(event.data).join(',') !== 'type' || event.data.type !== 'dom-chat-expand') return;
    if (!chatDockHidden) { chatDockOpen = true; syncChatDock(); }
  });
  const henrysSite = 'https://shoegun.github.io/Henry-s/';
  const henrysScheduler = 'https://script.google.com/macros/s/AKfycbwSJ_ttPRhSOsEq_fV1ShjZm_56tGutS436zfPz0Re_40Rx2DxreC1-Qs-zEcui7ZQr/exec';
  const henrysSheet = 'https://docs.google.com/spreadsheets/d/1dbPJFuL9uoZl-pwMCb-XigVU1n2RRrUW3h13l4-7lnw';
  const keplerSite = 'https://script.google.com/macros/s/AKfycbyCSMyu_3Knjv0sq-UBT7SdF3fV9TfkILObnqfiauo5LgqpV5i_WbmtHU6AqWFVmtLj/exec';
  // Matches the original Apps Script getData() source, Sheet1 (gid 0).
  const keplerSheet = 'https://docs.google.com/spreadsheets/d/1RgZ2nl0LSiLHLp99b1qOStwULpMdZGwcdT0NrYsczXI';
  const altitudeSite = 'https://script.google.com/macros/s/AKfycby9hD90ukDKWIm3SBNq40fog0C6xc5lEISAv-4NhwFHXKeeKZhPu7s7VG0d_NTSuKJBhA/exec';
  const portfolioOrigins = ['https://shoegun.github.io', 'http://127.0.0.1:4179', 'http://localhost:4179', 'https://desktop-6he0t2k.taile5e8da.ts.net:10443'];
  const token = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
  const scroll = element => element?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  const preview = (sheet, gid) => `${sheet}/preview?gid=${gid}#gid=${gid}`;
  const projects = {
    henrys: {
      title: 'Henry’s Super Scoops',
      steps: [
        { title: 'From booking to somebody’s next job', text: 'A customer books a cleanup. The scheduler finds who can take it, then saves the assigned job in the Sheet. Start the labeled test below to watch that handoff happen.', pane: 'website', gid: '1292912831' },
        { title: 'Give the lighter schedule first pick', text: 'Personnel holds the team’s cities and working hours. The scheduler checks coverage, ranks the eligible workers by their appointment load over seven days from the requested date, then offers an available slot. That gives the lighter appointment schedule priority instead of handing every request to the first name.', pane: 'sheet', gid: '1963309653' },
        { title: 'The booking becomes assigned work', text: 'Appointments is where the result lands: the customer’s request, the time and the person assigned to it. Calendar Event ID and Calendar Event URL tie that record back to Calendar. Watch me book a labeled test below and I’ll point out the actual row and assignment when they’re verified.', pane: 'both', gid: '1292912831' }
      ]
    },
    kepler: {
      title: 'Kepler · data becomes a map',
      steps: [
        { title: 'One map, more than one source', text: 'I connected Kepler to Google Sheets, then gave Dom a way to load typed data into the same map. Ask for Porto trips and watch recorded journeys move through time. The collapsed Sheet view shows the original spreadsheet example; Dom’s imported data stays separate.', pane: 'website' },
        { title: 'Choose a map that answers the question', text: 'A heatmap shows where events concentrate. Connections compare pickup and drop-off locations; measured GPS trails show actual movement. Ask Dom “Show Porto taxi trips” or “Show earthquakes as a heatmap” to see those tools at work.', pane: 'website' },
        { title: 'Connect the picture back to the evidence', text: 'The original example reads its locations from Google Sheets on a fresh load. Dom’s taxi, earthquake and uploaded-data views are separate imports into the map’s browser memory; they leave those Sheet rows unchanged. A time filter uses observed timestamps, and a bright patch means more plotted events, not necessarily more risk.', pane: 'both' }
      ]
    },
    altitude: {
      title: 'Altitude Directions',
      steps: [
        { title: 'See what happens between the two places', text: 'I built a full-route sampled elevation profile because the destination’s altitude does not tell you about the climb in between. The planner compares the alternatives Mapbox returns, shows sampled ascent and descent, and links each inspected point on the chart to the map. It makes the terrain along the journey visible while planning.', pane: 'website' },
        { title: 'Set a reference, then inspect the evidence', text: 'Choose Start or Destination, then click the map to set that point. The altitude-change threshold flags a rise or fall from the starting altitude; a separate ceiling flags terrain above an elevation you choose. Both support meters or feet. Use the voice button when you want spoken input, or Open live planner if your browser restricts embedded voice. Coverage and spacing show where the sampled profile has gaps. This planner does not establish route safety.', pane: 'website' }
      ]
    }
  };
  let guideSession = null, guideTimer = null, guideOwnsRain = false, rainStatus = null, rainTimer = null, rainDeadline = null;
  let stage = null, activeProject = null, stageParts = null, stageOwnerSession = null;
  let henrysView = null, henrysStep = 0;
  const projectStages = new Map();
  const projectCard = target => document.querySelector(`[data-dom-project="${target}"]`);
  const markProjectExpanded = (target, expanded) => {
    const card = projectCard(target);
    card?.classList.toggle('is-project-open', expanded);
    const windowMode = target === 'henrys' ? henrysView?.panel.dataset.windowMode : projectStages.get(target)?.panel.dataset.windowMode;
    card?.parentElement?.classList.toggle('project-column-open', expanded && (!windowMode || windowMode === 'docked'));
    card?.querySelector('.project-open-action')?.setAttribute('aria-expanded', String(expanded));
  };
  const minimizeCurrent = except => {
    if (!activeProject || activeProject === except) return;
    if (activeProject === 'henrys') henrysView?.minimize();
    else {
      const current = projectStages.get(activeProject);
      if (current?.window) current.window.minimize();
      else if (current) current.panel.hidden = true;
      markProjectExpanded(activeProject, false);
    }
  };
  const seen = new Set();
  const reply = (command, ok, message, event) => guideFrame?.contentWindow?.postMessage({ type: 'dom-project-guide-result', session: command.session, id: command.id, ok, message, ...(event ? { event } : {}) }, window.location.origin);
  const rainState = active => guideFrame?.contentWindow?.postMessage({ type: 'dom-rain-state', active }, window.location.origin);
  const stopRain = (notify = true) => {
    const hadRain = guideOwnsRain || rainStatus !== null;
    if (guideOwnsRain) window.__shoegunDomEffects?.stopHotdogRain?.();
    guideOwnsRain = false; rainStatus?.remove(); rainStatus = null; window.clearTimeout(rainTimer); rainTimer = null; rainDeadline = null;
    if (notify && hadRain) rainState(false);
  };
  const validRainDuration = value => value === null || (Number.isSafeInteger(value) && value >= 1000 && value <= 86400000);
  const startRain = durationMs => {
    if (!validRainDuration(durationMs)) throw new Error('Use a hotdog rain duration from 1 second to 24 hours.');
    if (typeof window.__shoegunDomEffects?.hotdogRain !== 'function') throw new Error('The hotdog animation is still loading. Try again in a moment.');
    stopRain(false); window.__shoegunDomEffects.hotdogRain(); guideOwnsRain = true;
    const amount = durationMs === null ? null : durationMs % 3600000 === 0 ? [durationMs / 3600000, 'hour'] : durationMs % 60000 === 0 ? [durationMs / 60000, 'minute'] : [durationMs / 1000, 'second'];
    const message = amount ? `Raining hotdogs for ${amount[0]} ${amount[1]}${amount[0] === 1 ? '' : 's'}.` : 'Raining hotdogs until you stop it.';
    rainStatus = document.createElement('aside'); rainStatus.className = 'dom-effect-status'; rainStatus.setAttribute('aria-label', 'Hot-dog rain controls');
    const label = document.createElement('span'); label.textContent = message;
    const stop = document.createElement('button'); stop.type = 'button'; stop.textContent = 'Stop rain'; stop.addEventListener('click', () => stopRain());
    rainStatus.append(label, stop); document.body.append(rainStatus);
    if (durationMs !== null) { rainDeadline = Date.now() + durationMs; rainTimer = window.setTimeout(() => stopRain(), durationMs); }
    rainState(true); return message;
  };
  const disposeStage = target => {
    const current = projectStages.get(target);
    if (!current || current.disposing) return;
    current.disposing = true;
    if (target === 'kepler' && current.initialized) current.panel.dispatchEvent(new Event('dom-kepler-disposed'));
    current.window?.dispose(); current.window = null;
    current.sourceView?.dispose(); current.sourceView = null; current.sourceSnapshot = null; current.sourceState = null;
    current.panel.hidden = true; current.parts.panes.replaceChildren(); current.parts.keplerView = null;
    current.parts.status.textContent = `${target === 'kepler' ? 'Kepler' : 'Altitude Directions'} view stopped. Open the project to load a new view.`;
    current.parts.retry.hidden = true;
    current.initialized = false; current.attached = false; current.step = 0; markProjectExpanded(target, false);
    current.disposing = false;
    if (activeProject === target) { activeProject = null; stageOwnerSession = null; dockChat(false); }
  };
  const closeStage = () => {
    for (const target of projectStages.keys()) disposeStage(target);
    henrysView?.dispose(); activeProject = null; stageOwnerSession = null; dockChat(false);
  };
  const stopGuide = (notify = true) => {
    if (notify && guideSession) reply({ session: guideSession }, true, 'Demo stopped.', 'stopped');
    guideSession = null; seen.clear(); window.clearTimeout(guideTimer); guideTimer = null;
    closeStage();
  };
  function makeStage(target = 'kepler') {
    if (projectStages.has(target)) {
      const current = projectStages.get(target); stage = current.panel; stageParts = current.parts;
      return stage;
    }
    const container = projectCard(target) || document.querySelector('#data-lab > .container') || document.getElementById('data-lab');
    if (!container) throw new Error('The project demonstration area is unavailable.');
    stage = document.createElement('section'); stage.id = target === 'kepler' ? 'dom-project-demo' : 'altitude-project-demo'; stage.className = 'dom-project-demo'; stage.hidden = true;
    stage.dataset.project = target;
    stage.setAttribute('aria-labelledby', `${stage.id}-title`);
    const header = document.createElement('header'); header.className = 'dom-demo-heading';
    const heading = document.createElement('div');
    const eyebrow = document.createElement('p'); eyebrow.className = 'dom-demo-eyebrow'; eyebrow.textContent = target === 'kepler' ? 'DOM / MAP EXPLORER' : 'DOM · PROJECT DEMO';
    const title = document.createElement('h3'); title.id = `${stage.id}-title`;
    heading.append(eyebrow, title);
    const close = document.createElement('button'); close.type = 'button'; close.className = 'dom-demo-close'; close.textContent = '−'; close.setAttribute('aria-label', `Minimize ${projects[target].title}`);
    close.addEventListener('click', () => {
      const current = projectStages.get(target);
      if (current.window) current.window.minimize({ focus: true });
      else { current.panel.hidden = true; markProjectExpanded(target, false); projectCard(target)?.focus({ preventScroll: true }); }
    });
    const stop = document.createElement('button'); stop.type = 'button'; stop.className = 'dom-demo-stop'; stop.textContent = 'Stop demo';
    stop.addEventListener('click', () => disposeStage(target));
    header.append(heading, stop, close);
    const story = document.createElement('div'); story.className = 'dom-demo-story';
    const stepTitle = document.createElement('h4');
    const narrative = document.createElement('p'); narrative.id = `${stage.id}-explanation`; narrative.setAttribute('role', 'status'); narrative.setAttribute('aria-live', 'polite');
    const navigation = document.createElement('div'); navigation.className = 'dom-demo-navigation';
    const previous = document.createElement('button'); previous.type = 'button'; previous.className = 'btn btn-outline-secondary'; previous.textContent = 'Previous';
    const next = document.createElement('button'); next.type = 'button'; next.className = 'btn btn-primary'; next.textContent = 'Next step';
    const position = document.createElement('span'); position.className = 'dom-demo-position';
    const nextProject = document.createElement('button'); nextProject.type = 'button'; nextProject.className = 'btn btn-outline-secondary'; nextProject.textContent = 'Next project';
    nextProject.addEventListener('click', () => {
      nextProject.disabled = true;
      if (guideSession && stageOwnerSession === guideSession) reply({ session: guideSession }, true, 'Next project requested.', 'next');
      else {
        const order = ['henrys', 'kepler', 'altitude'];
        openProject(order[(order.indexOf(target) + 1) % order.length]);
      }
    });
    previous.addEventListener('click', () => explain(projectStages.get(target).step - 1, target)); next.addEventListener('click', () => explain(projectStages.get(target).step + 1, target));
    navigation.append(previous, next, position, nextProject); story.append(stepTitle, narrative, navigation);
    const panes = document.createElement('div'); panes.className = 'dom-demo-panes';
    const note = document.createElement('p'); note.className = 'dom-demo-note'; note.textContent = 'These are the live projects. If Google requires access or blocks a frame, use its Open link.';
    const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'dom-map-connection-retry btn btn-outline-secondary'; retry.textContent = 'Retry map connection'; retry.hidden = true;
    retry.addEventListener('click', () => { disposeStage(target); openProject(target); });
    const body = document.createElement('div'); body.className = 'dom-project-window-body dom-map-window-body'; body.append(story, panes, note, retry); stage.append(header, body);
    container.append(stage);
    note.setAttribute('role', 'status');
    stageParts = { title, stepTitle, narrative, navigation, previous, next, position, nextProject, panes, status: note, retry, header, handle: heading, minimizeButton: close, keplerView: null };
    projectStages.set(target, { panel: stage, parts: stageParts, step: 0, initialized: false, disposing: false });
    return stage;
  }
  function makeHenrysView() {
    if (henrysView) return henrysView;
    const card = document.querySelector('[data-dom-project="henrys"]');
    if (!card) throw new Error('Henry’s project card is unavailable.');
    const column = card.parentElement;
    const panel = document.createElement('section'); panel.id = 'henrys-project-demo'; panel.className = 'dom-project-demo henrys-project-demo'; panel.hidden = true; panel.dataset.project = 'henrys';
    panel.setAttribute('aria-labelledby', 'henrys-project-demo-title');
    const header = document.createElement('header'); header.className = 'dom-demo-heading';
    const heading = document.createElement('div');
    const title = document.createElement('h3'); title.id = 'henrys-project-demo-title'; title.textContent = 'Henry’s Super Scoops · live walkthrough';
    const close = document.createElement('button'); close.type = 'button'; close.className = 'dom-demo-close'; close.textContent = '−'; close.setAttribute('aria-label', 'Minimize Henry’s Super Scoops');
    const stop = document.createElement('button'); stop.type = 'button'; stop.className = 'dom-demo-stop'; stop.textContent = 'Stop demo';
    heading.append(title); header.append(heading, stop, close);
    const story = document.createElement('div'); story.className = 'dom-demo-story henrys-dom-story';
    const speaker = document.createElement('p'); speaker.className = 'henrys-dom-speaker'; speaker.textContent = 'Dom';
    const stepTitle = document.createElement('h4');
    const narrative = document.createElement('p'); narrative.id = 'henrys-dom-narration'; narrative.setAttribute('aria-live', 'polite');
    story.append(speaker, stepTitle, narrative);
    const status = document.createElement('p'); status.className = 'henrys-demo-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); status.textContent = 'Ready to explore. No booking has been requested.';
    const actions = document.createElement('div'); actions.className = 'dom-demo-navigation henrys-demo-actions';
    const book = document.createElement('button'); book.type = 'button'; book.className = 'btn btn-primary'; book.textContent = 'Book a test appointment in Henry’s'; book.disabled = !guideFrame;
    const previous = document.createElement('button'); previous.type = 'button'; previous.className = 'btn btn-outline-secondary'; previous.textContent = 'Previous explanation';
    const next = document.createElement('button'); next.type = 'button'; next.className = 'btn btn-outline-secondary'; next.textContent = 'Next explanation';
    const nextProject = document.createElement('button'); nextProject.type = 'button'; nextProject.className = 'btn btn-outline-secondary'; nextProject.textContent = 'Next project';
    const tourPause = document.createElement('button'); tourPause.type = 'button'; tourPause.className = 'btn btn-outline-secondary'; tourPause.textContent = 'Pause tour'; tourPause.hidden = true;
    const tourNext = document.createElement('button'); tourNext.type = 'button'; tourNext.className = 'btn btn-outline-secondary'; tourNext.textContent = 'Next tour step'; tourNext.hidden = true;
    const tourPlayback = document.createElement('span'); tourPlayback.className = 'henrys-tour-playback'; tourPlayback.setAttribute('role', 'status');
    const readingFace = document.createElement('span'); readingFace.className = 'dom-reading-face'; readingFace.setAttribute('aria-hidden', 'true'); readingFace.append(document.createElement('i'), document.createElement('i'));
    const playbackLabel = document.createElement('span'); tourPlayback.append(readingFace, playbackLabel);
    let playbackCaption = '';
    const clearReading = () => { tourPlayback.classList.remove('is-reading'); playbackLabel.textContent = playbackCaption; };
    book.classList.add('henrys-book-test');
    tourPause.addEventListener('click', () => runTourControl(tourPause.dataset.paused === 'true' ? 'resume' : 'pause'));
    tourNext.addEventListener('click', () => runTourControl('next'));
    actions.append(book, tourPause, tourNext, tourPlayback);
    const process = document.createElement('ol'); process.className = 'henrys-process'; process.setAttribute('aria-label', 'Booking progress');
    const stages = ['Request', 'Worker assigned', 'Recorded in Sheet'].map((label, index) => {
      const item = document.createElement('li'); item.dataset.step = String(index + 1); item.dataset.state = 'pending';
      const marker = document.createElement('span'); marker.className = 'henrys-process-marker'; marker.setAttribute('aria-hidden', 'true'); marker.textContent = String(index + 1);
      const text = document.createElement('strong'); text.textContent = label;
      const detail = document.createElement('span'); detail.className = 'henrys-process-detail'; detail.textContent = 'Waiting';
      item.append(marker, text, detail); process.append(item); return { item, detail };
    });
    const allocation = document.createElement('p'); allocation.className = 'henrys-allocation'; allocation.textContent = 'City coverage + working hours → lighter appointment load → an available slot.';
    const assignment = document.createElement('section'); assignment.className = 'henrys-assignment'; assignment.hidden = true; assignment.setAttribute('aria-label', 'Live assignment');
    const assignmentTitle = document.createElement('h4'); assignmentTitle.textContent = 'This job';
    const assignmentFields = document.createElement('dl');
    const values = Object.fromEntries(['Assigned to', 'When', 'Where', 'Service', 'Sheet record', 'Calendar reference'].map(label => {
      const field = document.createElement('div'); const term = document.createElement('dt'); term.textContent = label;
      const value = document.createElement('dd'); field.append(term, value); assignmentFields.append(field); return [label, value];
    }));
    assignment.append(assignmentTitle, assignmentFields);
    const panes = document.createElement('div'); panes.className = 'dom-demo-panes';
    const createPane = (heading, iframeTitle, name) => {
      const pane = document.createElement('section'); pane.className = 'dom-demo-pane'; pane.dataset.demoPane = name;
      const header = document.createElement('div'); header.className = 'dom-demo-pane-heading';
      const label = document.createElement('h4'); label.textContent = heading; header.append(label);
      const frame = document.createElement('iframe'); frame.title = iframeTitle; frame.referrerPolicy = 'no-referrer'; frame.loading = 'eager';
      frame.setAttribute('sandbox', name === 'website' ? 'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads' : 'allow-scripts allow-same-origin');
      pane.append(header, frame); panes.append(pane); return { pane, frame, label, header };
    };
    const customer = createPane('Customer booking tool', "Henry's customer booking tool", 'website');
    const appointments = createPane('Appointments · read-only Sheet', "Henry's appointments Sheet", 'sheet');
    const sheetNavigation = document.createElement('div'); sheetNavigation.className = 'henrys-sheet-navigation'; sheetNavigation.setAttribute('aria-label', 'Henry’s records');
    const sheetButtons = ['Personnel', 'Appointments', 'Calendar references'].map(label => { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; sheetNavigation.append(button); return button; });
    sheetButtons[2].disabled = true;
    appointments.pane.insertBefore(sheetNavigation, appointments.frame);
    let verifiedReceipt = null;
    const showReferences = () => {
      if (!verifiedReceipt || !Number.isSafeInteger(verifiedReceipt.row) || verifiedReceipt.row < 2) return;
      const source = new URL(`${henrysSheet}/gviz/tq`); source.searchParams.set('gid', '1292912831'); source.searchParams.set('range', `A1:K${verifiedReceipt.row}`);
      source.searchParams.set('headers', '1'); source.searchParams.set('tqx', 'out:html'); source.searchParams.set('tq', `select J,K limit 1 offset ${verifiedReceipt.row - 2}`);
      appointments.frame.src = source.href; appointments.label.textContent = `Calendar references · verified row ${verifiedReceipt.row}`;
      stepTitle.textContent = 'The job and its Calendar event stay connected';
      narrative.textContent = 'Calendar ID in Personnel identifies a worker’s calendar. Calendar Event ID in Appointments identifies this particular job’s event, and Calendar Event URL opens it. Here are the actual saved reference columns. A recorded link does not prove an invitation was delivered.';
      customer.pane.classList.remove('is-explained'); appointments.pane.classList.add('is-explained');
    };
    sheetButtons[0].addEventListener('click', () => explainHenry(1));
    sheetButtons[1].addEventListener('click', () => explainHenry(2));
    sheetButtons[2].addEventListener('click', showReferences);
    const auditSection = document.createElement('section'); auditSection.className = 'henrys-schedule-audit'; auditSection.hidden = true; auditSection.setAttribute('aria-label', 'Live scheduling snapshot');
    const showFullSheet = document.createElement('button'); showFullSheet.type = 'button'; showFullSheet.className = 'henrys-full-sheet'; showFullSheet.textContent = 'Show full Sheet'; showFullSheet.hidden = true; appointments.header.append(showFullSheet);
    const savedRowNote = document.createElement('p'); savedRowNote.className = 'henrys-saved-row-note'; savedRowNote.textContent = 'The saved row, read directly from Google Sheets.'; savedRowNote.hidden = true; appointments.pane.append(savedRowNote);
    const clearVerifiedRow = () => { showFullSheet.hidden = true; savedRowNote.hidden = true; appointments.pane.classList.remove('henrys-verified-row'); };
    const clearSavedProjection = () => {
      // A previous exact-row projection must not masquerade as the current
      // Appointments view while the next request is being prepared.
      if (appointments.frame.src.startsWith(`${henrysSheet}/gviz/tq?`)) appointments.frame.src = preview(henrysSheet, '1292912831');
    };
    showFullSheet.addEventListener('click', () => { appointments.frame.src = preview(henrysSheet, '1292912831'); appointments.label.textContent = 'Appointments · read-only Sheet'; clearVerifiedRow(); });
    const details = document.createElement('details'); details.className = 'henrys-demo-details';
    const summary = document.createElement('summary'); summary.textContent = 'How it works · team, records and running costs';
    const explanation = document.createElement('p'); explanation.textContent = 'Apps Script selects Personnel with the requested Operating Region and a configured Calendar ID. It counts Calendar events matching “Appointment” in the seven-day window starting on the requested date, then checks workers from the fewest appointments upward. Within their Working Hours, the first worker without a matching appointment event in an hourly slot gets that slot. Equal counts follow Personnel order; this is load-aware assignment, not a promise of equal job totals. Other kinds of Calendar events are not included in that conflict check.';
    const recording = document.createElement('p'); recording.textContent = 'The assigned booking lands in Appointments. Calendar Event ID and Calendar Event URL connect that job to its event. This walkthrough verifies the actual saved row and worker; a Calendar reference alone does not confirm notification delivery. A fresh scheduling snapshot shows the returned appointment counts and availability checks. Unknown checks stay unknown; the snapshot is not a trace of the earlier selection.';
    const costs = document.createElement('p'); costs.textContent = 'I built this with Google Sheets, Apps Script and Calendar. It can run on Google’s free services within their quotas, without a separate dispatch subscription. The saved assignment gives each worker a job to complete and a record to track.';
    const quotas = document.createElement('a'); quotas.href = 'https://developers.google.com/apps-script/guides/services/quotas'; quotas.target = '_blank'; quotas.rel = 'noopener noreferrer'; quotas.textContent = 'Google’s service quotas ↗';
    const navigation = document.createElement('div'); navigation.className = 'dom-demo-navigation'; navigation.append(previous, next, nextProject);
    const body = document.createElement('div'); body.className = 'dom-project-window-body';
    details.append(summary, explanation, recording, costs, quotas, navigation); body.append(process, allocation, story, actions, status, panes, auditSection, assignment, details); panel.append(header, body); card.append(panel);
    let booking = null, currentGuidedRun = null;
    let minimizeRequested = false, minimizeRun = null, minimizedPausedRun = null;
    const retiredRuns = new Set();
    const setProgress = states => stages.forEach(({ item, detail }, index) => {
      item.dataset.state = states[index][0]; detail.textContent = states[index][1];
      if (states[index][0] === 'current') item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
    });
    const resetProgress = () => { if (currentGuidedRun) { retiredRuns.add(currentGuidedRun); if (retiredRuns.size > 8) retiredRuns.delete(retiredRuns.values().next().value); } booking = null; currentGuidedRun = null; verifiedReceipt = null; sheetButtons[2].disabled = true; auditSection.hidden = true; auditSection.replaceChildren(); tourPause.hidden = true; tourNext.hidden = true; playbackCaption = ''; clearReading(); delete panel.dataset.tourPlayback; delete panel.dataset.stepState; delete panel.dataset.tourPreview; assignment.hidden = true; assignmentFields.querySelectorAll('dd').forEach(value => { value.textContent = ''; }); delete panel.dataset.phase; setProgress([['pending', 'Ready to try'], ['pending', 'Waiting'], ['pending', 'Waiting']]); };
    const callbacks = new Set();
    const explainHenry = index => {
      clearVerifiedRow();
      henrysStep = Math.max(0, Math.min(projects.henrys.steps.length - 1, index)); const current = projects.henrys.steps[henrysStep];
      stepTitle.textContent = current.title; narrative.textContent = current.text;
      previous.disabled = henrysStep === 0; next.disabled = henrysStep === projects.henrys.steps.length - 1; nextProject.disabled = henrysStep !== projects.henrys.steps.length - 1;
      const source = preview(henrysSheet, current.gid);
      if (!panel.hidden && appointments.frame.getAttribute('src') !== source) appointments.frame.src = source;
      appointments.label.textContent = current.gid === '1963309653' ? 'Personnel · read-only Sheet' : 'Appointments · read-only Sheet';
      customer.pane.classList.toggle('is-explained', current.pane !== 'sheet'); appointments.pane.classList.toggle('is-explained', current.pane !== 'website');
    };
    let disposing = false, initialized = false, restoreGeneration = 0, restoreFrame = null, projectWindow = null;
    const syncHenryLayout = () => {
      const expanded = !panel.hidden;
      column?.classList.toggle('henrys-project-column-open', expanded && (!projectWindow || panel.dataset.windowMode === 'docked'));
      card.classList.toggle('henrys-project-open', expanded); markProjectExpanded('henrys', expanded);
    };
    const ensureHenryWindow = () => {
      if (projectWindow || typeof window.DomProjectWindow?.create !== 'function') return;
      projectWindow = window.DomProjectWindow.create({ panel, header, handle: heading, minimizeButton: close,
        windowName: 'Henry’s', sourceLabel: 'Customer booking · Personnel · Google Sheets',
        onMinimize: () => syncHenryLayout(),
        onRestore: () => { showHenrys(); close.focus({ preventScroll: true }); },
        onModeChange: mode => { syncHenryLayout(); if (mode === 'docked' && !panel.hidden) scroll(panel); }
      });
    };
    const cancelRestoreRender = () => {
      restoreGeneration += 1;
      if (restoreFrame !== null) window.cancelAnimationFrame(restoreFrame);
      restoreFrame = null; delete panel.dataset.resuming;
    };
    const awaitRestoreRender = () => {
      cancelRestoreRender();
      const generation = restoreGeneration;
      panel.dataset.resuming = 'true';
      const rendered = () => generation === restoreGeneration && initialized && panel.isConnected && !panel.hidden;
      restoreFrame = window.requestAnimationFrame(() => {
        if (!rendered()) { if (generation === restoreGeneration) cancelRestoreRender(); return; }
        restoreFrame = window.requestAnimationFrame(() => {
          if (!rendered()) { if (generation === restoreGeneration) cancelRestoreRender(); return; }
          restoreFrame = null; delete panel.dataset.resuming;
          panel.dispatchEvent(new Event('dom-henrys-revealed'));
        });
      });
    };
    const cancelMinimize = () => {
      minimizeRequested = false; minimizeRun = null; minimizedPausedRun = null; delete panel.dataset.minimizing;
      if (status.textContent === 'Pausing after the current step…') status.textContent = panel.dataset.tourPlayback === 'paused' ? 'Walkthrough paused. Resume when you’re ready.' : 'Walkthrough restored.';
    };
    const hideMinimized = (state = null, runId = null) => {
      cancelRestoreRender();
      minimizeRequested = false; minimizeRun = null; delete panel.dataset.minimizing;
      minimizedPausedRun = state === 'paused' ? runId : null;
      if (projectWindow) projectWindow.minimize(); else { panel.hidden = true; syncHenryLayout(); }
      if (status.textContent === 'Pausing after the current step…') status.textContent = state === 'paused' ? 'Walkthrough paused. Restore Henry’s to resume.' : 'Walkthrough minimized.';
    };
    const minimize = () => {
      if (panel.hidden || minimizeRequested) return;
      const state = panel.dataset.tourPlayback;
      if (disposing || !book.disabled || ['complete', 'uncertain', 'error', 'stopped'].includes(state) || ['verified', 'unverified', 'error'].includes(panel.dataset.phase)) { hideMinimized(); return; }
      // The native form must stay visible until its current acknowledged step
      // finishes. Hiding it earlier makes the receiver reject its own controls.
      minimizeRequested = true; minimizeRun = currentGuidedRun; panel.dataset.minimizing = 'true';
      status.textContent = 'Pausing after the current step…'; sendTourControl('pause');
    };
    const dispose = () => {
      if (disposing || !initialized) return;
      disposing = true;
      cancelRestoreRender();
      cancelMinimize();
      // The booking host revokes its session before either live frame unloads.
      panel.dispatchEvent(new Event('dom-henrys-disposed'));
      projectWindow?.dispose(); projectWindow = null;
      hideMinimized(); customer.frame.removeAttribute('src'); appointments.frame.removeAttribute('src'); initialized = false;
      if (activeProject === 'henrys') { activeProject = null; stageOwnerSession = null; dockChat(false); }
      book.disabled = !guideFrame; book.textContent = 'Book a test appointment in Henry’s';
      resetProgress(); clearVerifiedRow(); details.open = false;
      disposing = false;
    };
    const reveal = (options = {}) => {
      if (options.background === true) return;
      cancelMinimize();
      minimizeCurrent('henrys');
      const wasClosed = panel.hidden;
      // Google wraps the native form in nested frames. Let both documents lay
      // out after display:none before the bridge sends their next UI command.
      if (wasClosed && currentGuidedRun) awaitRestoreRender();
      ensureHenryWindow();
      if (projectWindow) projectWindow.show(); else panel.hidden = false;
      activeProject = 'henrys'; syncHenryLayout();
      if (!customer.frame.hasAttribute('src')) customer.frame.src = henrysScheduler;
      if (!appointments.frame.hasAttribute('src')) appointments.frame.src = preview(henrysSheet, '1292912831');
      if (!initialized) { initialized = true; resetProgress(); explainHenry(0); status.textContent = 'Ready to explore. No booking has been requested.'; }
      dockChat(true);
      if (wasClosed && (!projectWindow || panel.dataset.windowMode === 'docked')) scroll(panel);
    };
    const safeText = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 160 ? value.trim() : null;
    const bookingData = receipt => {
      const worker = safeText(receipt.assignedName);
      if (!worker || typeof receipt.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(receipt.date)
          || !Number.isFinite(Date.parse(`${receipt.date}T12:00:00Z`)) || new Date(`${receipt.date}T12:00:00Z`).toISOString().slice(0, 10) !== receipt.date
          || typeof receipt.time !== 'string' || !/^(09|1[0-6]):00$/.test(receipt.time)
          || !['Mesa', 'Chandler'].includes(receipt.city) || !['Standard Poop Pickup', 'Premium Service'].includes(receipt.service)) return null;
      return { worker, date: receipt.date, time: receipt.time, city: receipt.city, service: receipt.service };
    };
    const showAssignment = (selected, receipt = null) => {
      if (!selected) { assignment.hidden = true; return; }
      assignment.hidden = false;
      values['Assigned to'].textContent = selected.worker;
      values.When.textContent = `${selected.date} at ${selected.time} · Arizona time`;
      values.Where.textContent = selected.city; values.Service.textContent = selected.service;
      values['Sheet record'].textContent = receipt ? `Row ${receipt.row} · ${receipt.status.trim() || 'Status not set'}` : 'Waiting for the saved row';
      values['Calendar reference'].textContent = receipt ? receipt.calendarReferencePresent ? 'Present in the saved record' : 'Not present in the saved record' : 'Not checked yet';
    };
    const narrate = (phase, data = {}) => {
      const receipt = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
      const selected = bookingData(receipt);
      const row = Number.isSafeInteger(receipt.row) && receipt.row > 1 ? receipt.row : null;
      const verified = selected && row && typeof receipt.status === 'string' && receipt.status.length <= 60 && typeof receipt.calendarReferencePresent === 'boolean';
      const phrases = {
        'opening-form': ['Let’s book a cleanup', 'Here’s the booking form a customer uses. Watch the test request become an assigned job.'],
        'entering-details': ['Putting in a test request', 'I’m filling out fictional contact details and marking this TEST. The customer chooses the service, city and date.'],
        'choosing-assignment': ['Giving the lighter schedule priority', 'The scheduler checks city coverage and working hours, then prioritizes the lighter appointment load. The worker comes back from the server.'],
        prepared: ['The worker is selected', selected ? `The scheduler returned ${selected.worker} for this time using coverage, working hours and appointment load. Next I’ll book it and check the saved job.` : 'The scheduler has not supplied complete assignment details yet. No saved job is claimed.'],
        'pressing-book': ['Booking the assigned job', 'Watch Book Appointment. I’m pressing it once, then checking the result in the Sheet.'],
        'checking-sheet': ['Checking the saved job', 'I’m looking for this exact TEST request and its assigned worker in Appointments.'],
        verified: ['That request is now somebody’s job', verified ? `The Sheet confirms row ${row}, assigned to ${selected.worker}. The customer form, worker schedule and job record are connected—nobody had to copy the request by hand. That’s the workflow this project demonstrates.` : 'The saved job could not be confirmed from these details. I won’t create another copy.'],
        unverified: ['The saved job needs a check', 'The request may have been sent, but its matching Sheet row is unconfirmed. I won’t create another copy.'],
        error: ['This step needs attention', 'I couldn’t finish this step. The status below explains why. I won’t call it complete without checking the saved record.']
      };
      if (!Object.hasOwn(phrases, phase)) return;
      if (phase === 'verified' && !verified) phase = 'unverified';
      delete panel.dataset.stepState; delete panel.dataset.tourPreview;
      clearReading();
      [stepTitle.textContent, narrative.textContent] = phrases[phase]; panel.dataset.phase = phase;
      clearVerifiedRow();
      appointments.label.textContent = 'Appointments · read-only Sheet';
      if (phase === 'opening-form' || phase === 'prepared') clearSavedProjection();
      if (phase === 'opening-form') { resetProgress(); panel.dataset.phase = phase; }
      if (phase === 'prepared') { booking = selected; showAssignment(booking); }
      if (phase === 'verified') {
        if (/^DOMTEST-[a-f0-9]{32}$/.test(receipt.runId || '')) currentGuidedRun = receipt.runId;
        verifiedReceipt = { ...receipt }; sheetButtons[2].disabled = false;
        booking = selected; showAssignment(booking, receipt);
        appointments.label.textContent = `Appointments · verified row ${row}`; showFullSheet.hidden = false; savedRowNote.hidden = false; appointments.pane.classList.add('henrys-verified-row');
      }
      if (['opening-form', 'entering-details'].includes(phase)) setProgress([['current', 'Entering test details'], ['pending', 'Waiting'], ['pending', 'Waiting']]);
      else if (phase === 'choosing-assignment') setProgress([['complete', 'Test details ready'], ['current', 'Checking the team'], ['pending', 'Waiting']]);
      else if (phase === 'prepared') setProgress([['complete', 'Test details ready'], [selected ? 'complete' : 'current', selected ? selected.worker : 'Details unconfirmed'], ['pending', 'Not saved yet']]);
      else if (['pressing-book', 'checking-sheet'].includes(phase)) setProgress([['complete', 'Test details ready'], [booking ? 'complete' : 'pending', booking ? booking.worker : 'Not confirmed'], ['current', phase === 'pressing-book' ? 'Booking once' : 'Checking the exact row']]);
      else if (phase === 'verified') setProgress([['complete', 'Test request'], ['complete', selected.worker], ['complete', `Verified row ${row}`]]);
      else if (phase === 'unverified') { showAssignment(booking); setProgress([['complete', 'Test request'], [booking ? 'complete' : 'pending', booking ? booking.worker : 'Not confirmed'], ['uncertain', 'Saved row unconfirmed']]); }
      else if (phase === 'error') { showAssignment(booking); setProgress([['uncertain', 'Step interrupted'], [booking ? 'complete' : 'pending', booking ? booking.worker : 'Not confirmed'], ['pending', 'Not verified']]); }
      if (['opening-form', 'entering-details', 'choosing-assignment', 'prepared', 'pressing-book', 'checking-sheet'].includes(phase)) book.disabled = true;
      else if (phase === 'verified' || phase === 'error') { book.disabled = !guideFrame; book.textContent = 'Book a test appointment in Henry’s'; }
      else if (phase === 'unverified') book.disabled = true;
      if (['checking-sheet', 'verified', 'unverified'].includes(phase)) {
        if (phase !== 'verified' || !row) appointments.label.textContent = 'Appointments · read-only Sheet'; customer.pane.classList.remove('is-explained'); appointments.pane.classList.add('is-explained');
        if (!panel.hidden && !appointments.frame.src.includes('gid=1292912831')) appointments.frame.src = preview(henrysSheet, '1292912831');
      } else { customer.pane.classList.add('is-explained'); appointments.pane.classList.remove('is-explained'); }
    };
    const guidedPhrases = selected => ({
        ready: ['Let’s walk through the real form', 'I’ve checked an available test slot. I’ll fill one field at a time so you can see what drives the booking. Pause me or ask a question whenever you like.'],
        date: ['Choose the day', `I’m entering ${selected.date}. The scheduler compares appointment counts over the seven-day window starting on this date.`],
        city: ['Choose the service area', `I’m choosing ${selected.city}. Personnel must cover this exact operating region before they can receive this job.`],
        service: ['Choose the cleanup', `This request is for ${selected.service}. I’m using the options in the original form.`],
        email: ['Enter a test contact', 'This form uses email, phone and address rather than a customer-name field. I’m entering a fictional example.invalid email for the demonstration.'],
        phone: ['Enter the test phone number', 'I’m filling the original phone field with a fictional demonstration number. No real customer details are needed.'],
        address: ['Make the test unmistakable', 'The address field carries TEST — DO NOT DISPATCH and a unique run reference. That lets me find this exact booking afterward.'],
        personnel: ['Here’s where the team is configured', 'Each Personnel row holds the worker’s region, working hours and Calendar ID. That Calendar ID tells Apps Script which schedule to check. The related Sheet shows that real configuration.'],
        assignment: ['Give the lighter appointment load first pick', `The scheduler returned ${selected.worker} for ${selected.date} at ${selected.time} in ${selected.city}. It checks region and hours, ranks matching Appointment counts, then takes the first available worker. Equal counts follow Personnel order.`],
        book: ['Everything is ready for one booking', 'The original Book Appointment button is highlighted. The next action clicks it once, then I’ll look for the exact job and assignment in Appointments. This is a load-aware rule, not a promise of equal job totals.' ]
      });
    const prepareStep = (step, review) => {
      const selected = bookingData(review || {});
      if (!selected || currentGuidedRun !== review.runId || !henryTourSteps.includes(step)) return;
      const [heading, text] = guidedPhrases(selected)[step];
      clearReading();
      stepTitle.textContent = heading;
      narrative.textContent = step === 'personnel' ? 'Next I’ll check Personnel: which region each worker covers, their working hours and the Calendar to check. Then I’ll show the related Sheet and the scheduling snapshot.'
        : step === 'book' ? 'I’ll point to the original Book Appointment button. After that step is checked, the next action will press it once and verify the exact saved job.' : text;
      panel.dataset.stepState = 'acting'; panel.dataset.tourPreview = step;
    };
    const guideStep = (step, review, audit) => {
      const selected = bookingData(review || {});
      if (!selected || !['ready', ...henryTourSteps].includes(step)) return;
      if (step === 'ready') currentGuidedRun = review.runId;
      if (currentGuidedRun !== review.runId) return;
      booking = selected; showAssignment(selected);
      const phrases = guidedPhrases(selected);
      panel.dataset.stepState = 'observed'; delete panel.dataset.tourPreview;
      [stepTitle.textContent, narrative.textContent] = phrases[step]; panel.dataset.phase = 'guided'; panel.dataset.tourStep = step;
      book.disabled = true;
      if (step === 'personnel' || step === 'assignment') {
        const target = preview(henrysSheet, '1963309653'); if (appointments.frame.src !== target) appointments.frame.src = target;
        appointments.label.textContent = 'Personnel · region, working hours and Calendar ID'; customer.pane.classList.remove('is-explained'); appointments.pane.classList.add('is-explained');
      } else { customer.pane.classList.add('is-explained'); appointments.pane.classList.remove('is-explained'); }
      if (audit && Array.isArray(audit.workers)) {
        auditSection.replaceChildren(); auditSection.hidden = false;
        const heading = document.createElement('h5'); heading.textContent = 'Fresh scheduling snapshot';
        const note = document.createElement('p'); note.textContent = `${audit.date} at ${audit.time} · ${audit.city}. Seven-day counts of Calendar events matching “Appointment”. This is a fresh diagnostic snapshot, not a trace of the earlier selection. Unknown checks stay unknown.${audit.selectionMatches === false ? ' Availability has changed since preparation; submission will recheck it.' : ''}`;
        const table = document.createElement('table'), head = document.createElement('thead'), headerRow = document.createElement('tr');
        ['Worker', 'Region', 'Hours', '7-day jobs', 'This slot', 'Selection'].forEach(label => { const cell = document.createElement('th'); cell.scope = 'col'; cell.textContent = label; headerRow.append(cell); }); head.append(headerRow); table.append(head);
        const body = document.createElement('tbody');
        audit.workers.forEach(worker => { const row = document.createElement('tr'); row.classList.toggle('is-selected', worker.selected); const slot = !worker.regionMatches ? 'Other region' : !worker.calendarConfigured ? 'No Calendar' : worker.withinHours === false ? 'Outside hours' : worker.withinHours === null || worker.slotConflict === null ? 'Unknown' : worker.slotConflict ? 'Appointment conflict' : 'Available';
          [worker.name, worker.region, worker.workingHours, worker.weeklyAppointments === null ? 'Unknown' : String(worker.weeklyAppointments), slot, worker.selected ? 'Returned worker' : '—'].forEach(value => { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }); body.append(row); }); table.append(body); auditSection.append(heading, note, table);
      }
      const team = ['personnel', 'assignment', 'book'].includes(step);
      setProgress([[team ? 'complete' : 'current', team ? 'Test details checked' : step === 'ready' ? 'Ready to fill the form' : 'Filling the form'], [team ? 'current' : 'pending', team ? selected.worker : 'Team check follows'], ['pending', 'Not saved yet']]);
    };
    const tourState = (state, step, runId, pending = false) => {
      if (currentGuidedRun ? currentGuidedRun !== runId : retiredRuns.has(runId)) return;
      if (minimizeRequested && (minimizeRun === null || minimizeRun === runId)) {
        minimizeRun = runId;
        if ((state === 'paused' || ['complete', 'uncertain', 'error', 'stopped'].includes(state)) && !pending) hideMinimized(state, runId);
        else if (state === 'running') sendTourControl('pause');
      } else if (panel.hidden && minimizedPausedRun === runId && state === 'running') {
        // Resume/Next is an explicit request to continue the native form demo.
        // Restore it before the following tool command arrives.
        reveal();
      }
      if (!currentGuidedRun || currentGuidedRun !== runId) return;
      panel.dataset.tourPlayback = state;
      const live = ['running', 'paused'].includes(state); tourPause.hidden = !live; tourNext.hidden = !live;
      tourPause.dataset.paused = String(state === 'paused'); tourPause.textContent = state === 'paused' ? 'Resume tour' : 'Pause tour';
      playbackCaption = live ? state === 'paused' ? 'Paused · ask Dom about this step' : 'Dom is showing this step' : state === 'complete' ? 'Tour complete · ask me about the result' : '';
      clearReading();
      if (state === 'complete' && step === 'calendar') showReferences();
    };
    const readingState = (until, runId) => {
      if (currentGuidedRun !== runId) return;
      clearReading();
      if (until === null || panel.dataset.tourPlayback !== 'running') return;
      const remaining = until - Date.now();
      if (!Number.isSafeInteger(until) || remaining <= 0 || remaining > 10000) return;
      const meanings = {ready: 'watch the handoff', date: 'the date drives the counts', city: 'the region chooses the team', service: 'the request sets the service', email: 'fictional test contact', phone: 'fictional test contact', address: 'spot the TEST label', personnel: 'coverage and working hours', assignment: 'see why this worker was chosen', book: 'one request, one saved job'};
      playbackLabel.textContent = `Reading pause · ${meanings[panel.dataset.tourStep] || 'take a look at this step'}`;
      tourPlayback.style.setProperty('--reading-duration', `${remaining}ms`); tourPlayback.classList.add('is-reading');
    };
    book.addEventListener('click', () => {
      if (book.disabled) return;
      cancelMinimize();
      narrate('opening-form'); setProgress([['current', 'Preparing the request'], ['pending', 'Waiting'], ['pending', 'Waiting']]);
      book.disabled = true; book.textContent = 'Test booking requested'; status.textContent = 'Dom is preparing one labeled TEST appointment…';
      guideFrame?.contentWindow?.postMessage({ type: 'dom-project-demo', action: 'book-henrys-test' }, window.location.origin);
    });
    previous.addEventListener('click', () => explainHenry(henrysStep - 1)); next.addEventListener('click', () => explainHenry(henrysStep + 1));
    nextProject.addEventListener('click', () => {
      nextProject.disabled = true;
      if (guideSession && stageOwnerSession === guideSession) reply({ session: guideSession }, true, 'Next project requested.', 'next');
      else openProject('kepler');
    });
    close.addEventListener('click', () => { minimize(); card.focus({ preventScroll: true }); });
    stop.addEventListener('click', () => { for (const callback of [...callbacks]) callback(); dispose(); });
    henrysView = Object.freeze({ panel, frame: customer.frame, sheet: appointments.frame, status, reveal, minimize, dispose, narrate, prepareStep, guideStep, tourState, readingState,
      onClose: callback => { if (typeof callback !== 'function') throw new Error('A close callback is required.'); callbacks.add(callback); return () => callbacks.delete(callback); } });
    return henrysView;
  }
  function showHenrys(session = null) {
    const view = makeHenrysView(); stageOwnerSession = session; view.reveal(); return view;
  }
  Object.defineProperty(window, 'DomHenrysDemo', { configurable: true, value: Object.freeze({ show: () => showHenrys() }) });
  window.addEventListener('message', event => {
    if (!guideFrame || event.source !== guideFrame.contentWindow || event.origin !== window.location.origin || !henrysView) return;
    const value = event.data;
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join(',') !== 'pending,runId,state,step,type'
        || value.type !== 'dom-henry-tour-ui-state' || !/^DOMTEST-[a-f0-9]{32}$/.test(value.runId || '')
        || typeof value.pending !== 'boolean'
        || !['running', 'paused', 'complete', 'uncertain', 'error', 'stopped'].includes(value.state)
        || !['opening', ...henryTourSteps, 'record', 'calendar'].includes(value.step)) return;
    henrysView.tourState(value.state, value.step, value.runId, value.pending);
  });
  window.addEventListener('message', event => {
    if (!guideFrame || event.source !== guideFrame.contentWindow || event.origin !== window.location.origin || !henrysView) return;
    const value = event.data;
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join(',') !== 'runId,type,until'
        || value.type !== 'dom-henry-reading' || !/^DOMTEST-[a-f0-9]{32}$/.test(value.runId || '')
        || !(value.until === null || Number.isSafeInteger(value.until) && value.until > Date.now() && value.until <= Date.now() + 10000)) return;
    henrysView.readingState(value.until, value.runId);
  });
  function addPane(name, heading, title, url, fallback, container = stageParts.panes) {
    const pane = document.createElement('section'); pane.className = 'dom-demo-pane'; pane.dataset.demoPane = name;
    const header = document.createElement('div'); header.className = 'dom-demo-pane-heading';
    const label = document.createElement('h4'); label.textContent = heading;
    const open = document.createElement('a'); open.href = fallback; open.textContent = 'Open ↗'; open.target = '_blank'; open.rel = 'noopener noreferrer'; open.setAttribute('aria-label', `Open ${heading} in a new tab`);
    const frame = document.createElement('iframe'); frame.title = title; frame.loading = 'eager'; frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.setAttribute('sandbox', name === 'website' ? 'allow-scripts allow-same-origin allow-forms allow-popups' : 'allow-scripts allow-same-origin allow-popups');
    frame.src = url; header.append(label, open); pane.append(header, frame); container.append(pane); return frame;
  }
  function addKeplerSource() {
    const keplerPanel = stage, keplerParts = stageParts;
    const disclosure = document.createElement('details'); disclosure.className = 'dom-demo-source';
    const summary = document.createElement('summary'); summary.textContent = 'Live Google Sheet data · read-only view';
    const content = document.createElement('div'); content.className = 'dom-demo-source-content';
    disclosure.append(summary, content); keplerParts.panes.append(disclosure);
    const renderSheet = () => {
      content.replaceChildren();
      if (!disclosure.open || !disclosure.isConnected || keplerPanel.hidden || activeProject !== 'kepler') return;
      const note = document.createElement('p'); note.className = 'preview-help';
      note.textContent = 'This map reads its original sample locations from Sheet1. The read-only table shows the same Name, Description, Latitude and Longitude columns used by the Google web app. Updates to the source Sheet appear on a fresh project load.';
      content.append(note);
      const source = new URL(keplerSite); source.searchParams.set('domSource', '1');
      if (portfolioOrigins.includes(window.location.origin)) { source.searchParams.set('domSession', token()); source.searchParams.set('domParent', window.location.origin); }
      addPane('sheet', 'Live Google Sheet data · read-only view', 'Kepler live Google Sheet data', source.href, source.href, content);
      const original = document.createElement('a'); original.href = `${keplerSheet}/edit#gid=0`; original.target = '_blank'; original.rel = 'noopener noreferrer';
      original.textContent = 'Open original Google Sheet (Google access required) ↗'; content.append(original);
    };
    return window.DomMapSource.create({ summary, content, renderSheet });
  }
  function addAltitudePlanner(session) {
    const source = new URL(altitudeSite);
    if (portfolioOrigins.includes(window.location.origin)) { source.searchParams.set('domSession', session || token()); source.searchParams.set('domParent', window.location.origin); }
    const frame = addPane('website', 'Live route planner', 'Altitude Directions live route planner', source.href, altitudeSite);
    const plannerStatus = stageParts.status;
    frame.addEventListener('load', () => {
      if (frame.isConnected) plannerStatus.textContent = 'Set a start and destination on the map. If the planner or voice is unavailable here, use Open live planner.';
    });
    frame.setAttribute('allow', 'microphone https://script.google.com https://*.googleusercontent.com');
    const pane = frame.closest('.dom-demo-pane');
    const open = pane.querySelector('a'); open.textContent = 'Open live planner ↗'; open.setAttribute('aria-label', 'Open the live route planner in a new tab');
    const caption = document.createElement('p'); caption.className = 'dom-demo-preview-caption';
    caption.textContent = 'Select Start or Destination, then click the map. If Google sign-in, embedding or voice is restricted in your browser, use Open live planner.';
    pane.append(caption);
  }
  function explain(index, target = activeProject) {
    const project = projects[target], view = projectStages.get(target); if (!project || !view) return;
    const source = target === 'kepler' ? view.sourceSnapshot : null;
    const steps = target === 'kepler' && view.sourceState === 'pending'
      ? [{ title: 'Loading the map’s data', text: 'Dom is importing the requested data. Its matching table and source details will appear when Kepler confirms the import.', pane: 'both' }]
      : target === 'kepler' && view.sourceState === 'error'
        ? [{ title: 'Map data is unverified', text: 'The latest import did not provide a trustworthy confirmation. The source table is hidden so it cannot imply a match that has not been checked.', pane: 'both' }]
        : source ? [
          { title: source.label, text: source.summary?.description || `${source.rowCount.toLocaleString('en-US')} ${source.unit} are loaded in this ${source.layer} view. Open the data disclosure below to inspect the records behind it.`, pane: 'website' },
          { title: 'The data behind this view', text: `${source.rowCount.toLocaleString('en-US')} ${source.unit}. ${source.selectionLabel} Source information and a compact table follow the map; geometry is summarized to keep the records readable.`, pane: 'both' },
          { title: source.summary?.analysis ? 'What Dom found' : 'Source and method', text: source.summary?.analysis?.summary || 'An anomaly investigation has not been supplied for this view. Inspect its source, field types and selection notes below, or ask Dom to investigate this data.', pane: 'sheet' }
        ] : project.steps;
    view.step = Math.max(0, Math.min(steps.length - 1, index));
    const current = steps[view.step], parts = view.parts;
    parts.stepTitle.textContent = current.title; parts.narrative.textContent = current.text;
    parts.position.textContent = `${view.step + 1} / ${steps.length}`;
    parts.previous.disabled = view.step === 0; parts.next.disabled = view.step === steps.length - 1;
    parts.previous.hidden = steps.length === 1; parts.next.hidden = steps.length === 1;
    parts.position.hidden = steps.length === 1; parts.nextProject.disabled = view.step !== steps.length - 1;
    parts.panes.querySelectorAll('[data-demo-pane]').forEach(pane => pane.classList.toggle('is-explained', current.pane === 'both' || current.pane === pane.dataset.demoPane));
  }
  const connectedKepler = () => typeof window.DomLiveTools?.attachKeplerView === 'function' && window.DomLiveTools.availability?.()?.kepler === true;
  const ensureProjectWindow = (current, target) => {
    if (current.window || typeof window.DomProjectWindow?.create !== 'function') return;
    current.window = window.DomProjectWindow.create({ panel: current.panel, header: current.parts.header, handle: current.parts.handle, minimizeButton: current.parts.minimizeButton,
      ...(target === 'altitude' ? { windowName: 'Altitude Directions', sourceLabel: 'Route planner · elevation along the journey' } : {}),
      onMinimize: focus => { markProjectExpanded(target, false); if (focus) projectCard(target)?.focus({ preventScroll: true }); },
      onRestore: () => { openProject(target); current.parts.minimizeButton.focus({ preventScroll: true }); },
      onModeChange: mode => { markProjectExpanded(target, !current.panel.hidden); if (mode === 'docked' && !current.panel.hidden) scroll(current.panel); }
    });
  };
  function openProject(target, session = null) {
    if (!Object.hasOwn(projects, target)) throw new Error('This project is unavailable.');
    if (target === 'henrys') { showHenrys(session); return 'Henry’s walkthrough is open in its movable project window. The booking tool and operational Sheet stay together; dock it below the animated website preview whenever you like.'; }
    minimizeCurrent(target);
    makeStage(target);
    const current = projectStages.get(target), alreadyVisible = !stage.hidden, freshView = !current.initialized;
    ensureProjectWindow(current, target);
    activeProject = target;
    if (!current.initialized) {
      stageParts.title.textContent = projects[target].title;
      if (target === 'kepler') {
        stageParts.status.textContent = connectedKepler()
          ? 'Connecting to Kepler. Connection and import results appear here; use Open if Google prevents embedding.'
          : 'Loading the original Google Sheet map. Use Open if Google requires access or prevents embedding.';
        const mapUrl = new URL(keplerSite);
        if (portfolioOrigins.includes(window.location.origin)) { mapUrl.searchParams.set('domSession', session || token()); mapUrl.searchParams.set('domParent', window.location.origin); }
        const connected = connectedKepler();
        const frame = addPane('website', 'Live Kepler map', 'Live Kepler mapping application', connected ? 'about:blank' : mapUrl.href, keplerSite);
        const mapHeading = frame.closest('.dom-demo-pane').querySelector('h4');
        const mapCaption = document.createElement('p'); mapCaption.className = 'dom-map-caption'; mapCaption.hidden = true; frame.before(mapCaption);
        const panel = stage;
        stageParts.keplerView = { panel, frame, status: stageParts.status,
          describeMap: ({ label, rows, layer, timeDomain, sourcePreview }) => {
            mapHeading.textContent = label;
            current.parts.retry.hidden = true;
            current.window?.setSource(label);
            const dates = timeDomain?.map(value => new Date(value).toISOString().slice(0, 10));
            const date = dates ? dates[0] === dates[1] ? dates[0] : `${dates[0]}–${dates[1]}` : '';
            mapCaption.textContent = `${rows.toLocaleString('en-US')} ${sourcePreview?.unit ?? (layer === 'trip' ? 'recorded trip segments' : 'mapped records')} · ${layer} view${date ? ` · ${date} UTC` : ''}`;
            mapCaption.hidden = false;
            if (sourcePreview) {
              current.sourceView.commit(sourcePreview); current.sourceSnapshot = sourcePreview; current.sourceState = 'imported';
              explain(0, 'kepler');
            }
          },
          sourcePending: label => { current.parts.retry.hidden = true; current.window?.setSource(`${label} · loading`); current.sourceView.pending(label); current.sourceState = 'pending'; explain(0, 'kepler'); },
          sourceError: message => { current.window?.setSource('Map data · unverified'); current.parts.status.textContent = `Map data is unverified. ${message}`; current.sourceView.error(message); current.sourceState = 'error'; explain(0, 'kepler'); },
          connectionError: message => { current.attached = false; current.parts.keplerView.sourceError(message); current.parts.retry.hidden = false; },
          reveal: (options = {}) => { if (options.background !== true || !panel.hidden) openProject('kepler', stageOwnerSession); },
          dispose: () => disposeStage('kepler') };
        current.sourceView = addKeplerSource();
      } else { stageParts.status.textContent = 'Loading the live route planner. Use Open live planner if Google requires access or prevents embedding.'; addAltitudePlanner(session); }
      current.initialized = true;
      explain(0, target);
    }
    stageOwnerSession = session;
    if (current.window) current.window.show(); else stage.hidden = false;
    markProjectExpanded(target, true); dockChat(true);
    if (!alreadyVisible && (!current.window || current.window.snapshot().mode === 'docked')) scroll(stage);
    if (target === 'kepler' && stageParts.keplerView && connectedKepler() && !current.attached) {
      current.attached = true;
      try { window.DomLiveTools.attachKeplerView(stageParts.keplerView); }
      catch (error) { current.attached = false; throw error; }
    }
    return target === 'kepler'
      ? freshView ? 'The Kepler window is open and loading. Follow its status for connection and import progress.' : 'The Kepler window is restored with its current data and view.'
      : 'The Altitude Directions window is open. Use its live planner or Open live planner if Google restricts embedding.';
  }
  // One demo action per card; screenshots are previews rather than duplicate links.
  document.querySelectorAll('[data-dom-project]').forEach(card => {
    const target = card.dataset.domProject, link = card.querySelector('a.btn-primary');
    if (!link || !Object.hasOwn(projects, target)) return;
    if (target === 'henrys') {
      const description = card.querySelector('.card-text');
      if (description) description.textContent = 'Service scheduling and workforce automation. Customer bookings connect to regional coverage, working hours, and appointment workload. The scheduler assigns the job and records it in Google Sheets and Calendar.';
    }
    const watch = document.createElement('p'); watch.className = 'project-watch';
    const watchLabel = document.createElement('strong'); watchLabel.textContent = 'What to watch';
    const watchText = document.createElement('span'); watchText.textContent = {
      henrys: 'One test request becomes assigned work in the Sheet. The worker and saved row are the proof.',
      kepler: 'See where events cluster and how trips move through time. Dom chooses a map that fits the data.',
      altitude: 'Inspect the whole climb, compare returned routes, and flag altitude change from the start or a separate ceiling.'
    }[target]; watch.append(watchLabel, watchText); card.querySelector('.card-body')?.append(watch);
    const button = document.createElement('button'); button.type = 'button'; button.className = `${link.className} project-open-action`; button.textContent = target === 'henrys' ? 'Explore Henry’s' : 'Explore project';
    const panelId = target === 'henrys' ? 'henrys-project-demo' : target === 'kepler' ? 'dom-project-demo' : 'altitude-project-demo';
    button.setAttribute('aria-controls', panelId); button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => openProject(target)); link.replaceWith(button);
    card.tabIndex = 0; card.setAttribute('role', 'group'); card.setAttribute('aria-label', `${projects[target].title} · press Enter to explore`);
    card.addEventListener('keydown', event => {
      if (event.target !== card || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault(); openProject(target);
    });
    card.addEventListener('click', event => {
      if (!(event.target instanceof window.Element) || event.target.closest('a,button,input,textarea,select,label,summary,details,iframe,[contenteditable],.dom-project-demo')) return;
      openProject(target);
    });
    const image = { kepler: 'kepler.png', altitude: 'altitude-route-map.jpg' }[target];
    const cover = document.createElement('div'); cover.className = image ? 'project-screenshot' : 'henrys-site-preview';
    if (image) {
      const img = document.createElement('img'); img.src = '/project-previews/' + image; img.loading = 'lazy'; img.decoding = 'async';
      img.alt = target === 'kepler' ? 'Kepler map displaying spreadsheet locations around Phoenix, Arizona' : 'Altitude Directions route map with terrain planning highlights'; cover.append(img);
    } else {
      const frame = document.createElement('iframe'); frame.title = 'Henry’s animated website preview'; frame.src = henrysSite; frame.loading = 'lazy'; frame.tabIndex = -1; frame.inert = true; frame.setAttribute('aria-hidden', 'true'); frame.setAttribute('sandbox', 'allow-scripts'); frame.referrerPolicy = 'no-referrer'; cover.append(frame);
      const original = document.createElement('a'); original.href = henrysSite; original.target = '_blank'; original.rel = 'noopener noreferrer'; original.className = 'henrys-original-site'; original.textContent = 'Open the original website ↗'; cover.append(original);
    }
    card.prepend(cover);
  });
  const projectHeading = document.querySelector('#projects h2');
  if (projectHeading) { const intro = document.createElement('p'); intro.className = 'preview-help'; intro.textContent = 'Explore the architecture, workflow, and analytical decisions behind each working system.'; projectHeading.after(intro); }
  makeStage();
  const openLinkedDemo = () => {
    const target = { '#henrys-live-workspace': 'henrys', '#kepler-live-workspace': 'kepler', '#altitude-live-workspace': 'altitude' }[window.location.hash];
    if (target) openProject(target);
  };
  // Deferred bridge/config scripts run after this script and before DOMContentLoaded.
  // Open an initial Kepler link once, with its final session URL rather than a fallback reload.
  if (window.location.hash === '#kepler-live-workspace' && document.readyState !== 'complete' && !connectedKepler()) {
    window.addEventListener('DOMContentLoaded', openLinkedDemo, { once: true });
  } else openLinkedDemo();
  window.addEventListener('hashchange', openLinkedDemo);
  // The experimental console agent uses these same fixed panels too.
  const presentFixedProject = target => {
    if (typeof target !== 'string' || !Object.hasOwn(projects, target)) throw new Error('Choose Henry’s, Kepler or Altitude Directions.');
    return openProject(target);
  };
  window.__shoegunPresentation = Object.freeze({
    showProject: presentFixedProject,
    openWorkspace: presentFixedProject,
    reset: closeStage,
    stack: () => { closeStage(); scroll(document.getElementById('projects')); }
  });

  // Opt-in research surface only. The existing guide receiver never calls this.
  // Raw DOM stays inside its trusted host adapter, never in model observations.
  const researchOwners = new WeakMap(), researchViews = new WeakMap();
  window.__shoegunProjectHostV1 = Object.freeze({
    protocol: 'dom-project-surface-v1',
    create(owner) {
      if (!owner || Object.keys(owner).sort().join(',') !== 'ownerRef,registryEpoch'
          || typeof owner.ownerRef !== 'string' || !owner.ownerRef.trim() || owner.ownerRef.length > 128
          || !Number.isSafeInteger(owner.registryEpoch) || owner.registryEpoch < 0) throw new Error('Invalid research owner.');
      const identity = Object.freeze({ ownerRef: owner.ownerRef, registryEpoch: owner.registryEpoch });
      const key = {}, tracking = new window.AbortController();
      let released = false, trackedFrame = null, trackedSource = null, contentInstanceId = null, removeLoad = null;
      const observe = () => {
        const current = projectStages.get('kepler'), panel = current?.panel || null;
        const controller = current?.window || null;
        if (controller && !researchViews.has(controller)) researchViews.set(controller, `project-view-${token()}`);
        const ownership = current && researchOwners.get(current);
        const frame = current?.parts.keplerView?.frame || null;
        const source = frame?.getAttribute('src') || null;
        // Passive load observation never connects the map's tool receiver and
        // never grants ownership of an existing user window.
        if (!released && (frame !== trackedFrame || source !== trackedSource)) {
          removeLoad?.(); trackedFrame = frame; trackedSource = source;
          contentInstanceId = frame ? `project-content-${token()}` : null;
          if (frame) {
            const changed = () => { contentInstanceId = `project-content-${token()}`; };
            frame.addEventListener('load', changed, { signal: tracking.signal });
            removeLoad = () => frame.removeEventListener('load', changed);
          } else removeLoad = null;
        }
        const state = current?.window?.snapshot();
        return { panel, content: frame, viewId: controller ? researchViews.get(controller) : null,
          contentInstanceId,
          windowOwnerRef: ownership?.ownerRef || (current?.initialized ? 'foreign-window' : null),
          actualMode: state?.mode || null, minimized: panel ? panel.hidden : false,
          connectionState: frame && source && source !== 'about:blank' ? 'configured' : 'unknown' };
      };
      return Object.freeze({
        protocol: 'dom-project-surface-v1', owner: identity, observe,
        apply(mode) {
          if (released || !['docked', 'floating', 'fullscreen', 'minimized'].includes(mode)) throw new Error('Research surface closed or mode unsupported.');
          // This first slice must use its isolated host. It cannot join or dock
          // the existing conversation, attach live data tools or pause Henry.
          if (guideFrame || window.DomLiveTools) throw new Error('An isolated research host is required.');
          if (activeProject && activeProject !== 'kepler') throw new Error('Another project is active; no window was changed.');
          let current = projectStages.get('kepler');
          if (current?.initialized && researchOwners.get(current)?.key !== key) throw new Error('Kepler is owned by another view session.');
          if (mode === 'minimized' && (!current?.initialized || researchOwners.get(current)?.key !== key)) throw new Error('No owned Kepler window to minimize.');
          if (typeof window.DomProjectWindow?.create !== 'function') throw new Error('Project window controller is unavailable.');
          if (!current?.initialized) {
            makeStage('kepler'); current = projectStages.get('kepler');
            researchOwners.set(current, { key, ownerRef: identity.ownerRef });
          }
          if (mode === 'minimized') current.window.minimize();
          else { openProject('kepler'); current.window.setMode(mode); }
          return observe();
        },
        dispose() { released = true; tracking.abort(); removeLoad?.(); }
      });
    }
  });

  const timeline = document.querySelector('.timeline-frame');
  const timelineContainer = document.querySelector('#timeline > .container');
  if (timeline && timelineContainer) {
    const resizeToken = crypto.randomUUID();
    const embedUrl = new URL(timeline.src); embedUrl.searchParams.set('portfolioResizeToken', resizeToken); timeline.src = embedUrl.toString();
    window.addEventListener('message', event => {
      const data = event.data;
      if (!/^https:\/\/([a-z0-9-]+\.)?googleusercontent\.com$/.test(event.origin)) return;
      if (data?.type !== 'portfolio-timeline-height' || data.token !== resizeToken) return;
      const height = Number(data.height); if (!Number.isFinite(height) || height < 100 || height > 30000) return;
      const viewportHeight = Number(data.viewportHeight);
      const wrapperHeight = Number.isFinite(viewportHeight) && viewportHeight > 0 ? Math.max(0, Math.min(120, timeline.clientHeight - viewportHeight)) : 0;
      timeline.style.minHeight = '0'; timeline.style.height = `${Math.ceil(height + wrapperHeight)}px`;
    });
    const heading = document.createElement('div'); heading.className = 'timeline-heading';
    const title = document.createElement('h2'); title.textContent = 'Experience, in perspective.';
    const link = document.createElement('a'); link.href = timeline.src; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Open full timeline';
    heading.append(title, link); timelineContainer.prepend(heading);
  }
  document.querySelectorAll('a[target="_blank"]').forEach(link => { link.rel = 'noopener noreferrer'; });

  // A technical session ties fixed commands to this exact same-origin chat frame.
  // The visitor's request starts it automatically; it is not a second permission UI.
  if (guideFrame) {
    const validCommand = command => {
      if (!command || typeof command !== 'object' || Array.isArray(command) || Object.keys(command).sort().join(',') !== 'action,id,session,target,type') return false;
      if (command.type !== 'dom-project-guide' || typeof command.session !== 'string' || !/^[a-f0-9]{32}$/.test(command.session) || typeof command.id !== 'string' || !/^[a-z0-9-]{1,60}$/.test(command.id) || typeof command.target !== 'string') return false;
      return ((command.action === 'start' || command.action === 'stop' || command.action === 'end-session' || command.action === 'hotdog-rain') && command.target === 'portfolio')
        || (command.action === 'show-project' && Object.hasOwn(projects, command.target))
        || (command.action === 'expand-henrys' && command.target === 'henrys')
        || (command.action === 'expand-kepler' && command.target === 'kepler') || (command.action === 'open-altitude' && command.target === 'altitude');
    };
    window.addEventListener('message', event => {
      if (event.origin !== window.location.origin || event.source !== guideFrame.contentWindow) return;
      const command = event.data;
      if (command && typeof command === 'object' && !Array.isArray(command) && ['dom-rain-request', 'dom-rain-stop'].includes(command.type)) {
        const fields = Object.keys(command).sort().join(',');
        if (command.type === 'dom-rain-stop' && fields === 'type') { stopRain(false); rainState(false); return; }
        if (command.type !== 'dom-rain-request' || fields !== 'durationMs,type' || !validRainDuration(command.durationMs)) return;
        try { startRain(command.durationMs); }
        catch {
          stopRain(false); rainState(false); rainStatus = document.createElement('aside'); rainStatus.className = 'dom-effect-status'; rainStatus.setAttribute('role', 'status'); rainStatus.textContent = 'The hotdog animation is still loading. Try again in a moment.'; document.body.append(rainStatus);
        }
        return;
      }
      if (!validCommand(command)) return;
      if (command.action === 'start') {
        if (command.session === guideSession && seen.has(command.id)) { reply(command, false, 'This tool request has already been handled.'); return; }
        // A fresh handshake should not close a demo already opened by a card.
        guideSession = command.session; seen.clear(); seen.add(command.id); window.clearTimeout(guideTimer);
        guideTimer = window.setTimeout(() => stopGuide(), 10 * 60 * 1000); reply(command, true, 'Dom is ready.'); return;
      }
      if (!guideSession || command.session !== guideSession) { reply(command, false, 'The page connection expired. Reconnect Dom and retry.'); return; }
      if (seen.has(command.id)) { reply(command, false, 'This tool request has already been handled.'); return; }
      seen.add(command.id);
      if (command.action === 'end-session') { stopGuide(false); reply(command, true, 'Project controls released.'); return; }
      if (command.action === 'stop') { stopRain(); stopGuide(false); reply(command, true, 'Demo stopped.'); return; }
      try {
        if (command.action === 'hotdog-rain') {
          reply(command, true, startRain(null));
        } else reply(command, true, openProject(command.target, guideSession));
      } catch (error) { reply(command, false, error.message || 'The project demo could not open.'); }
    });
    guideFrame.addEventListener('load', () => { stopRain(); if (guideSession || stageOwnerSession) stopGuide(); });
    window.addEventListener('pagehide', () => { stopRain(); stopGuide(false); });
    window.addEventListener('visibilitychange', () => { if (!document.hidden && rainDeadline !== null && Date.now() >= rainDeadline) stopRain(); }, true);
  }
})();
