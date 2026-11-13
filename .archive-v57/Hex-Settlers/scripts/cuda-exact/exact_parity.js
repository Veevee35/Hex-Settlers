#!/usr/bin/env node
'use strict';
/**
 * Execute the authoritative JS server.js distributeResources() body, then the
 * independently ported native CPU/CUDA production transition on matching
 * randomized game states. Exact deterministic outcomes must match for all
 * bank, hand, gains, robber-blocked production and queued gold fields.
 *
 * CUDA is never reported as rules-exact beyond the tested operation. No whole
 * match or model is trained by this parity utility.
 *
 * node scripts/cuda-exact/exact_parity.js --backend cpu
 * node scripts/cuda-exact/exact_parity.js --backend cuda
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '../..');
const KINDS = ['brick', 'lumber', 'wool', 'grain', 'ore', 'gold', 'sea'];
const TILE_TYPES = ['hills', 'forest', 'pasture', 'field', 'mountains', 'gold_fields', 'sea'];
const PLAYER_COUNT = 8, MAX_TILES = 256, TILE_INTS = 17;
const GAME_INTS = 3 + 10 + 4 + 5 + (PLAYER_COUNT * 5) + PLAYER_COUNT + (PLAYER_COUNT * 5) + (PLAYER_COUNT * 6) + PLAYER_COUNT + PLAYER_COUNT + (PLAYER_COUNT * MAX_TILES) + (MAX_TILES * TILE_INTS);
const GAME_BYTES = GAME_INTS * 4;
function snippet(source, start, next) {
  const a = source.indexOf(start), b = source.indexOf(next, a);
  assert.ok(a >= 0 && b > a, `Cannot isolate server block ${start}`);
  return source.slice(a, b);
}
function referenceProduction() {
  const src = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  const defs = snippet(src, 'function bankMaxForGame(game)', 'function randomGoldChoicesFromBank(') + '\n' +
    snippet(src, 'function distributeResources(game, roll)', 'function grantStartingResourcesForSecondSettlement(game, nodeId, ownerId)');
  const summary = require('../../server/resource-summary');
  const rules = require('../../server/game-rules');
  const sandbox = {
    RESOURCE_KINDS: KINDS.slice(0, 5),
    bankMaxForRules: rules.bankMaxForRules,
    resourceKindForTileType: summary.resourceKindForTileType,
    blockedProductionByPlayer: summary.blockedProductionByPlayer,
    recordBlockedProduction(game, pid, losses) {
      for (const k of KINDS.slice(0, 6)) game._blocked[pid][k] += Number(losses[k] || 0);
    },
    playerById(game, pid) { return game.players.find(p => p.id === pid) || null; },
    grantStats(_game, _pid, res, kind, n) { res[kind] = (res[kind] || 0) + n; },
  };
  vm.createContext(sandbox);
  vm.runInContext(defs, sandbox, { filename: 'server.js/exact-authoritative-excerpt.js' });
  return sandbox.distributeResources;
}
class Rng {
  constructor(seed) { this.seed = seed >>> 0; }
  int(limit) { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed % limit; }
}
function createGame(rng, index) {
  const players = Array.from({ length: 4 + index % 5 }, (_, i) => ({
    id: `player-${i}`, departed: rng.int(43) === 0,
    resources: Object.fromEntries(KINDS.slice(0, 5).map(k => [k, rng.int(16)])),
  }));
  const tiles = [], nodes = [];
  const count = [0, 1, 12, 42, 85, 130, 221][index % 7];
  for (let i = 0; i < count; i++) {
    const cornerNodeIds = [];
    for (let c = 0, n = rng.int(7); c < n; c++) {
      const player = rng.int(players.length + 3);
      const building = player < players.length ? { owner: players[player].id, type: rng.int(3) === 0 ? 'city' : 'settlement' } : null;
      nodes.push({ building }); cornerNodeIds.push(nodes.length - 1);
    }
    tiles.push({ id:i, number:2 + rng.int(11), type:TILE_TYPES[rng.int(7)], robber:rng.int(9) === 0, cornerNodeIds });
  }
  const bankMax = [19, 24, 30][index % 3];
  const actor = rng.int(players.length);
  const giveKind = rng.int(5), takeKind = (giveKind + 1 + rng.int(4)) % 5;
  const ratio = 2 + rng.int(3), tradeQty = 1 + rng.int(3);
  return {
    players, geom:{ tiles, nodes }, rules:{ baseResourcesPerType:bankMax },
    bank:Object.fromEntries(KINDS.slice(0, 5).map(k => [k, rng.int(bankMax + 1)])),
    roll: 2 + rng.int(11),
    op: index % 2, actor, trade: { giveKind, takeKind, ratio, tradeQty }, _blocked: Object.fromEntries(players.map(p => [p.id, Object.fromEntries(KINDS.slice(0, 6).map(k => [k, 0]))])),
  };
}
function encodeGame(game) {
  const bytes = Buffer.alloc(GAME_BYTES);
  let off = 0;
  const put = value => { bytes.writeInt32LE(value, off); off += 4; };
  const pIndex = new Map(game.players.map((p, i) => [p.id, i]));
  put(game.players.length); put(game.geom.tiles.length); put(game.roll); put(game.rules.baseResourcesPerType);
  for (const k of KINDS.slice(0, 5)) put(game.bank[k]);
  for (let p = 0; p < PLAYER_COUNT; p++) for (const k of KINDS.slice(0, 5)) put(game.players[p]?.resources?.[k] || 0);
  for (let p = 0; p < PLAYER_COUNT; p++) put(game.players[p]?.departed ? 1 : 0);
  // zero-initialized output buffers; native kernel writes per-game results.
  off += PLAYER_COUNT * 5 * 4;  // gains
  off += PLAYER_COUNT * 6 * 4;  // blocked
  off += PLAYER_COUNT * 4;      // gold amount
  off += PLAYER_COUNT * 4;      // gold tile count
  off += PLAYER_COUNT * MAX_TILES * 4;
  for (let i = 0; i < MAX_TILES; i++) {
    const t = game.geom.tiles[i];
    if (!t) { off += TILE_INTS * 4; continue; }
    put(t.id); put(t.number); put(KINDS.indexOf(require('../../server/resource-summary').resourceKindForTileType(t.type)));
    put(t.robber ? 1 : 0); put(t.cornerNodeIds.length);
    for (let c = 0; c < 6; c++) {
      const building = game.geom.nodes[t.cornerNodeIds[c]]?.building;
      put(building ? pIndex.get(building.owner) ?? -1 : -1);
    }
    for (let c = 0; c < 6; c++) {
      const building = game.geom.nodes[t.cornerNodeIds[c]]?.building;
      put(building?.type === 'city' ? 1 : 0);
    }
  }
  put(game.op);
  put(game.actor);
  put(0); // output trade_ok
  const give = Array(5).fill(0), take = Array(5).fill(0);
  give[game.trade.giveKind] = game.trade.ratio * game.trade.tradeQty;
  take[game.trade.takeKind] = game.trade.tradeQty;
  give.forEach(put); take.forEach(put);
  assert.equal(off, GAME_BYTES);
  return bytes;
}
function readResult(bytes, original) {
  let off = 0;
  const get = () => { const out = bytes.readInt32LE(off); off += 4; return out; };
  const pc=get(), tc=get(), roll=get(), bankMax=get();
  assert.equal(pc, original.players.length); assert.equal(tc, original.geom.tiles.length);
  assert.equal(roll, original.roll); assert.equal(bankMax, original.rules.baseResourcesPerType);
  const bank = Object.fromEntries(KINDS.slice(0,5).map(k => [k,get()]));
  const hands = [];
  for (let p=0;p<PLAYER_COUNT;p++) hands.push(Object.fromEntries(KINDS.slice(0,5).map(k=>[k,get()])));
  for(let p=0;p<PLAYER_COUNT;p++) get();
  const gains = [];
  for(let p=0;p<PLAYER_COUNT;p++) gains.push(Object.fromEntries(KINDS.slice(0,5).map(k=>[k,get()])));
  const blocked = [];
  for(let p=0;p<PLAYER_COUNT;p++) blocked.push(Object.fromEntries(KINDS.slice(0,6).map(k=>[k,get()])));
  const goldAmount=Array.from({length:PLAYER_COUNT},()=>get());
  const goldTileCount=Array.from({length:PLAYER_COUNT},()=>get());
  const goldTiles=[];
  for(let p=0;p<PLAYER_COUNT;p++) {
    const ids=Array.from({length:MAX_TILES},()=>get());
    goldTiles.push(ids.slice(0,goldTileCount[p]));
  }
  off += MAX_TILES*TILE_INTS*4;
  const op=get(),actor=get(),tradeOk=get();
  const give=Array.from({length:5},()=>get()),take=Array.from({length:5},()=>get());
  return {bank,hands,gains,blocked,goldAmount,goldTiles,op,actor,tradeOk,give,take};
}
function checkParity(original, actual, production, applyTrade) {
  const game = structuredClone(original);
  if (game.op === 1) {
    const ok=applyTrade(game);
    assert.equal(actual.tradeOk, ok ? 1 : 0, 'bank trade accepted/rejected mismatch');
    assert.deepEqual(actual.bank,game.bank,'bank after trade mismatch');
    for(let p=0;p<game.players.length;p++) assert.deepEqual(actual.hands[p],game.players[p].resources,`hand after trade mismatch ${p}`);
    return;
  }
  const gains = production(game, game.roll);
  assert.deepEqual(actual.bank,game.bank,'bank mismatch');
  for(let p=0;p<game.players.length;p++) {
    const id=game.players[p].id;
    assert.deepEqual(actual.hands[p],game.players[p].resources,`hand mismatch ${id}`);
    assert.deepEqual(actual.gains[p],JSON.parse(JSON.stringify(gains[id] || Object.fromEntries(KINDS.slice(0,5).map(k=>[k,0])))),`gains mismatch ${id}`);
    assert.deepEqual(actual.blocked[p],game._blocked[id],`robber blocked mismatch ${id}`);
    const item=game.special?.queue?.find(entry=>entry.playerId===id);
    assert.equal(actual.goldAmount[p],item?.amount || 0,`gold pending mismatch ${id}`);
    assert.deepEqual(actual.goldTiles[p],JSON.parse(JSON.stringify(item?.tileIds || [])),`gold tile order mismatch ${id}`);
  }
}
function referenceBankTrade() {
  const src=fs.readFileSync(path.join(ROOT,'server.js'),'utf8');
  const begin=src.indexOf('// Apply the validated basket atomically.');
  const end=src.indexOf('const spentDelta =',begin);
  assert.ok(begin>=0 && end>begin,'Cannot extract authoritative bank_trade mutation');
  const mutation=src.slice(begin,end);
  const bank=referenceBankFunctions();
  const {normalizeBankTradeAction,validateBankTradeAvailability}=require('../../server/bank-trade');
  return game => {
    const p=game.players[game.actor],planDef=game.trade;
    if(p.departed) return false;
    const giveKind=KINDS[planDef.giveKind],takeKind=KINDS[planDef.takeKind];
    const normalized=normalizeBankTradeAction({giveKind,takeKind,takeQty:planDef.tradeQty},
      {resourceKinds:KINDS.slice(0,5),ratioFor:()=>planDef.ratio});
    if(!normalized.ok) throw new Error(`Invalid test plan: ${normalized.error}`);
    bank.ensureBank(game);
    const available=validateBankTradeAvailability(normalized.plan,p.resources,game.bank,KINDS.slice(0,5));
    if (!available.ok)return false;
    const func=new Function('game','p','plan','playerId','RESOURCE_KINDS','bankReceive','bankGive','grantStats',mutation);
    func(game,p,normalized.plan,p.id,KINDS.slice(0,5),bank.bankReceive,bank.bankGive,(unusedGame,unusedId,res,kind,n)=>{res[kind]=(res[kind]||0)+n;});
    return true;
  };
}
function referenceBankFunctions() {
  const src=fs.readFileSync(path.join(ROOT,'server.js'),'utf8');
  const defs=snippet(src,'function bankMaxForGame(game)','function randomGoldChoicesFromBank(');
  const sandbox={bankMaxForRules:require('../../server/game-rules').bankMaxForRules,
    RESOURCE_KINDS:KINDS.slice(0,5),grantStats(_game,_pid,res,kind,n){res[kind]=(res[kind]||0)+n;}};
  vm.createContext(sandbox);vm.runInContext(defs,sandbox);
  return sandbox;
}
function parity(opts = {}) {
  const backend = opts.backend || 'cpu';
  const count=Number(opts.count || 120);
  if (!Number.isSafeInteger(count) || count < 1 || count > 10000) throw new Error('invalid count');
  if (!['cuda','cpu'].includes(backend)) throw new Error('Backend must be cpu or cuda');
  let executable = opts.executable || path.join(__dirname,backend === 'cuda' ? (process.platform === 'win32' ? 'hex_exact_cuda.exe' : 'hex_exact_cuda') : (process.platform === 'win32' ? 'hex_exact_cpu.exe' : 'hex_exact_cpu'));
  if (!fs.existsSync(executable) && backend === 'cpu' && process.platform !== 'win32') {
    const cc = cp.spawnSync('g++',['-O2','-std=c++17','-o',executable,path.join(__dirname,'hex_exact_cpu.cpp')], {encoding:'utf8',timeout:120000});
    if(cc.status!==0) throw new Error(`CPU compiler failed: ${cc.stderr || cc.error?.message}`);
  }
  if (!fs.existsSync(executable)) throw new Error(`Missing ${backend} kernel: ${executable}. Build the ${backend} executable first.`);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'hex-exact-parity-'));
  try {
    const input=path.join(temp,'input.bin'),output=path.join(temp,'output.bin');
    const rng=new Rng(0x739f10c5), games=[];
    for(let i=0;i<count;i++) games.push(createGame(rng,i));
    const h=Buffer.alloc(16); h.writeUInt32LE(0x58454847,0);h.writeUInt32LE(1,4);h.writeUInt32LE(count,8);h.writeUInt32LE(GAME_BYTES,12);
    fs.writeFileSync(input, Buffer.concat([h,...games.map(encodeGame)]));
    const r=cp.spawnSync(executable,[input,output],{encoding:'utf8',timeout:120000,maxBuffer:1024*1024});
    if (r.status!==0) throw new Error(`${backend} kernel exited: ${r.stderr || r.error?.message || r.status}`);
    const bytes=fs.readFileSync(output);
    assert.equal(bytes.length,16+count*GAME_BYTES, 'native output file length mismatch');
    const production=referenceProduction(), applyTrade=referenceBankTrade();
    for(let i=0;i<count;i++) {
      const actual=readResult(bytes.subarray(16+i*GAME_BYTES,16+(i+1)*GAME_BYTES),games[i]);
      try {checkParity(games[i],actual,production,applyTrade);} catch(e) { throw new Error(`Case ${i}, ${games[i].players.length} players, ${games[i].geom.tiles.length} tiles, roll ${games[i].roll}: ${e.message}`);}
    }
    return { backend, cases: count, verified:'authoritative production and normalized bank-trade mutation subsets only', output:r.stdout.trim() };
  } finally {fs.rmSync(temp,{recursive:true,force:true});}
}
if(require.main===module) {
  try {
    const args=process.argv.slice(2);
    const key=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:null;};
    const result=parity({backend:key('--backend')||'cpu',count:key('--count')||120,executable:key('--executable')||undefined});
    console.log(`[exact-parity] PASS ${result.cases} randomized ${result.backend} comparisons against server.js production and bank_trade`);
    console.log(`[exact-parity] Coverage: ${result.verified}. No whole-game parity claim.`);
  } catch(e) {console.error(`[exact-parity] FAIL: ${e.stack || e}`);process.exitCode=1;}
}
module.exports={parity,encodeGame,createGame,referenceProduction};
