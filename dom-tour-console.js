/* global document, window */
(() => {
  'use strict';
  if (window.DomTourConsole) return;

  // The console controls the already requested walkthrough. It cannot start a
  // booking, choose a target, enter data, or execute visitor-provided code.
  const frame = document.querySelector('iframe.portfolio-lab-frame');
  const source = frame?.getAttribute('src');
  const visible = element => {
    if (!element?.isConnected || element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
    for (let current = element; current; current = current.parentElement) {
      const style = window.getComputedStyle(current);
      if (style.display === 'none' || ['hidden', 'collapse'].includes(style.visibility)) return false;
    }
    return true;
  };
  function activePanel() {
    const frames = document.querySelectorAll('iframe.portfolio-lab-frame');
    if (!frame?.isConnected || frames.length !== 1 || frames[0] !== frame || !frame.contentWindow || frame.getAttribute('src') !== source) return null;
    try {
      const url = new URL(source, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== '/lab/' || url.search || url.hash) return null;
    } catch { return null; }
    const panels = document.querySelectorAll('#henrys-project-demo');
    if (panels.length !== 1) return null;
    const panel = panels[0], state = panel.dataset.tourPlayback;
    if (!visible(panel) || !['running', 'paused'].includes(state)) return null;
    // A hidden playback button means the host has reset/disposed the tour,
    // even if an old state attribute survived on the reusable project panel.
    const controls = panel.querySelectorAll('.henrys-demo-actions button[data-paused]');
    if (controls.length !== 1 || !visible(controls[0]) || controls[0].disabled || controls[0].dataset.paused !== String(state === 'paused')) return null;
    return panel;
  }
  function command(action, args) {
    if (args.length !== 0) return false;
    const panel = activePanel();
    if (!panel || action === 'pause' && panel.dataset.tourPlayback !== 'running' || action === 'resume' && panel.dataset.tourPlayback !== 'paused') return false;
    if (action === 'stop') {
      const stop = panel.querySelectorAll('.dom-demo-heading > button.dom-demo-stop');
      if (stop.length !== 1 || !visible(stop[0]) || stop[0].disabled) return false;
      stop[0].click();
    } else {
      frame.contentWindow.postMessage({ type: 'dom-henry-tour-control', action }, window.location.origin);
    }
    return true;
  }
  Object.defineProperty(window, 'DomTourConsole', { configurable: true, value: Object.freeze({
    pause: (...args) => command('pause', args),
    resume: (...args) => command('resume', args),
    next: (...args) => command('next', args),
    stop: (...args) => command('stop', args)
  }) });
})();
