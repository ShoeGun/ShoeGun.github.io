/* global window, document */
(() => {
  'use strict';
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

  function create({ panel, header, handle, minimizeButton, onMinimize, onRestore, onModeChange, windowName = 'map', sourceLabel = 'Google Sheets · original sample' }) {
    let mode = 'floating', previousMode = 'floating', rect = null, savedRect = null, gesture = null, disposed = false;
    let preferredRect = null, floatingClass = null;
    const preferredByViewport = {};
    const listeners = [];
    const listen = (target, type, callback, options) => {
      target.addEventListener(type, callback, options);
      listeners.push(() => target.removeEventListener(type, callback, options));
    };
    const button = (className, label, glyph) => {
      const item = document.createElement('button'); item.type = 'button'; item.className = className;
      item.setAttribute('aria-label', label); item.title = label;
      const icon = document.createElement('span'); icon.setAttribute('aria-hidden', 'true'); icon.textContent = glyph;
      item.append(icon); return item;
    };
    const dock = button('dom-map-window-action', `Dock ${windowName} in its project card`, '↙');
    const maximize = button('dom-map-window-action', `Maximize ${windowName}`, '□');
    header.insertBefore(dock, minimizeButton); header.insertBefore(maximize, minimizeButton);
    const source = document.createElement('p'); source.className = 'dom-map-window-source'; source.textContent = sourceLabel; handle.append(source);
    const resize = button('dom-map-window-resize', `Resize ${windowName}. Use arrow keys; Shift changes size faster.`, '◢');
    const shield = document.createElement('div'); shield.className = 'dom-map-window-shield'; shield.hidden = true; shield.setAttribute('aria-hidden', 'true');
    panel.append(resize, shield);
    const restore = document.createElement('button'); restore.type = 'button'; restore.className = 'dom-map-window-restore'; restore.hidden = true;
    restore.textContent = `↗ Restore ${windowName}`; restore.setAttribute('aria-controls', panel.id);
    let restoreTray = document.querySelector('.dom-project-window-restores');
    if (!restoreTray) {
      restoreTray = document.createElement('aside'); restoreTray.className = 'dom-project-window-restores';
      restoreTray.setAttribute('aria-label', 'Minimized project windows'); document.body.append(restoreTray);
    }
    restoreTray.append(restore);
    const syncRestores = () => { restoreTray.hidden = ![...restoreTray.children].some(item => !item.hidden); };
    syncRestores();
    panel.classList.add('dom-project-window'); if (windowName === 'map') panel.classList.add('dom-kepler-window');
    header.classList.add('dom-map-window-chrome'); handle.classList.add('dom-map-window-drag');
    handle.tabIndex = 0; handle.setAttribute('role', 'button'); handle.setAttribute('aria-label', `Move ${windowName} window. Use arrow keys; Shift moves faster.`);
    const viewport = () => {
      const visual = window.visualViewport;
      const width = visual?.width || document.documentElement.clientWidth || window.innerWidth;
      const height = visual?.height || window.innerHeight;
      const left = visual?.offsetLeft || 0, top = visual?.offsetTop || 0;
      const chat = document.body.classList.contains('dom-following-chat'), hidden = document.body.classList.contains('dom-chat-hidden');
      const compact = document.body.classList.contains('dom-chat-expanded') ? Math.min(480, Math.max(0, height - 145)) : Math.min(168, Math.max(0, height - 175));
      const topSpace = height < 440 || (width <= 900 && (height < 625 || (chat && !hidden && document.body.classList.contains('dom-chat-expanded')))) || mode === 'fullscreen' ? 12 : 80;
      // A keyboard or landscape viewport must not hide the window controls
      // beneath an expanded chat. Keep a reachable window; chat can be minimized.
      const bottomSpace = width <= 900 && chat && !hidden ? Math.min(compact + 64, Math.max(12, height - topSpace - 180)) : 12;
      const rightSpace = mode === 'fullscreen' && width > 900 && chat && !hidden ? 386 : 12;
      return { left: left + 12, top: top + topSpace, width: Math.max(1, width - 12 - rightSpace), height: Math.max(1, height - topSpace - bottomSpace) };
    };
    const bounded = value => {
      const area = viewport();
      const width = clamp(value.width, Math.min(360, area.width), area.width);
      const height = clamp(value.height, Math.min(280, area.height), area.height);
      return { x: clamp(value.x, area.left, area.left + area.width - width), y: clamp(value.y, area.top, area.top + area.height - height), width, height };
    };
    const initialRect = () => {
      const area = viewport(), visual = window.visualViewport, width = visual?.width || window.innerWidth;
      const fullHeight = visual?.height || window.innerHeight;
      return { x: area.left + (width > 900 ? 12 : 0), y: area.top + 8,
        width: width > 900 ? Math.min(1000, width - 422) : area.width,
        height: Math.min(700, fullHeight - (area.top - (visual?.offsetTop || 0)) - 24) };
    };
    const layout = () => {
      if (disposed) return;
      panel.dataset.windowMode = mode;
      if (mode === 'docked') {
        for (const name of ['left', 'top', 'width', 'height']) panel.style.removeProperty(name);
      } else {
        if (mode === 'fullscreen') { const area = viewport(); rect = { x: area.left, y: area.top, width: area.width, height: area.height }; }
        else {
          const nextClass = (window.visualViewport?.width || window.innerWidth) <= 900 ? 'phone' : 'desktop';
          if (nextClass !== floatingClass) {
            if (floatingClass && preferredRect) preferredByViewport[floatingClass] = { ...preferredRect };
            preferredRect = preferredByViewport[nextClass] || initialRect(); floatingClass = nextClass;
          }
          preferredRect ||= initialRect();
          // Viewport/chat constraints are temporary. Keep the visitor's chosen
          // bounds so making space again restores a useful map automatically.
          rect = bounded(preferredRect);
        }
        Object.assign(panel.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` });
      }
      const isDocked = mode === 'docked', isFull = mode === 'fullscreen';
      dock.setAttribute('aria-label', isDocked ? `Float ${windowName} above the page` : `Dock ${windowName} in its project card`); dock.title = dock.getAttribute('aria-label');
      dock.firstChild.textContent = isDocked ? '↗' : '↙';
      maximize.setAttribute('aria-label', isFull ? `Restore ${windowName} size` : `Maximize ${windowName}`); maximize.title = maximize.getAttribute('aria-label');
      maximize.firstChild.textContent = isFull ? '❐' : '□'; maximize.setAttribute('aria-pressed', String(isFull));
      resize.hidden = isDocked || isFull; handle.setAttribute('aria-disabled', String(isDocked || isFull));
    };
    const endGesture = () => {
      if (!gesture) return;
      const current = gesture; gesture = null;
      if (current.target.hasPointerCapture?.(current.id)) current.target.releasePointerCapture(current.id);
      shield.hidden = true; panel.classList.remove('is-manipulating');
    };
    const setMode = next => {
      if (disposed || !['floating', 'docked', 'fullscreen'].includes(next)) return;
      endGesture();
      if (next === 'fullscreen' && mode !== 'fullscreen') { previousMode = mode; savedRect = preferredRect && { ...preferredRect }; }
      if (mode === 'fullscreen' && next !== 'fullscreen' && savedRect) preferredRect = { ...savedRect };
      mode = next; layout(); onModeChange?.(mode);
    };
    const startGesture = (event, kind) => {
      if (disposed || mode !== 'floating' || (event.button !== undefined && event.button !== 0) || event.isPrimary === false) return;
      event.preventDefault(); endGesture();
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, rect: { ...rect }, kind, target: event.currentTarget };
      gesture.target.setPointerCapture?.(gesture.id); shield.hidden = false; panel.classList.add('is-manipulating');
    };
    const key = (event, kind) => {
      if (mode !== 'floating' || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') rect = initialRect();
      else {
        const step = event.shiftKey ? 48 : 12;
        const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
        const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
        rect = bounded(kind === 'move' ? { ...rect, x: rect.x + dx, y: rect.y + dy } : { ...rect, width: rect.width + dx, height: rect.height + dy });
      }
      preferredRect = kind === 'move' && event.key !== 'Home' ? { ...preferredRect, x: rect.x, y: rect.y } : { ...rect }; layout();
    };
    listen(dock, 'click', () => setMode(mode === 'docked' ? 'floating' : 'docked'));
    listen(maximize, 'click', () => setMode(mode === 'fullscreen' ? previousMode : 'fullscreen'));
    listen(restore, 'click', () => onRestore?.());
    listen(handle, 'pointerdown', event => startGesture(event, 'move'));
    listen(resize, 'pointerdown', event => startGesture(event, 'resize'));
    listen(handle, 'keydown', event => key(event, 'move')); listen(resize, 'keydown', event => key(event, 'resize'));
    listen(panel, 'keydown', event => { if (event.key === 'Escape' && mode === 'fullscreen') { event.preventDefault(); setMode(previousMode); } });
    listen(window, 'pointermove', event => {
      if (!gesture || event.pointerId !== gesture.id) return;
      event.preventDefault();
      const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
      rect = bounded(gesture.kind === 'move' ? { ...gesture.rect, x: gesture.rect.x + dx, y: gesture.rect.y + dy }
        : { ...gesture.rect, width: gesture.rect.width + dx, height: gesture.rect.height + dy });
      preferredRect = gesture.kind === 'move' ? { ...preferredRect, x: rect.x, y: rect.y } : { ...rect }; layout();
    }, { passive: false });
    for (const type of ['pointerup', 'pointercancel']) listen(window, type, event => { if (gesture && event.pointerId === gesture.id) endGesture(); });
    for (const target of [handle, resize]) listen(target, 'lostpointercapture', endGesture);
    listen(window, 'resize', layout); listen(window, 'blur', endGesture);
    if (window.visualViewport) { listen(window.visualViewport, 'resize', layout); listen(window.visualViewport, 'scroll', layout); }
    const observer = new window.MutationObserver(layout); observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    layout();
    return Object.freeze({
      show: () => { if (!disposed) { panel.hidden = false; restore.hidden = true; syncRestores(); layout(); } },
      minimize: ({ focus = false } = {}) => { if (!disposed) { endGesture(); panel.hidden = true; restore.hidden = false; syncRestores(); onMinimize?.(focus); } },
      setSource: label => { if (!disposed && typeof label === 'string') { source.textContent = label; restore.title = `Restore ${windowName} · ${label}`; } },
      setMode,
      snapshot: () => ({ mode, minimized: panel.hidden, rect: rect && { ...rect } }),
      dispose: () => {
        if (disposed) return;
        endGesture(); disposed = true; observer.disconnect(); listeners.forEach(remove => remove());
        dock.remove(); maximize.remove(); resize.remove(); shield.remove(); restore.remove(); source.remove();
        if (!restoreTray.children.length) restoreTray.remove(); else syncRestores();
        panel.classList.remove('dom-project-window', 'dom-kepler-window'); header.classList.remove('dom-map-window-chrome'); handle.classList.remove('dom-map-window-drag');
        handle.removeAttribute('tabindex'); handle.removeAttribute('role'); handle.removeAttribute('aria-label'); handle.removeAttribute('aria-disabled');
        delete panel.dataset.windowMode;
        for (const name of ['left', 'top', 'width', 'height']) panel.style.removeProperty(name);
      }
    });
  }
  window.DomProjectWindow = Object.freeze({ create });
  window.DomMapWindow = window.DomProjectWindow;
})();
