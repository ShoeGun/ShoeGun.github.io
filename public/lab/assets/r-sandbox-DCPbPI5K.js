/*! @license
S2 Hilbert/cube transforms follow s2-geometry 1.2.10, ISC licensed:
https://unpkg.com/s2-geometry@1.2.10/src/s2geometry.js
Copyright (c) 2012-2016, Jon Atkins <github@jonatkins.com>
Copyright (c) 2016, AJ ONeal <aj@daplie.com>
Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.
THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
Boundary sampling matches deck.gl 8.0.15 s2-utils.js (MIT):
https://github.com/visgl/deck.gl/blob/v8.0.15/modules/geo-layers/src/s2-layer/s2-utils.js
Copyright (c) 2015-2017 Uber Technologies, Inc. Permission is hereby granted,
free of charge, to any person obtaining a copy of this software and
associated documentation files (the "Software"), to deal in the Software
without restriction, including without limitation the rights to use, copy,
modify, merge, publish, distribute, sublicense, and/or sell copies of the
Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions: The above copyright notice and this
permission notice shall be included in all copies or substantial portions
of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
USE OR OTHER DEALINGS IN THE SOFTWARE.

*/
import{n as e,r as t,t as n}from"./index-Ca2TQkCi.js";var r=`https://webr.r-wasm.org/v0.6.0/`;function i(e,t,n){let r=e.data;return t!==null&&e.source===t&&e.origin===`null`&&!!r&&r.type===`dom-r-response`&&r.token===n&&Number.isSafeInteger(r.id)&&Number(r.id)>=0&&typeof r.ok==`boolean`}function a(t){return`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${`default-src 'none'; script-src 'nonce-${t}' https://webr.r-wasm.org 'wasm-unsafe-eval' 'unsafe-eval' blob:; connect-src https://webr.r-wasm.org; worker-src blob: https://webr.r-wasm.org; img-src 'none'; style-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none';`}"><script type="module" nonce="${t}">
const token = ${JSON.stringify(t)};
const baseUrl = ${JSON.stringify(r)};
let runtime;
let activeCapture = null;
const stages = ${JSON.stringify(e)};
const markerPrefix = ${JSON.stringify(n)};
const respond = (id, ok, value, error) => parent.postMessage({type:'dom-r-response',token,id,ok,value,error}, '*');
const progress = (message) => respond(0, true, {progress:message});
let initialized = false;
window.addEventListener('error', event => { if (!initialized) respond(0, false, null, String(event.message || 'R frame script error.')); });
window.addEventListener('unhandledrejection', event => { if (!initialized) respond(0, false, null, String(event.reason?.message || event.reason || 'R frame initialization rejected.')); });
window.addEventListener('securitypolicyviolation', event => {
  if (!initialized) respond(0, false, null, 'R sandbox CSP blocked ' + event.effectiveDirective + ': ' + event.blockedURI);
});
const NativeWorker = globalThis.Worker;
globalThis.Worker = class extends NativeWorker {
  constructor(url, options) {
    super(url, options);
    progress('R worker created; waiting for its boot handshake…');
    this.addEventListener('message', event => {
      if (initialized) return;
      const message = event.data;
      if (message?.type === 'stdout' || message?.type === 'stderr') {
        const text = String(message.data || '').trim().slice(0, 1200);
        if (message.type === 'stderr' && /(?:EvalError|RuntimeError|CompileError|LinkError|Aborted)/.test(text)) respond(0, false, null, 'R startup: ' + text);
        else if (text) progress('R startup ' + message.type + ': ' + text);
      } else if (message?.type === 'system' && /^console\\.(?:error|warn|log)$/.test(String(message.data?.type))) {
        const text = String(message.data?.data || '').trim().slice(0, 1200);
        if (message.data.type === 'console.error') respond(0, false, null, 'R startup: ' + text);
        else if (text) progress('R startup: ' + text);
      }
    });
    this.addEventListener('error', event => {
      if (!initialized) respond(0, false, null, String(event.message || 'The isolated R worker failed before initialization.'));
    });
    this.addEventListener('messageerror', () => {
      if (!initialized) respond(0, false, null, 'The isolated R worker sent an unreadable startup response.');
    });
  }
};
const printable = async (value) => {
  if (typeof value === 'string') return value.slice(0, 4000);
  if (value && typeof value.toJs === 'function') value = await value.toJs();
  return JSON.stringify(value)?.slice(0, 4000) || String(value);
};
window.addEventListener('message', async (event) => {
  const message = event.data;
  if (event.source !== parent || !message || message.type !== 'dom-r-request' || message.token !== token || !Number.isSafeInteger(message.id)) return;
  if (message.action === 'close') { runtime?.close(); return; }
  if (message.action !== 'capture' || typeof message.code !== 'string' || message.code.length > 64 * 1024 * 1024) return;
  if (activeCapture) { respond(message.id, false, null, 'R is already running a program.'); return; }
  const execution = {id:message.id, output:[], lastStage:'', progressCount:0};
  activeCapture = execution;
  let shelter;
  try {
    if (!runtime) throw Error('R is not initialized.');
    shelter = await new runtime.Shelter();
    const capture = await shelter.captureR(message.code, {captureStreams:false,captureConditions:true,withAutoprint:false});
    const value = await capture.result.toJs();
    const output = [];
    for (const entry of capture.output.slice(0, 200)) output.push({type:entry.type,data:await printable(entry.data)});
    output.push(...execution.output);
    respond(message.id, true, {resultValue:value,output});
  } catch (error) { respond(message.id, false, null, String(error?.message || error).slice(0, 4000)); }
  finally { if (activeCapture === execution) activeCapture = null; if (shelter) await shelter.purge(); }
});
try {
  // webR 0.6.0's cross-origin helper passes location.origin to new URL(),
  // which throws for an opaque origin (the literal string "null"). Keep the
  // sandbox and replace only that helper in the exact hash-pinned loader.
  progress('Isolated frame ready; downloading pinned webR loader…');
  const response = await fetch(baseUrl + 'webr.mjs', {credentials:'omit',referrerPolicy:'no-referrer'});
  if (!response.ok) throw Error('The pinned webR loader returned HTTP ' + response.status);
  const bytes = await response.arrayBuffer();
  progress('Checking the pinned webR loader integrity…');
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2,'0')).join('');
  if (digest !== '4c04d3240de6cd3e7f59e081756168faa8566f8a8b97251400770939815c344a') throw Error('Pinned webR loader integrity check failed.');
  const source = new TextDecoder().decode(bytes);
  const before = 'new URL(r,location.origin)';
  if (source.split(before).length !== 2) throw Error('Pinned webR opaque-origin compatibility check failed.');
  const loaderUrl = URL.createObjectURL(new Blob([source.replace(before, 'new URL(r)')], {type:'text/javascript'}));
  let module;
  try { module = await import(loaderUrl); } finally { URL.revokeObjectURL(loaderUrl); }
  progress('Pinned loader verified; starting the isolated R worker…');
  const {WebR, ChannelType} = module;
  runtime = new WebR({baseUrl,channelType:ChannelType.PostMessage,interactive:false});
  await runtime.init();
  await runtime.flush();
  initialized = true;
  void (async () => {
    for (;;) {
      const entry = await runtime.read();
      if (entry.type === 'closed') return;
      const execution = activeCapture;
      if (!execution || (entry.type !== 'stdout' && entry.type !== 'stderr')) continue;
      const text = String(entry.data);
      const stage = text.startsWith(markerPrefix) && text.length <= 100 ? text.slice(markerPrefix.length) : '';
      if (Object.prototype.hasOwnProperty.call(stages, stage)) {
        if (execution.lastStage !== stage && execution.progressCount < 2048) {
          execution.lastStage = stage;
          execution.progressCount += 1;
          respond(execution.id, true, {progress:stages[stage]});
        }
      }
      else if (execution.output.length < 200) execution.output.push({type:entry.type,data:text.slice(0,4000)});
    }
  })().catch(() => {});
  respond(0, true, null);
} catch (error) { respond(0, false, null, String(error?.message || error).slice(0, 4000)); }
<\/script>`}async function o(){class e{constructor(){this.frame=null,this.token=Array.from(crypto.getRandomValues(new Uint8Array(24)),e=>e.toString(16).padStart(2,`0`)).join(``),this.sequence=0,this.pending=new Map,this.ready=null,this.closed=!1,this.onMessage=e=>{if(!i(e,this.frame?.contentWindow||null,this.token))return;let n=this.pending.get(e.data.id);if(n){if(e.data.id===0&&e.data.ok&&e.data.value&&typeof e.data.value==`object`&&`progress`in e.data.value&&typeof e.data.value.progress==`string`){this.onStatus?.(e.data.value.progress.slice(0,4e3));return}if(e.data.id>0&&e.data.ok&&e.data.value&&typeof e.data.value==`object`&&`progress`in e.data.value){t(e.data.value.progress)&&n.onProgress?.(e.data.value.progress);return}this.pending.delete(e.data.id),e.data.ok?n.resolve(e.data.value):n.reject(Error(typeof e.data.error==`string`?e.data.error:`The isolated R runtime failed.`))}},this.init=async e=>{if(this.onStatus||=e,this.closed)throw Error(`The isolated R frame was closed.`);return this.ready||=new Promise((e,t)=>{this.pending.set(0,{resolve:()=>e(),reject:t});let n=document.createElement(`iframe`);n.title=`Isolated R execution worker`,n.hidden=!0,n.setAttribute(`sandbox`,`allow-scripts`),n.setAttribute(`allow`,`camera 'none'; microphone 'none'; geolocation 'none'; clipboard-read 'none'; clipboard-write 'none'`),n.referrerPolicy=`no-referrer`,n.srcdoc=a(this.token),this.frame=n,window.addEventListener(`message`,this.onMessage),document.body.appendChild(n)}),this.ready},this.capture=async(e,t)=>{if(await this.init(),this.closed||!this.frame?.contentWindow)throw Error(`The isolated R frame was closed.`);let n=++this.sequence;return new Promise((r,i)=>{this.pending.set(n,{resolve:r,reject:i,onProgress:t}),this.frame?.contentWindow?.postMessage({type:`dom-r-request`,token:this.token,id:n,action:`capture`,code:e},`*`)})},this.Shelter=class{constructor(e){this.captureR=async(e,t,n)=>{let r=await this.capture(e,n);return{result:{toJs:async()=>r.resultValue},output:r.output}},this.purge=async()=>{},this.capture=e}},this.close=()=>{if(!this.closed){this.closed=!0,this.frame?.contentWindow?.postMessage({type:`dom-r-request`,token:this.token,id:++this.sequence,action:`close`},`*`),window.removeEventListener(`message`,this.onMessage),this.frame?.remove(),this.frame=null;for(let e of this.pending.values())e.reject(Error(`The isolated R frame was closed.`));this.pending.clear()}};let e=this.capture;this.Shelter=class extends this.Shelter{constructor(){super(e)}}}}return{WebR:e,ChannelType:{PostMessage:3}}}export{o as createSandboxModule};