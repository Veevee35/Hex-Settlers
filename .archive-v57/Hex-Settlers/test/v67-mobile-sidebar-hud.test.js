const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const client = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');

// Extract the real production function so the test covers the same DOM code.
function sourceOf(name) {
  const start = client.indexOf(`function ${name}() {`);
  assert.ok(start >= 0, `missing ${name}`);
  const brace = client.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < client.length; i++) {
    if (client[i] === '{') depth++;
    if (client[i] === '}' && --depth === 0) return client.slice(start, i + 1);
  }
  throw new Error(`unclosed function ${name}`);
}

function el(name, parent=null) {
  return {
    id:name, parentNode:parent, children:[], style:{},
    classList:{add(){}, remove(){}},
    setAttribute(){}, addEventListener(){},
    remove() {
      if (this.parentNode) {
        this.parentNode.children = this.parentNode.children.filter(n => n !== this);
        this.parentNode = null;
      }
    },
    insertBefore(child, reference) {
      // Same strict reference-node requirement as the DOM.
      if (reference && reference.parentNode !== this) throw new Error('NotFoundError: reference is not a child');
      if (child.parentNode) child.remove();
      const idx = reference ? this.children.indexOf(reference) : this.children.length;
      this.children.splice(idx, 0, child);
      child.parentNode = this;
    },
  };
}

function setup(mobile) {
  const sidebar = el('sidebar');
  const pinned = el('mobilePinnedResources');
  const panes = ['resourcesCard','logCard','devCard','rightSidebarResourcesDock'].map(name => el(name));
  for (const p of panes) sidebar.insertBefore(p, null);
  if (mobile) pinned.insertBefore(panes[3], null);
  const handles = [];
  let schedules=0;
  const ctx = {
    ui:{rightSidebarInner:sidebar},
    sidebarPanes:()=>panes,
    isMobileGameSplit:()=>mobile,
    sidebarSectionHandles:handles,
    scheduleLogDevSplit:()=>{ schedules++; },
    logDevSplitter:null,
    logDevResizeObserver:null,
    isDesktopLogDevSplitActive:()=>!mobile,
    setSidebarCut(){},
    logDevAvailableHeight:()=>900,
    sidebarCuts:[.2,.57,.79],
    document:{createElement:()=>el('divider')},
  };
  const fn = new Function('ctx', `const {ui, sidebarPanes, isMobileGameSplit, sidebarSectionHandles, scheduleLogDevSplit, isDesktopLogDevSplitActive, setSidebarCut, logDevAvailableHeight, sidebarCuts, document} = ctx; let logDevSplitter = null; let logDevResizeObserver = null; ${sourceOf('ensureLogDevSplitter')} return ensureLogDevSplitter;`)(ctx);
  return {fn,sidebar,pinned,panes,handles,get schedules(){return schedules;}};
}

test('mobile HUD does not throw when bank/hand resource dock is pinned outside desktop sidebar', () => {
  const env = setup(true);
  assert.doesNotThrow(() => env.fn());
  assert.equal(env.handles.length, 0, 'no desktop splitter should be created on mobile');
  assert.equal(env.panes[3].parentNode, env.pinned, 'bank resource dock remains visible in mobile strip');
  assert.equal(env.schedules, 1);
});

test('desktop sidebar still adds all three sliders between the original four panes', () => {
  const env = setup(false);
  assert.doesNotThrow(() => env.fn());
  assert.equal(env.handles.length, 3);
  assert.deepEqual(env.sidebar.children.map(n => n.id), [
    'resourcesCard','sidebarResourcesLogSplitter','logCard','sidebarLogDevSplitter','devCard','sidebarDevBankSplitter','rightSidebarResourcesDock'
  ]);
});

test('switching layouts removes desktop sliders rather than using a moved mobile reference node', () => {
  const env = setup(false);
  env.fn();
  const mobilePinned = el('mobilePinnedResources');
  mobilePinned.insertBefore(env.panes[3], null);
  // The same scenario as rotating a touch device or resizing across the breakpoint.
  assert.doesNotThrow(() => env.fn());
  assert.equal(env.handles.filter(h => h.parentNode === env.sidebar).length, 0);
});

test('mobile HUD controls, resources and click targets are preserved', () => {
  for (const id of ['rollDockBtn','endDockBtn','backTurnBtn','pauseBtn','playBtn',
    'resourcesBox','rightSidebarResourcesBody','mobilePinnedResources']) {
    assert.match(html, new RegExp(`id="${id}"`), `missing ${id}`);
  }
  assert.match(client, /mobilePinnedResources\.appendChild\(anchor\)/);
  assert.match(client, /renderResources\(\);/);
  assert.match(client, /ui\.rollDock\.classList\.toggle\('hidden', !inGame\)/);
});
