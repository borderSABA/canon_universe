(() => {
"use strict";

/*
  宇宙開拓 2019ルール完全同一化 v2.12
  - 公式画像・ロゴ・カード原文は不使用
  - ルール処理とカード効果は2019年版 Starfarers Rulebook / Almanac を参照
*/

const VERSION = "3.2.11";
const SAVE_KEY = "starfarers_private_exact_v21";
const R = ["ore","fuel","carbon","food","goods"];
const RL = {ore:"鉱石",fuel:"燃料",carbon:"炭素",food:"食料",goods:"交易品"};
const RI = {ore:"⛓",fuel:"🔥",carbon:"💠",food:"🌿",goods:"📦"};
const PCOL = ["#ffd34e","#ff5f68","#f0f0f0","#4ca9ff"]; // 初心者配置の色順：黄・赤・白・青
const BALLS = [
  {c:"黒",v:0,black:true,emoji:"⚫"},
  {c:"青",v:1,emoji:"🔵"},
  {c:"黄",v:2,emoji:"🟡"},
  {c:"黄",v:2,emoji:"🟡"},
  {c:"赤",v:3,emoji:"🔴"}
];

const BUILD = {
  tradeShip:{name:"交易船",cost:{ore:1,fuel:1,goods:2}},
  colonyShip:{name:"植民船",cost:{ore:1,fuel:1,carbon:1,food:1}},
  spaceport:{name:"宇宙港",cost:{carbon:3,food:2}},
  freight:{name:"貨物ポッド",cost:{ore:2}},
  cannon:{name:"大砲",cost:{carbon:2}},
  booster:{name:"動力",cost:{fuel:2}}
};

const OUTPOSTS = {
  green:{name:"緑の民",icon:"🌱"},
  diplomats:{name:"外交官",icon:"🤝"},
  merchants:{name:"商人",icon:"💱"},
  scientists:{name:"科学者",icon:"🔬"}
};

/* 効果名と説明は原文をコピーせず、日本語で要約 */
const FRIENDSHIP_CARDS = {
  diplomats:[
    {id:"dip_tribute",name:"貢納軽減",desc:"7のとき、手札が12枚を超える場合だけ半分を返す。",kind:"reducedTribute"},
    {id:"dip_fame1",name:"名声購入 A",desc:"交易・建設中、交易品1枚で名声片1個を買える。1ターン1回。",kind:"fameSale"},
    {id:"dip_fame2",name:"名声購入 B",desc:"交易・建設中、交易品1枚で名声片1個を買える。1ターン1回。",kind:"fameSale"},
    {id:"dip_help",name:"援助要請",desc:"自分よりVPが高い相手が2人以上なら、そのうち2人から資源を1枚ずつ得る。1ターン1回。",kind:"helpingHand"},
    {id:"dip_relief",name:"銀河救済基金",desc:"7以外の生産で惑星から1枚も得られなかったら、好きな資源1枚を得る。",kind:"relief"}
  ],
  merchants:[
    {id:"mer_ore",name:"鉱石 2:1",desc:"鉱石2枚を別資源1枚へ交換できる。",kind:"trade2",resource:"ore"},
    {id:"mer_fuel",name:"燃料 2:1",desc:"燃料2枚を別資源1枚へ交換できる。",kind:"trade2",resource:"fuel"},
    {id:"mer_carbon",name:"炭素 2:1",desc:"炭素2枚を別資源1枚へ交換できる。",kind:"trade2",resource:"carbon"},
    {id:"mer_food",name:"食料 2:1",desc:"食料2枚を別資源1枚へ交換できる。",kind:"trade2",resource:"food"},
    {id:"mer_goods",name:"交易品 1:1",desc:"交易品1枚を別資源1枚へ交換できる。1ターン1回。",kind:"goods1"}
  ],
  green:[
    {id:"gr_ore",name:"鉱石生産 +1",desc:"生産ダイスで鉱石を1枚以上得たとき、さらに鉱石1枚。",kind:"prod",resource:"ore"},
    {id:"gr_fuel",name:"燃料生産 +1",desc:"生産ダイスで燃料を1枚以上得たとき、さらに燃料1枚。",kind:"prod",resource:"fuel"},
    {id:"gr_carbon",name:"炭素生産 +1",desc:"生産ダイスで炭素を1枚以上得たとき、さらに炭素1枚。",kind:"prod",resource:"carbon"},
    {id:"gr_food",name:"食料生産 +1",desc:"生産ダイスで食料を1枚以上得たとき、さらに食料1枚。",kind:"prod",resource:"food"},
    {id:"gr_goods",name:"交易品生産 +1",desc:"生産ダイスで交易品を1枚以上得たとき、さらに交易品1枚。",kind:"prod",resource:"goods"}
  ],
  scientists:[
    {id:"sci_cannon2",name:"改良大砲 +2",desc:"全船の戦闘力に+2。物理パーツではない。",kind:"combat",value:2},
    {id:"sci_boost2",name:"改良動力 +2",desc:"全船の速度に+2。物理パーツではない。",kind:"speed",value:2},
    {id:"sci_mix1",name:"複合改良 I",desc:"全船の速度と戦闘力に各+1。",kind:"mix",value:1},
    {id:"sci_mix2",name:"複合改良 II",desc:"全船の速度と戦闘力に各+1。",kind:"mix",value:1},
    {id:"sci_mix3",name:"複合改良 III",desc:"全船の速度と戦闘力に各+1。",kind:"mix",value:1}
  ]
};

/*
  32枚を番号付きで別カードとして保持。
  実際のカード本文は表示せず、処理用の種類・相手位置・報酬差分だけ保持する。
*/
const ENCOUNTERS = [
  {n:1,type:"merchantGift",variant:1},{n:2,type:"merchantGift",variant:2},{n:3,type:"merchantGift",variant:3},{n:4,type:"merchantGift",variant:4},
  {n:5,type:"merchantGift",variant:5},{n:6,type:"merchantGift",variant:6},{n:7,type:"merchantPirate",opponent:"right"},{n:8,type:"merchantPirate",opponent:"left"},
  {n:9,type:"pirateDemand",opponent:"right",win:"freeTrade",lose:"loseUpgradeFame"},
  {n:10,type:"pirateDemand",opponent:"secondRight",win:"carbon2fame",lose:"stopFame",payFame:-1},
  {n:11,type:"pirateDemand",opponent:"left",win:"ore2fame",lose:"upgrade",payStop:true},
  {n:12,type:"shadyTrade",variant:1,decline:"fame"},{n:13,type:"shadyTrade",variant:2,decline:"none"},
  {n:14,type:"pirateRobbery",variant:1,decline:"fame"},{n:15,type:"pirateRobbery",variant:2,decline:"none"},
  {n:16,type:"pirateEscape",opponent:"right",win:"freeUpgradeFame",lose:"upgrade",flee:"none"},
  {n:17,type:"pirateEscape",opponent:"secondLeft",win:"ore2fame",lose:"loseUpgradeFame",flee:"fameMinus"},
  {n:18,type:"pirateEscape",opponent:"left",win:"freeTrade",lose:"stop",flee:"none"},
  {n:19,type:"distressSpeed",opponent:"secondRight",decline:"none",win:"freeTrade",lose:"upgrade"},
  {n:20,type:"distressSpeed",opponent:"left",decline:"fameMinus",win:"stealAllFame",lose:"loseUpgradeFame"},
  {n:21,type:"distressSpeed",opponent:"right",decline:"fameMinus",win:"freeUpgradeFame",lose:"upgrade"},
  {n:22,type:"rescueCombat",opponent:"secondRight",decline:"none",win:"goods2fame",lose:"stop"},
  {n:23,type:"rescueCombat",opponent:"right",decline:"fameMinus",win:"choice2fame",lose:"loseUpgradeFame"},
  {n:24,type:"rescueCombat",opponent:"left",decline:"fameMinus",win:"jumpFame",lose:"stopFame"},
  {n:25,type:"wormhole",opponent:"left",fail:"stop",success:"jump"},
  {n:26,type:"wormhole",opponent:"right",fail:"stop",success:"jump"},
  {n:27,type:"wormhole",opponent:"secondRight",fail:"upgrade",success:"jump"},
  {n:28,type:"travelerGift",variant:1},{n:29,type:"travelerGift",variant:2},{n:30,type:"travelerGift",variant:3},
  {n:31,type:"wear",threshold:8,nextEncounter:true},{n:32,type:"wearCouncil",threshold:6,nextEncounter:true}
];

const RESERVE_NUMBERS = [3,9,10,11,11];

// 2019年版の未探索数字ディスク。各惑星の裏面記号と同じプールから1枚ずつ配置する。
const TOKEN_POOLS_TEMPLATE = {
  T1:[3,4,4,11,12],
  S1:[2,5,5,6,9],
  H1:[10,10,{special:"pirate",need:4},{special:"pirate",need:5},{special:"ice",need:3}],
  T2:[3,4,11],
  S2:[5,8,9],
  H2:[{special:"pirate",need:6},10,{special:"ice",need:4}]
};

// 8枚の惑星系セクターに印刷されている資源と数字ディスク記号。
// T/S/H = 三角/四角/六角、1/2 = 1スター/2スター側のディスク群。
const SYSTEM_TEMPLATES = [
  [["carbon","S1"],["food","T1"],["fuel","H1"]],
  [["carbon","T1"],["ore","H1"],["goods","S1"]],
  [["fuel","S1"],["ore","T1"],["goods","H1"]],
  [["fuel","T1"],["food","H1"],["ore","S1"]],
  [["food","S1"],["carbon","H1"],["goods","T1"]],
  [["carbon","S2"],["fuel","T2"],["goods","H2"]],
  [["goods","T2"],["food","S2"],["ore","H2"]],
  [["ore","H2"],["carbon","T2"],["goods","S2"]]
];

// 初心者用カタン居住圏 α・β・γ・δ の印刷済み資源/数字。
const HOME_PRESETS = [
  [["food",11],["fuel",4],["carbon",8]],
  [["fuel",10],["ore",8],["goods",[3,12]]],
  [["ore",5],["carbon",6],["food",3]],
  [["goods",[2,11]],["ore",9],["fuel",6]]
];

// 実物ボード上の15セクタースロット。座標は公式盤面の交点格子を再構成したもの。
// Near 8 / Far 7。セクターの絵は使わず、接続関係だけ同一にしている。
const SECTOR_SLOTS = [
  {id:"s0",k:3,j:8,zone:"near"},{id:"s1",k:7,j:8,zone:"near"},{id:"s2",k:2,j:13,zone:"near"},{id:"s3",k:6,j:13,zone:"near"},
  {id:"s4",k:3,j:19,zone:"near"},{id:"s5",k:8,j:16,zone:"near"},{id:"s6",k:11,j:4,zone:"near"},{id:"s7",k:12,j:10,zone:"near"},
  {id:"s8",k:13,j:14,zone:"far"},{id:"s9",k:16,j:2,zone:"far"},{id:"s10",k:16,j:6,zone:"far"},{id:"s11",k:21,j:5,zone:"far"},
  {id:"s12",k:17,j:10,zone:"far"},{id:"s13",k:21,j:-1,zone:"far"},{id:"s14",k:21,j:10,zone:"far"}
];
const HOME_CENTERS = [
  {id:"home0",k:-5,j:11},{id:"home1",k:-5,j:15},{id:"home2",k:-5,j:20},{id:"home3",k:-5,j:24}
];
const SECTOR_PIECES = [
  ...[0,1,2,3,4].map(i=>({content:`system:${i}`,star:1})),
  ...[5,6,7].map(i=>({content:`system:${i}`,star:2})),
  {content:"outpost:merchants",star:1},{content:"outpost:green",star:1},
  {content:"outpost:diplomats",star:2},{content:"outpost:scientists",star:2},
  {content:"empty:1a",star:1},{content:"empty:1b",star:1},{content:"empty:2a",star:2},{content:"empty:2b",star:2}
];
// 公式初心者配置の15セクター。空セクター4枚中1枚は箱へ戻る。
const BEGINNER_CONTENT_BY_SLOT = {
  s0:"system:1",s1:"system:2",s2:"system:0",s3:"empty:1a",s4:"system:4",
  s5:"outpost:merchants",s6:"outpost:green",s7:"empty:1b",s8:"system:3",s9:"empty:2a",
  s10:"system:6",s11:"system:5",s12:"system:7",s13:"outpost:diplomats",s14:"outpost:scientists"
};
const HOME_RESOURCES = [
  ["food","fuel","carbon"],["fuel","ore","goods"],["ore","carbon","food"],["goods","ore","fuel"]
];
const HOME_NUMBER_POOLS = [
  [11,4,8],[10,8,[3,12]],[5,6,3],[[2,11],9,6]
];

const $ = id => document.getElementById(id);
const clone = o => JSON.parse(JSON.stringify(o));
const rnd = a => a[Math.floor(Math.random()*a.length)];
const shuffle = a => {a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const blankRes = () => ({ore:0,fuel:0,carbon:0,food:0,goods:0});
const wait = ms => new Promise(r=>setTimeout(r,ms));

const DIE_CELLS = {
  1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]
};
function setDieFace(el,n){if(el)el.dataset.face=String(n)}
async function showDiceAnimation(d1,d2,actor="あなた"){
  if(window.NET?.online&&!window.NET.playingNetEvent)window.NET.broadcastEvent({kind:"dice",d1,d2,actor});
  const dock=$("diceDock"),a=$("dieA"),b=$("dieB"),total=$("diceTotal"),who=$("diceActor");
  if(!dock||!a||!b||!total||!who)return;
  who.textContent=`${actor} のダイスロール`;
  total.textContent="…";dock.classList.add("rolling");
  const started=Date.now();
  while(Date.now()-started<720){
    setDieFace(a,1+Math.floor(Math.random()*6));setDieFace(b,1+Math.floor(Math.random()*6));
    a.style.transform=`rotate(${Math.floor(Math.random()*35)-17}deg)`;
    b.style.transform=`rotate(${Math.floor(Math.random()*35)-17}deg)`;
    await wait(80);
  }
  a.style.transform="rotate(0deg)";b.style.transform="rotate(0deg)";
  setDieFace(a,d1);setDieFace(b,d2);total.textContent=`合計 ${d1+d2}`;
  dock.classList.remove("rolling");dock.classList.add("settled");
  await wait(450);dock.classList.remove("settled");
}

function motherBallClass(ball){
  if(!ball)return "neutral";
  return ball.black?"black":ball.c==="黄"?"yellow":ball.c==="赤"?"red":ball.c==="青"?"blue":"neutral";
}
function setMotherBall(el,ball){
  if(!el)return;
  el.className=`mother-ball ${motherBallClass(ball)}`;
  const span=el.querySelector("span");
  if(span)span.textContent=!ball?"?":ball.black?"!":String(ball.v);
}
function renderMothershipRollStatus(){
  const a=$("motherBallA"),b=$("motherBallB"),total=$("mothershipTotal"),who=$("mothershipActor");
  if(!a||!b||!total||!who)return;
  if(Array.isArray(S.balls)&&S.balls.length===2){
    setMotherBall(a,S.balls[0]);setMotherBall(b,S.balls[1]);
    const black=S.balls.some(x=>x.black),base=black?3:S.balls.reduce((n,x)=>n+x.v,0);
    who.textContent=`${S.lastMothershipActor||"直前"} のマザーシップ`;
    total.textContent=S.speed!==null&&S.speed!==undefined?`速度 ${S.speed}`:(S.lastMothershipSpeed!==undefined&&S.lastMothershipSpeed!==null?`速度 ${S.lastMothershipSpeed}`:`基本 ${base}`);
  }else{
    setMotherBall(a,null);setMotherBall(b,null);who.textContent="マザーシップ";total.textContent="--";
  }
}
async function showMothershipAnimation(finalBalls,actor="あなた",totalSpeed=null){
  if(window.NET?.online&&!window.NET.playingNetEvent)window.NET.broadcastEvent({kind:"mothership",balls:clone(finalBalls),actor,totalSpeed});
  const dock=$("mothershipDock"),a=$("motherBallA"),b=$("motherBallB"),total=$("mothershipTotal"),who=$("mothershipActor");
  if(!dock||!a||!b||!total||!who)return;
  who.textContent=`${actor} のマザーシップ`;total.textContent="…";dock.classList.add("rolling");
  const started=Date.now();
  while(Date.now()-started<860){const sample=shuffle(BALLS).slice(0,2);setMotherBall(a,sample[0]);setMotherBall(b,sample[1]);await wait(86)}
  setMotherBall(a,finalBalls[0]);setMotherBall(b,finalBalls[1]);
  const black=finalBalls.some(x=>x.black),base=black?3:finalBalls.reduce((n,x)=>n+x.v,0);
  total.textContent=totalSpeed!==null?`速度 ${totalSpeed}`:`基本 ${base}`;
  dock.classList.remove("rolling");dock.classList.add("settled");await wait(500);dock.classList.remove("settled");
}
async function showEncounterPop(){
  if(window.NET?.online&&!window.NET.playingNetEvent)window.NET.broadcastEvent({kind:"encounter_pop"});
  const el=document.createElement("div");el.className="encounter-pop";el.textContent="遭遇！";document.body.appendChild(el);await wait(1250);el.remove();
}
async function showCenterNotice(text,sub=""){
  if(window.NET?.online&&!window.NET.playingNetEvent)window.NET.broadcastEvent({kind:"center_notice",text,sub});
  const el=document.createElement("div");el.className="center-notice-pop";
  el.innerHTML=`<div class="center-notice-main">${text}</div>${sub?`<div class="center-notice-sub">${sub}</div>`:""}`;
  document.body.appendChild(el);await wait(1500);el.classList.add("hide");await wait(180);el.remove();
}

function chooseBoardNode(title,message,ids,confirmText="ここに置きますか？",style="node"){
  return new Promise(resolve=>{
    ui.boardChoice={title,message,ids:[...ids],confirmText,style,resolve};
    render();
  });
}
async function resolveBoardChoice(id){
  const bc=ui.boardChoice;if(!bc||!bc.ids.includes(id))return;
  const ok=await modalPromise(`<h2>${bc.title}</h2><p>${nodeLabel(id)}</p><p><b>${bc.confirmText}</b></p>`,[
    {label:"はい",value:true,primary:true},{label:"選び直す",value:false}
  ]);
  if(!ok){render();return}
  ui.boardChoice=null;const fn=bc.resolve;render();fn(id);
}
function chooseSetupOption(title,message,options){
  return new Promise(resolve=>{ui.setupOptions={title,message,options:[...options],resolve};render()});
}
function resolveSetupOption(value){const x=ui.setupOptions;if(!x)return;ui.setupOptions=null;const fn=x.resolve;render();fn(value)}
function costChips(cost){
  const items=Object.entries(cost);
  if(!items.length)return '<span class="build-cost-free">無料</span>';
  const shortName={ore:"鉱石",fuel:"燃料",goods:"交易",carbon:"炭素",food:"食料"};
  const rows=[];
  for(let i=0;i<items.length;i+=2){
    rows.push(`<span class="build-cost-row">${items.slice(i,i+2).map(([r,n])=>`<span class="cost-chip cost-${r}"><span class="cost-name">${shortName[r]||RL[r]}</span><b>${n}</b></span>`).join("")}</span>`);
  }
  return rows.join("");
}
function buildPieceIcon(k){
  if(k==="colonyShip")return '<span class="piece-icon piece-triangle"></span>';
  if(k==="tradeShip")return '<span class="piece-icon piece-square"></span>';
  if(k==="spaceport")return '<span class="piece-icon piece-spaceport">◎</span>';
  if(k==="freight")return '<span class="piece-icon piece-tech">▣</span>';
  if(k==="cannon")return '<span class="piece-icon piece-tech">◆</span>';
  return '<span class="piece-icon piece-tech">≫</span>';
}

let S = null;
let B = null;
let ui = {selectedShip:null,jumpMode:false,busy:false,boardChoice:null,setupOptions:null,pinMode:false,pin:null,pinTimer:null};

function log(msg){
  if(!S)return;
  S.logs.unshift({t:new Date().toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"}),msg});
  if(S.logs.length>180)S.logs.length=180;
}
const resourceGainQueue=new Map();
function resourceGainCount(gains){return R.reduce((n,r)=>n+(gains?.[r]||0),0)}
function announceResourceGain(p,gains,source="",visibility="public",visibleTo=null){
  if(!p||!gains)return;
  if(!R.some(r=>(gains[r]||0)>0))return;
  let q=resourceGainQueue.get(p.id);
  if(!q){q={pid:p.id,name:p.name,color:p.color,entries:[],timer:null};resourceGainQueue.set(p.id,q)}
  q.entries.push({gains:clone(gains),source,visibility,visibleTo:visibility==="public"?null:new Set((visibleTo||[p.id]).map(Number))});
  clearTimeout(q.timer);
  q.timer=setTimeout(()=>{
    resourceGainQueue.delete(p.id);
    const makePayload=(viewer)=>{
      const exact=blankRes(),hidden=new Map();
      for(const e of q.entries){
        const canSee=e.visibility==="public"||e.visibleTo?.has(Number(viewer));
        if(canSee){for(const r of R)exact[r]+=(e.gains[r]||0)}
        else{const n=resourceGainCount(e.gains);if(n)hidden.set(e.source||"非公開資源",(hidden.get(e.source||"非公開資源")||0)+n)}
      }
      return {pid:q.pid,name:q.name,color:q.color,items:R.filter(r=>exact[r]>0).map(r=>({r,n:exact[r]})),hidden:[...hidden].map(([label,n])=>({label,n}))};
    };
    if(window.NET?.online&&!window.NET.playingNetEvent){
      const seats=(S?.players||[]).filter(x=>x.human).map(x=>Number(x.id));
      for(const seat of seats){
        const payload=makePayload(seat);if(!payload.items.length&&!payload.hidden.length)continue;
        if(seat===mySeat())showResourceGainOverlay(payload);else window.NET.sendEvent(seat,{kind:"resource_gain",payload});
      }
    }else showResourceGainOverlay(makePayload(mySeat()));
  },120);
}
function showResourceGainOverlay(payload){
  document.querySelectorAll(`.resource-gain-overlay[data-player="${payload.pid}"]`).forEach(e=>e.remove());
  const card=document.querySelector(`[data-player-card="${payload.pid}"]`);
  let left=115,top=110+payload.pid*78,width=225;
  if(card){const rect=card.getBoundingClientRect();left=rect.left+rect.width/2;top=rect.top+rect.height*.52;width=Math.max(215,Math.min(340,rect.width+30))}
  const pop=document.createElement("div");pop.className="resource-gain-overlay";pop.dataset.player=String(payload.pid);
  pop.style.left=`${left}px`;pop.style.top=`${top}px`;pop.style.width=`${width}px`;pop.style.setProperty("--player-color",payload.color||"#7edcff");
  const exact=(payload.items||[]).map(x=>`${RI[x.r]} ${RL[x.r]} +${x.n}`),hidden=(payload.hidden||[]).map(x=>`${x.label} +${x.n}枚`);
  pop.innerHTML=`<span class="resource-gain-name">${payload.name}　入手資源</span><span class="resource-gain-items">${[...exact,...hidden].join("　")}</span>`;
  document.body.appendChild(pop);requestAnimationFrame(()=>pop.classList.add("show"));setTimeout(()=>{pop.classList.remove("show");setTimeout(()=>pop.remove(),220)},2000);
}
function oneGain(r,n=1){const g=blankRes();g[r]=n;return g}
function save(){
  if(!S)return;
  if(window.NET?.online){window.NET.scheduleStateSync(S);return}
  localStorage.setItem(SAVE_KEY,JSON.stringify(S));
}
function load(){try{const x=JSON.parse(localStorage.getItem(SAVE_KEY));if(x&&String(x.version||"").startsWith("2.")){
    x.version=VERSION;
    x.outpostStationOrder=x.outpostStationOrder||{green:[],diplomats:[],merchants:[],scientists:[]};
    for(const key of Object.keys(OUTPOSTS)){
      if(!Array.isArray(x.outpostStationOrder[key]))x.outpostStationOrder[key]=[];
      if(x.outpostStationOrder[key].length===0&&Array.isArray(x.players)){
        for(const pp of x.players)for(let i=0;i<(pp.tradeStations?.[key]||0);i++)x.outpostStationOrder[key].push(pp.id);
      }
    }
    S=x;B=buildBoardFromState();return true
  }}catch(e){}return false}
function showScreen(id){document.querySelectorAll(".screen").forEach(e=>e.classList.remove("active"));$(id).classList.add("active")}
function player(){return S.players[S.turn]}
function mySeat(){return window.NET?.online?window.NET.mySeat():0}
function me(){return S.players[mySeat()]||S.players[0]}
function isLocalPlayer(p){return !!p&&p.id===mySeat()}
function isMyTurn(){return !!S&&S.turn===mySeat()}
async function netCheckpoint(){if(window.NET?.online)await window.NET.flushState(S)}
async function chooseForPlayer(p,payload){
  if(isLocalPlayer(p))return window.SFOnlineAPI.handleChoiceRequest({payload});
  if(window.NET?.online&&p.human)return window.NET.requestChoice(p.id,payload);
  return null;
}
function resTotal(p){return R.reduce((s,r)=>s+(p.res[r]||0),0)}
function hasCard(p,kind){return p.friendship.some(c=>c.kind===kind)}
function cardsOf(p,kind){return p.friendship.filter(c=>c.kind===kind)}
function scientistSpeed(p){return p.friendship.reduce((s,c)=>s+(c.kind==="speed"?c.value:c.kind==="mix"?c.value:0),0)}
function scientistCombat(p){return p.friendship.reduce((s,c)=>s+(c.kind==="combat"?c.value:c.kind==="mix"?c.value:0),0)}
function totalSpeedBonus(p){return p.upgrades.booster+scientistSpeed(p)}
function totalCombatBonus(p){return p.upgrades.cannon+scientistCombat(p)}
function canPay(p,cost){return Object.entries(cost).every(([r,n])=>p.res[r]>=n)}
function costText(cost){return Object.entries(cost).map(([r,n])=>`${RI[r]}${RL[r]}×${n}`).join(" ")}

function mod(a,n){return ((a%n)+n)%n}
const GRID={x0:378.8,cp0:-554.69,dx:45.75,dc:52.85,m:1/Math.sqrt(3)};
function gridXY(k,j){const x=GRID.x0+k*GRID.dx;return {x,y:GRID.m*x+(GRID.cp0+j*GRID.dc)}}
function gridAllowed(k,j){return mod(k-j,3)!==0}
const GRID_DIRS=[[0,1],[0,-1],[1,0],[-1,0],[1,-1],[-1,1]];
function gridId(k,j){return `g_${k}_${j}`}
function centerNeighbors(k,j){
  const c=gridXY(k,j);return GRID_DIRS.map(([dk,dj])=>({k:k+dk,j:j+dj,...gridXY(k+dk,j+dj)}))
    .filter(q=>gridAllowed(q.k,q.j)).sort((a,b)=>Math.atan2(a.y-c.y,a.x-c.x)-Math.atan2(b.y-c.y,b.x-c.x));
}
function removeGraphNode(b,id){
  for(const nx of [...(b.neigh[id]||[])])b.neigh[nx]=(b.neigh[nx]||[]).filter(x=>x!==id);
  b.neigh[id]=[];b.edges=b.edges.filter(([a,c])=>a!==id&&c!==id);if(b.nodes[id])b.nodes[id].blocked=true;
}
function triFaceGeometry(nodes,k,j){
  const c=gridXY(k,j),centerNode=gridId(k,j),L=GRID.dc,cls=mod(k-j,3);
  const angles=cls===1?[-30,90,210]:[-90,30,150];
  const planetCenters=angles.map(a=>({x:c.x+L*Math.cos(a*Math.PI/180),y:c.y+L*Math.sin(a*Math.PI/180),angle:a}));
  const planetVertexNodes=planetCenters.map(fc=>Object.values(nodes).filter(n=>Math.abs(Math.hypot(n.x-fc.x,n.y-fc.y)-L)<1.2).map(n=>n.id));
  const perimeter=[...new Set(planetVertexNodes.flat().filter(id=>id!==centerNode))];
  const spokes=centerNeighbors(k,j).map(q=>gridId(q.k,q.j));
  return {planetCenters,planetVertexNodes,perimeter,spokes};
}
function buildBoardLayout(){
  // 公式盤面の宇宙航路は規則的なハニカム格子。交点位置と接続を同じ格子として再構成する。
  const nodes={},edges=[],seen=new Set(),neigh={};
  for(let k=-8;k<=24;k++)for(let j=-4;j<=30;j++){
    if(!gridAllowed(k,j))continue;const q=gridXY(k,j);
    if(q.x<40||q.x>1455||q.y<55||q.y>850)continue;
    const id=gridId(k,j);nodes[id]={id,k,j,x:q.x,y:q.y,type:"intersection"};neigh[id]=[];
  }
  for(const n of Object.values(nodes))for(const [dk,dj] of GRID_DIRS){
    const id2=gridId(n.k+dk,n.j+dj);if(!nodes[id2])continue;const ek=[n.id,id2].sort().join("|");if(seen.has(ek))continue;seen.add(ek);edges.push([n.id,id2]);neigh[n.id].push(id2);neigh[id2].push(n.id);
  }
  const sectors=SECTOR_SLOTS.map(slot=>{
    const c=gridXY(slot.k,slot.j),centerNode=gridId(slot.k,slot.j),g=triFaceGeometry(nodes,slot.k,slot.j);
    return {...slot,x:c.x,y:c.y,centerNode,verts:g.perimeter,spokes:g.spokes,planetCenters:g.planetCenters,planetVertexNodes:g.planetVertexNodes,content:null,revealed:true};
  });
  const homes=HOME_CENTERS.map((hc,i)=>{
    const c=gridXY(hc.k,hc.j),centerNode=gridId(hc.k,hc.j),g=triFaceGeometry(nodes,hc.k,hc.j),sites=g.spokes;
    const launchBySite=sites.map(id=>(neigh[id]||[]).filter(x=>x!==centerNode));
    return {...hc,x:c.x,y:c.y,centerNode,sites,launchBySite,launch:[...new Set(launchBySite.flat())],planetCenters:g.planetCenters,planetVertexNodes:g.planetVertexNodes,verts:g.perimeter};
  });
  return {nodes,sectors,homes,edges,neigh};
}

function setupSectorContents(mode){
  if(mode==="beginner")return SECTOR_SLOTS.map(slot=>({id:slot.id,content:BEGINNER_CONTENT_BY_SLOT[slot.id],revealed:true,zone:slot.zone}));
  if(mode==="strategic"||mode==="explorer"){
    let one=SECTOR_PIECES.filter(x=>x.star===1).map(clone),two=SECTOR_PIECES.filter(x=>x.star===2).map(clone);
    // 1スターの空セクター1枚を箱へ戻す。
    const rm=one.findIndex(x=>x.content.startsWith("empty:"));one.splice(rm,1);one=shuffle(one);two=shuffle(two);
    return SECTOR_SLOTS.map(slot=>{const piece=(slot.zone==="near"?one:two).pop();return {id:slot.id,content:piece.content,revealed:mode==="strategic",zone:slot.zone}});
  }
  // Wild Space: 16枚全部を混ぜ、15スロットだけを裏向きで埋める。残る1枚は見ない。
  const pieces=shuffle(SECTOR_PIECES.map(clone));
  return SECTOR_SLOTS.map(slot=>({id:slot.id,content:pieces.pop().content,revealed:false,zone:slot.zone}));
}

function buildBoardFromState(){
  const b=buildBoardLayout();
  for(const sec of b.sectors){const st=S.sectorState.find(x=>x.id===sec.id);sec.content=st.content;sec.revealed=st.revealed}
  // 4つのカタン居住圏中心は惑星系の中心なので航路として通れない。
  // 各植民地サイトが実際に接している2惑星も幾何配置から記録する。
  for(const h of b.homes){
    const hi=Number(h.id.slice(4));
    removeGraphNode(b,h.centerNode);
    h.sites.forEach((id,slot)=>{b.nodes[id].homeSite={home:hi,slot};b.nodes[id].type="homeSite"});
    h.planetVertexNodes.forEach((ids,pi)=>ids.filter(id=>id!==h.centerNode&&b.nodes[id]).forEach(id=>{
      b.nodes[id].planetAdj=b.nodes[id].planetAdj||[];
      b.nodes[id].planetAdj.push({system:"home"+hi,planet:pi});
    }));
  }
  for(const sec of b.sectors){
    const hidden=!sec.revealed;
    const raw=sec.content;
    if(hidden){removeGraphNode(b,sec.centerNode);continue}
    if(raw.startsWith("system:")){
      sec.systemId="sys"+raw.split(":")[1];sec.colonySiteNodes=[...sec.spokes];
      removeGraphNode(b,sec.centerNode);
      sec.colonySiteNodes.forEach((id,slot)=>{b.nodes[id].colonySite={system:sec.systemId,slot}});
      // 各惑星の六角形に接する交点（中央の通行不能点を除く）すべてから特殊惑星を攻略できる。
      sec.planetVertexNodes.forEach((ids,pi)=>ids.filter(id=>id!==sec.centerNode&&b.nodes[id]).forEach(id=>{b.nodes[id].planetAdj=b.nodes[id].planetAdj||[];b.nodes[id].planetAdj.push({system:sec.systemId,planet:pi})}));
      // コロニーポイントの左右2惑星を、固定slot番号ではなく実際の幾何隣接から確定する。
      sec.colonySiteNodes.forEach(id=>{
        const n=b.nodes[id];
        if(n?.colonySite)n.colonySite.planets=(n.planetAdj||[]).filter(x=>x.system===sec.systemId).map(x=>x.planet);
      });
    }else if(raw.startsWith("outpost:")){
      sec.outpost=raw.split(":")[1];sec.dockNode=sec.centerNode;b.nodes[sec.centerNode].type="dock";b.nodes[sec.centerNode].outpost=sec.outpost;
    }else if(raw.startsWith("empty")){
      sec.emptyNode=sec.centerNode;b.nodes[sec.centerNode].type="intersection";
    }
  }
  return b;
}

function createSystems(){
  const pools=Object.fromEntries(Object.entries(TOKEN_POOLS_TEMPLATE).map(([k,v])=>[k,shuffle(v.map(clone))]));
  const systems={};
  SYSTEM_TEMPLATES.forEach((tpl,i)=>{
    const planets=tpl.map(([type,icon])=>{
      const tok=clone(pools[icon].pop());
      if(typeof tok==="object"&&!Array.isArray(tok))return {type,icon,token:null,special:{type:tok.special,need:tok.need},cleared:false,revealed:false};
      return {type,icon,token:tok,special:null,cleared:false,revealed:false};
    });
    systems["sys"+i]={id:"sys"+i,name:"惑星系 "+(i+1),revealed:false,colonies:[null,null,null],planets};
  });
  return systems;
}

function createHomes(mode="beginner"){
  const owners=[[2,0,1],[3,2,1],[2,3,0],[3,1,0]];
  return HOME_RESOURCES.map((resources,i)=>{
    const nums=mode==="beginner"?clone(HOME_NUMBER_POOLS[i]):shuffle(clone(HOME_NUMBER_POOLS[i]));
    return {id:"home"+i,name:["α","β","γ","δ"][i],
      planets:resources.map((type,pi)=>({type,token:nums[pi],revealed:true,special:null,cleared:true})),
      colonies:mode==="beginner"?[...owners[i]]:[null,null,null]};
  });
}

function homeSiteNode(home,slot){const h=buildBoardLayout().homes[home];return h.sites[slot]}
function homeLaunchNode(home,slot,index=0){const h=buildBoardLayout().homes[home];return h.launchBySite[slot][index]||h.launchBySite[slot][0]}

const BEGINNER_START = [
  // 黄：αの「燃料4/炭素8」間が宇宙港、γ・δに植民地
  {spaceport:{system:"home0",slot:1,node:homeSiteNode(0,1)},colonies:[{system:"home2",slot:2,node:homeSiteNode(2,2)},{system:"home3",slot:2,node:homeSiteNode(3,2)}],launch:homeLaunchNode(0,1,0)},
  // 赤：βの「交易品3/12/燃料10」間が宇宙港、α・δに植民地
  {spaceport:{system:"home1",slot:2,node:homeSiteNode(1,2)},colonies:[{system:"home0",slot:2,node:homeSiteNode(0,2)},{system:"home3",slot:1,node:homeSiteNode(3,1)}],launch:homeLaunchNode(1,2,0)},
  // 白：γの「鉱石5/炭素6」間が宇宙港、α・βに植民地
  {spaceport:{system:"home2",slot:0,node:homeSiteNode(2,0)},colonies:[{system:"home0",slot:0,node:homeSiteNode(0,0)},{system:"home1",slot:1,node:homeSiteNode(1,1)}],launch:homeLaunchNode(2,0,0)},
  // 青：δの「交易品2/11/鉱石9」間が宇宙港、β・γに植民地
  {spaceport:{system:"home3",slot:0,node:homeSiteNode(3,0)},colonies:[{system:"home1",slot:0,node:homeSiteNode(1,0)},{system:"home2",slot:1,node:homeSiteNode(2,1)}],launch:homeLaunchNode(3,0,0)}
];
function basePlayer(i,name,human){
  return {id:i,name,color:PCOL[i],human,res:blankRes(),vp:0,colonies:[],spaceports:[],ships:[],
    upgrades:{booster:0,cannon:0,freight:0},famePieces:0,permanentMedals:0,friendship:[],tradeStations:{},friendshipMarkers:{},
    stock:{colonies:9,tradeStations:7,transports:3,shipyards:3},pendingFreeTradeShips:0,tradeShipMarkersHeld:0,pendingJump:0,
    turnFlags:{fameSale:false,goods1:false,helpingHand:false},productionReceived:blankRes()};
}
function initialPlayer(i,name,human){
  const p=basePlayer(i,name,human),st=BEGINNER_START[i],all=[clone(st.spaceport),...clone(st.colonies)];
  p.vp=4;p.colonies=all;p.spaceports=[clone(st.spaceport)];p.ships=[{id:`s${i}_0`,type:"colony",node:st.launch,moved:0,stopped:false,startedOnColonySite:false}];
  p.upgrades.booster=1;p.famePieces=1;p.stock={colonies:5,tradeStations:7,transports:2,shipyards:2};return p;
}
function rollStartingPlayer(count){
  while(true){const rolls=Array.from({length:count},()=>1+Math.floor(Math.random()*6)+1+Math.floor(Math.random()*6));const mx=Math.max(...rolls);if(rolls.filter(x=>x===mx).length===1)return {first:rolls.indexOf(mx),rolls}}
}
function newGame(name,count,setupMode){
  count=Number(count);setupMode=setupMode||"beginner";const sectorState=setupSectorContents(setupMode);
  const players=[];for(let i=0;i<count;i++)players.push(setupMode==="beginner"?initialPlayer(i,i===0?(name||"あなた"):`CPU ${i}`,i===0):basePlayer(i,i===0?(name||"あなた"):`CPU ${i}`,i===0));
  const starting=rollStartingPlayer(count);const supply={};R.forEach(r=>supply[r]=12);const reserve=[];for(const r of R)for(let i=0;i<8;i++)reserve.push(r);
  S={version:VERSION,count,setupMode,players,systems:createSystems(),homes:createHomes(setupMode),sectorState,
     supply,reserve:shuffle(reserve),reserveNumbers:shuffle([...RESERVE_NUMBERS]),upgradeSupply:{booster:24,cannon:24,freight:20},fameSupply:40,
     friendshipPools:Object.fromEntries(Object.entries(FRIENDSHIP_CARDS).map(([k,v])=>[k,clone(v)])),friendshipMarkerHolder:{green:null,diplomats:null,merchants:null,scientists:null},outpostStationOrder:{green:[],diplomats:[],merchants:[],scientists:[]},
     encounterDeck:shuffle(ENCOUNTERS.map(x=>x.n)),encounterDiscard:[],tradeShipMarkers:6,turn:starting.first,round:1,phase:setupMode==="beginner"?"production":"setup",
     dice:null,balls:null,baseSpeed:null,speed:null,lastMothershipActor:null,lastMothershipSpeed:null,nextShipId:100,winner:null,logs:[],blockedNeutral:setupMode==="beginner"&&count===3?makeNeutralBlockers():[],currentEncounter:null,
     setupStarting:firstSafe(starting.first),setupComplete:setupMode==="beginner"};
  B=buildBoardFromState();
  if(setupMode==="beginner"){
    for(const p of players){drawReserve(p,3);S.upgradeSupply.booster--;S.fameSupply--}
    log(`開始プレイヤー判定：${players.map((p,i)=>`${p.name}=${starting.rolls[i]}`).join(" / ")} → ${players[starting.first].name}`);
    log("各プレイヤー：4VP、名声片1、動力1、植民船1で開始。");
  }else log(`可変セットアップ開始。開始プレイヤー：${players[starting.first].name}`);
  save();
}
function firstSafe(x){return Number(x)||0}
function makeNeutralBlockers(){const st=BEGINNER_START[3];return [{node:st.spaceport.node,kind:"spaceport"},...st.colonies.map(c=>({node:c.node,kind:"colony"}))]}

async function runAdvancedSetup(){
  if(S.setupComplete)return;ui.busy=true;render();
  const first=S.setupStarting,clockwise=Array.from({length:S.count},(_,i)=>(first+i)%S.count),reverse=[...clockwise].reverse();
  for(const order of [clockwise,reverse,clockwise])for(const pid of order)await placeSetupColony(S.players[pid]);
  const bonuses=["booster","booster","cannon","freight"];
  for(const pid of reverse)await finishSetupPlayer(S.players[pid],bonuses);
  if(S.count===3){
    for(const h of B.homes)for(const id of h.sites)if(!buildingAt(id))S.blockedNeutral.push({node:id,kind:"blocked"});
  }
  for(const p of S.players){drawReserve(p,3);gainFame(p,1)}
  S.turn=first;S.round=1;S.phase="production";S.setupComplete=true;ui.busy=false;log(`セットアップ完了。${S.players[first].name}から開始。`);render();
  if(window.NET?.online)scheduleOnlineCpuTurn(450);
  else if(!player().human)setTimeout(cpuTurn,350);
}
async function placeSetupColony(p){
  B=buildBoardFromState();const avail=B.homes.flatMap(h=>h.sites).filter(id=>!buildingAt(id));if(!avail.length)return;
  let nodeId;
  if(p.human){
    S.turn=p.id;render();await netCheckpoint();
    if(isLocalPlayer(p))nodeId=await chooseBoardNode("初期配置","盤面の光っている交点から、初期植民地を置く場所を選んでください。",avail,"ここに初期植民地を置いていいですか？");
    else if(window.NET?.online)nodeId=await window.NET.requestChoice(p.id,{kind:"board",title:"初期配置",message:"盤面の光っている交点から、初期植民地を置く場所を選んでください。",ids:avail,confirmText:"ここに初期植民地を置いていいですか？"});
  } else nodeId=rnd(avail);
  if(!nodeId)return;
  const n=getNode(nodeId),home=n.homeSite.home,slot=n.homeSite.slot;p.colonies.push({system:"home"+home,slot,node:nodeId});S.homes[home].colonies[slot]=p.id;p.stock.colonies--;p.vp++;log(`${p.name}：初期植民地を配置`);render();await netCheckpoint();
}
async function finishSetupPlayer(p,bonusPool){
  const own=p.colonies.filter(c=>c.system.startsWith("home"));let sp;
  if(p.human){
    S.turn=p.id;render();await netCheckpoint();
    const ids=own.map(c=>c.node);
    const nodeId=isLocalPlayer(p)?await chooseBoardNode("初期宇宙港","自分の植民地のうち、宇宙港にする場所を盤面から選んでください。",ids,"この植民地を宇宙港にしていいですか？"):
      (window.NET?.online?await window.NET.requestChoice(p.id,{kind:"board",title:"初期宇宙港",message:"自分の植民地のうち、宇宙港にする場所を盤面から選んでください。",ids,confirmText:"この植民地を宇宙港にしていいですか？"}):null);
    sp=own.find(c=>c.node===nodeId);
  } else sp=rnd(own);
  p.spaceports.push(clone(sp));p.stock.shipyards--;p.vp++;
  // 上級セットアップでは、選んだ宇宙港の左右2つのスペースポートサイトのうち
  // 空いている好きな側へ初期船を配置できる。初心者固定配置は BEGINNER_STARTS 側で指定位置を維持する。
  const sites=(B.neigh[sp.node]||[]).filter(id=>!isOccupied(id));
  const fallbackSites=(B.neigh[sp.node]||[]);
  let type="colony";
  if(p.human){
    const opts=[{label:"▲ 植民船",value:"colony",primary:true},{label:"■ 交易船",value:"trade"}];
    type=isLocalPlayer(p)?await chooseSetupOption("初期宇宙船","宇宙港から出す船を選んでください。",opts):
      (window.NET?.online?await window.NET.requestChoice(p.id,{kind:"options",title:"初期宇宙船",message:"宇宙港から出す船を選んでください。",options:opts}):"colony");
  }else type=Math.random()<.7?"colony":"trade";
  let launch;
  const launchChoices=sites.length?sites:fallbackSites;
  if(p.human && launchChoices.length>1){
    const title="初期宇宙船の発進地点",message=`宇宙港の両サイドから、${type==="colony"?"植民船":"交易船"}を置く側を選んでください。`,confirmText=`この側に${type==="colony"?"植民船":"交易船"}を置いていいですか？`;
    launch=isLocalPlayer(p)?await chooseBoardNode(title,message,launchChoices,confirmText):
      (window.NET?.online?await window.NET.requestChoice(p.id,{kind:"board",title,message,ids:launchChoices,confirmText}):rnd(launchChoices));
  }else launch=launchChoices.length?rnd(launchChoices):sp.node;
  if(type==="colony")p.stock.colonies--;else p.stock.tradeStations--;p.stock.transports--;p.ships.push({id:"s"+(S.nextShipId++),type,node:launch,moved:0,stopped:false,startedOnColonySite:false});
  let choices=[...new Set(bonusPool)];let bonus;
  if(p.human){
    const opts=choices.map(k=>({label:BUILD[k].name,value:k}));
    bonus=isLocalPlayer(p)?await chooseSetupOption("初期強化","残っている初期強化から1個選んでください。",opts):
      (window.NET?.online?await window.NET.requestChoice(p.id,{kind:"options",title:"初期強化",message:"残っている初期強化から1個選んでください。",options:opts}):rnd(choices));
  }else bonus=rnd(choices);
  const ix=bonusPool.indexOf(bonus);if(ix>=0)bonusPool.splice(ix,1);p.upgrades[bonus]++;S.upgradeSupply[bonus]--;log(`${p.name}：宇宙港・${type==="colony"?"植民船":"交易船"}・${BUILD[bonus].name}で準備完了`);render();await netCheckpoint();
}

function drawReserve(p,n=1){
  const gained=blankRes();
  for(let i=0;i<n;i++){
    if(!S.reserve.length)refillReserve();
    if(!S.reserve.length)break;
    const r=S.reserve.pop();p.res[r]++;gained[r]++;
  }
  announceResourceGain(p,gained,"予備資源","private",[p.id]);
  return gained;
}
function refillReserve(){
  const needed={};R.forEach(r=>needed[r]=8);
  const arr=[];
  for(const r of R){
    const take=Math.min(8,S.supply[r]);S.supply[r]-=take;for(let i=0;i<take;i++)arr.push(r);
  }
  S.reserve=shuffle(arr);log("予備資源山を作り直しました。");
}
function takeSupply(p,r,n=1,source=""){
  const got=Math.min(n,S.supply[r]);S.supply[r]-=got;p.res[r]+=got;
  if(got>0)announceResourceGain(p,oneGain(r,got),source||"資源獲得");
  return got;
}
function returnSupply(p,r,n=1){
  const k=Math.min(n,p.res[r]);p.res[r]-=k;S.supply[r]+=k;return k;
}
function payCost(p,cost){for(const [r,n] of Object.entries(cost))returnSupply(p,r,n)}

function tokenMatches(token,sum){return Array.isArray(token)?token.includes(sum):token===sum}
function tokenText(token){return Array.isArray(token)?token.join("/"):String(token)}
function getSystem(id){return id.startsWith("home")?S.homes[Number(id.slice(4))]:S.systems[id]}
function getSectorForSystem(id){return B.sectors.find(s=>s.systemId===id)}
function getNode(id){return B.nodes[id]}
function allShips(){return S.players.flatMap(p=>p.ships.map(sh=>({p,sh})))}
function shipAt(nodeId,excludeId=null){return allShips().find(x=>x.sh.node===nodeId&&x.sh.id!==excludeId)}
function buildingAt(nodeId){
  for(const p of S.players){
    const c=p.colonies.find(c=>c.node===nodeId);if(c)return {p,kind:p.spaceports.some(s=>s.node===nodeId)?"spaceport":"colony"};
  }
  const n=S.blockedNeutral.find(x=>x.node===nodeId);if(n)return {p:null,kind:n.kind,neutral:true};
  return null;
}
function isOccupied(nodeId,excludeShip=null){return !!shipAt(nodeId,excludeShip)||!!buildingAt(nodeId)}
function spaceportSitesFor(p){
  const set=new Set();for(const sp of p.spaceports)for(const n of (B.neigh[sp.node]||[]))set.add(n);return [...set];
}
function opponentSpaceportSite(p,nodeId){
  return S.players.some(o=>o.id!==p.id&&spaceportSitesFor(o).includes(nodeId));
}
function isColonySite(nodeId){return !!getNode(nodeId)?.colonySite}
function isDock(nodeId){return getNode(nodeId)?.type==="dock"}

function phaseLabel(x){return x==="setup"?"初期配置":x==="production"?"生産フェイズ":x==="build"?"交易・建設フェイズ":"飛行フェイズ"}
function render(){
  if(!S)return;
  $("turnLabel").textContent=`第${S.round}巡 / ${player().name} / ${phaseLabel(S.phase)} / ${S.setupMode==="beginner"?"初心者用固定配置":S.setupMode==="strategic"?"Strategic":S.setupMode==="explorer"?"Explorer":"Wild Space"}`;
  renderPlayers();renderResources();renderBoard();renderVictoryRoadmap();renderSupplyPanel();renderLog();renderActions();renderDiceStatus();renderMothershipRollStatus();renderBuild();renderBank();renderPlayerTrade();renderPinControl();
  save();
}
function renderDiceStatus(){
  const a=$("dieA"),b=$("dieB"),total=$("diceTotal"),who=$("diceActor");
  if(!a||!b||!total||!who)return;
  if(Array.isArray(S.dice)&&S.dice.length===2){
    setDieFace(a,S.dice[0]);setDieFace(b,S.dice[1]);
    total.textContent=`合計 ${S.dice[0]+S.dice[1]}`;
    who.textContent=S.lastDiceActor?`${S.lastDiceActor} のダイス`:'直前のダイス';
  }else{
    setDieFace(a,1);setDieFace(b,1);total.textContent='--';who.textContent='直前のダイス';
  }
}
function renderPlayers(){
  const panel=$("playersPanel");if(!panel)return;
  panel.innerHTML=`<div class="panel-title">プレイヤー</div>`+S.players.map((p,i)=>{
    const markers=Object.entries(S.friendshipMarkerHolder).filter(([k,v])=>v===p.id).map(([k])=>OUTPOSTS[k].icon).join("");
    return `<div class="player-card ${i===S.turn?"active":""} ${i===mySeat()?"me":""}" data-player-card="${i}" title="クリックで${p.name}の友好カードを確認">
      <div class="player-top"><span class="player-name" style="color:${p.color}">${p.name}${i===mySeat()?'<span class="badge">YOU</span>':""}${!p.human?'<span class="badge cpu-player-badge">CPU</span>':""}</span><div class="vp-stack"><span class="vp">${p.vp} VP</span><span class="fame-vp">🏅 名声片 ${p.famePieces}（${Math.floor(p.famePieces/2)}VP）${p.permanentMedals?`　◆特殊VP ${p.permanentMedals}`:""}</span></div></div>
      <div class="player-mini">資源 ${resTotal(p)} / ▲${p.ships.filter(s=>s.type==="colony").length} ■${p.ships.filter(s=>s.type==="trade").length} / 植民地系 ${p.colonies.length} / 宇宙港 ${p.spaceports.length}</div>
      <div class="player-stat-grid">
        <span><small>動力</small><b>${totalSpeedBonus(p)}</b></span>
        <span><small>大砲</small><b>${totalCombatBonus(p)}</b></span>
        <span><small>貨物</small><b>${p.upgrades.freight}</b></span>
        <span class="friend-stat"><small>友好</small><b>${p.friendship.length}</b></span>
      </div>
      ${markers?`<div class="player-mini friendship-marker-mini">友好マーカー ${markers}</div>`:""}
    </div>`
  }).join("");
  document.querySelectorAll("[data-player-card]").forEach(card=>{
    const id=Number(card.dataset.playerCard);
    card.onclick=()=>showPlayerFriendship(S.players[id]);
  });
}
function showPlayerFriendship(p){
  const cards=p.friendship||[];
  const body=cards.length?cards.map(c=>`<div class="friend-card player-friend-card"><span class="civ">${OUTPOSTS[c.civ]?.name||""}</span><b>${c.name}</b>${c.desc}</div>`).join(""):'<div class="trade-note">所持している友好カードはありません。</div>';
  const markers=Object.entries(S.friendshipMarkerHolder).filter(([k,v])=>v===p.id).map(([k])=>`${OUTPOSTS[k].icon} ${OUTPOSTS[k].name}`).join(" / ");
  modalPromise(`<h2>${p.name} の友好カード</h2>${markers?`<p class="friend-marker-line">友好マーカー：${markers}</p>`:""}<div class="player-friend-list">${body}</div>`,[{label:"閉じる",value:true,primary:true}]);
}
function renderResources(){
  const panel=$("resourcePanel");if(!panel)return;
  const p=me();
  const marker=(p.tradeShipMarkersHeld||0)>0?`<div class="resource-row resource-marker-row"><div><div class="resource-name">■ 無料交易船マーカー</div><div class="marker-note">最初に配置可能になった機会で必ず無料交易船を置く</div></div><div class="resource-count">${p.tradeShipMarkersHeld}</div></div>`:"";
  panel.innerHTML=R.map(r=>`<div class="resource-row resource-tile resource-${r}"><div class="resource-name">${RI[r]} ${RL[r]}</div><div class="resource-count">${p.res[r]}</div></div>`).join("")+marker;
}
function renderVictoryRoadmap(){
  const el=$("victoryRoadmap");if(!el)return;const cells=[];
  for(let vp=4;vp<=15;vp++){
    const here=S.players.filter(p=>p.vp===vp);let bg="";
    if(here.length===1)bg=here[0].color;else if(here.length>1){const step=100/here.length;bg=`conic-gradient(${here.map((p,i)=>`${p.color} ${(i*step).toFixed(3)}% ${((i+1)*step).toFixed(3)}%`).join(",")})`}
    const reserve=vp<=7?2:vp<=9?1:0;
    cells.push(`<div class="vp-road-cell reserve-${reserve}" style="${bg?`--vp-fill:${bg}`:""}"><div class="vp-road-fill"></div><div class="vp-road-number">${vp}</div><div class="vp-road-reserve">${reserve?`予備 +${reserve}`:"予備なし"}</div>${here.length?`<div class="vp-road-names">${here.map(p=>p.name).join("・")}</div>`:""}</div>`);
  }
  el.innerHTML=cells.join("");
}
function renderSupplyPanel(){
  const el=$("supplyPanel");if(!el)return;
  el.innerHTML=R.map(r=>`<div class="supply-tile resource-${r}"><span>${RI[r]} ${RL[r]}</span><b>${S.supply[r]}</b></div>`).join("")+`<div class="supply-tile reserve-stack"><span>？ 予備資源</span><b>${S.reserve.length}</b><small>中身は非公開</small></div>`;
}
function renderStock(){
  if(!$("stockPanel"))return;
  const p=me();
  $("stockPanel").innerHTML=`
    <div class="stock-item">植民地<b>${p.stock.colonies}</b>/9</div>
    <div class="stock-item">交易基地<b>${p.stock.tradeStations}</b>/7</div>
    <div class="stock-item"><span class="stock-shape triangle"></span>輸送船<b>${p.stock.transports}</b>/3</div>
    <div class="stock-item">造船所<b>${p.stock.shipyards}</b>/3</div>
    <div class="stock-item">永久名声<b>${p.permanentMedals}</b></div>
    <div class="stock-item">無料交易船待ち<b>${p.pendingFreeTradeShips}</b></div>`;
}
function pips(n,cls){return Array.from({length:n},()=>`<span class="pip ${cls}"></span>`).join("")}
function renderMothership(){
  if(!$("cannonPips"))return;
  const p=me();
  $("cannonPips").innerHTML=pips(p.upgrades.cannon,"cannon");
  $("freightPips").innerHTML=pips(p.upgrades.freight,"freight");
  $("boosterPips").innerHTML=pips(p.upgrades.booster,"booster");
  $("upgradeStats").innerHTML=`<div>速度補正<b>${totalSpeedBonus(p)}</b></div><div>戦闘補正<b>${totalCombatBonus(p)}</b></div><div>貨物<b>${p.upgrades.freight}</b></div>`;
  if(isMyTurn()&&S.phase==="flight"&&S.balls){
    $("speedResult").innerHTML=`${S.balls.map(b=>b.emoji+(!b.black?b.v:"")).join(" + ")}<br>基本 ${S.baseSpeed} ＋補正 ${totalSpeedBonus(p)} ＝ <strong>${S.speed}</strong>`;
  }else $("speedResult").textContent="飛行フェイズで母船を振ります";
}
function renderPhases(){ /* フェイズ表示はトップのターン表示へ統合済み */
}
function svg(tag,attrs={}){const e=document.createElementNS("http://www.w3.org/2000/svg",tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e}
function planetFill(r){return {ore:"#b64e52",fuel:"#e1842d",carbon:"#347fbd",food:"#3c9e68",goods:"#9a73c8"}[r]}


const VIRTUAL_1920_KEY="starfarers_virtual_1920";
let virtual1920Mode=localStorage.getItem(VIRTUAL_1920_KEY)==="1";

function updateVirtual1920Scale(){
  if(!virtual1920Mode)return;
  const scale=Math.min(window.innerWidth/1920,window.innerHeight/1080);
  document.documentElement.style.setProperty("--sf-virtual-1920-scale",String(Math.max(.1,scale)));
}
function applyVirtual1920Mode(){
  document.body.classList.toggle("sf-virtual-1920",virtual1920Mode);
  const btn=$("virtual1920Btn");
  if(btn){
    btn.textContent=virtual1920Mode?"通常表示":"1920×1080";
    btn.classList.toggle("active",virtual1920Mode);
  }
  if(virtual1920Mode)updateVirtual1920Scale();
  else document.documentElement.style.removeProperty("--sf-virtual-1920-scale");
}
function toggleVirtual1920Mode(){
  virtual1920Mode=!virtual1920Mode;
  localStorage.setItem(VIRTUAL_1920_KEY,virtual1920Mode?"1":"0");
  applyVirtual1920Mode();
  render();
}
function showFullLog(){
  if(!S)return;
  const rows=S.logs.length
    ?S.logs.slice().reverse().map(x=>`<div class="full-log-entry"><span>${x.t}</span><strong>${x.msg}</strong></div>`).join("")
    :'<div class="trade-note">ログはまだありません。</div>';
  modalPromise(`<h2>航海ログ</h2><div class="full-log-list">${rows}</div>`,[
    {label:"閉じる",value:true,primary:true}
  ]);
}
window.addEventListener("resize",()=>{if(virtual1920Mode)updateVirtual1920Scale()});

function renderPinControl(){
  const btn=$("pinBtn");if(!btn)return;
  btn.classList.toggle("active",!!ui.pinMode);
  btn.textContent=ui.pinMode?"📌 盤面を選択":"📌 ピン差し";
}
function togglePinMode(){
  if(ui.boardChoice){showToast("配置場所の選択中はピン差しできません");return}
  ui.pinMode=!ui.pinMode;
  if(ui.pinMode){ui.selectedShip=null;ui.jumpMode=false}
  render();
}
function placeBoardPin(x,y){
  ui.pinMode=false;ui.pin={x,y,until:Date.now()+5000};
  if(window.NET?.online&&!window.NET.playingNetEvent)window.NET.sendPin({x,y});
  if(ui.pinTimer)clearTimeout(ui.pinTimer);
  ui.pinTimer=setTimeout(()=>{ui.pin=null;ui.pinTimer=null;render()},5050);
  render();
}
function drawBoardPin(b){
  if(!ui.pin||ui.pin.until<=Date.now()){ui.pin=null;return}
  const {x,y}=ui.pin,g=svg("g",{class:"board-pin-marker"});
  g.append(svg("circle",{cx:x,cy:y,r:18,class:"board-pin-pulse"}));
  g.append(svg("line",{x1:x,y1:y-28,x2:x,y2:y-3,class:"board-pin-stem"}));
  g.append(svg("circle",{cx:x,cy:y-31,r:10,class:"board-pin-head"}));
  const t=svg("text",{x:x,y:y-30,class:"board-pin-icon"});t.textContent="●";g.append(t);
  b.append(g);
}
function drawPinSelectionOverlay(b){
  if(!ui.pinMode)return;
  const r=svg("rect",{x:0,y:0,width:1500,height:900,class:"pin-select-overlay"});
  r.addEventListener("click",ev=>{
    const pt=b.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;
    const ctm=b.getScreenCTM();if(!ctm)return;
    const p=pt.matrixTransform(ctm.inverse());
    placeBoardPin(Math.max(0,Math.min(1500,p.x)),Math.max(0,Math.min(900,p.y)));
  });
  b.append(r);
  const msg=svg("text",{x:750,y:48,class:"pin-select-message"});msg.textContent="ピンを置く場所をクリック";b.append(msg);
}
function renderBoard(){
  const b=$("spaceBoard");b.innerHTML="";
  // 全宇宙航路。実物と同じハニカム接続を先に描く。
  for(const [a,c] of B.edges){const A=getNode(a),C=getNode(c);if(!A||!C)continue;b.append(svg("line",{x1:A.x,y1:A.y,x2:C.x,y2:C.y,class:"space-route"}))}
  // 近距離/遠距離の境界を視認しやすくする自作ネビュラ表示。
  b.append(svg("path",{d:"M760,85 L975,85 L975,315 L885,315 L885,475 L1065,475 L1065,820 L820,820 L820,620 L700,620 L700,400 L760,400 Z",class:"nebula-zone"}));
  for(const sec of B.sectors){
    if(!sec.revealed){drawUnknownSector(b,sec);continue}
    if(sec.content.startsWith("empty"))drawEmptySector(b,sec);
    else if(sec.content.startsWith("system:"))drawSystemSector(b,sec,S.systems[sec.systemId]);
    else if(sec.content.startsWith("outpost:"))drawOutpostSector(b,sec);
  }
  for(const h of B.homes)drawHome(b,h);
  drawBuildings(b);drawShips(b);drawSetupTargets(b);drawMovementTargets(b);drawBoardPin(b);drawPinSelectionOverlay(b);
}
function sectorLobes(sec,r=43){
  if(sec.planetCenters)return sec.planetCenters.map(q=>({x:q.x,y:q.y}));
  return [];
}
function drawUnknownSector(b,sec){
  for(const q of sectorLobes(sec,39))b.append(svg("circle",{cx:q.x,cy:q.y,r:34,class:"sector-lobe unknown"}));
  const t=svg("text",{x:sec.x,y:sec.y+6,class:"planet-q"});t.textContent="?";b.append(t);
}
function drawEmptySector(b,sec){
  for(const q of sectorLobes(sec,39))b.append(svg("circle",{cx:q.x,cy:q.y,r:34,class:"sector-lobe empty"}));
  b.append(svg("circle",{cx:sec.x,cy:sec.y,r:7,class:"node-dot"}));
}
function drawSystemSector(b,sec,sys){
  const ps=sectorLobes(sec,39);
  for(let i=0;i<3;i++){
    const pl=sys.planets[i],q=ps[i];
    b.append(svg("circle",{cx:q.x,cy:q.y,r:30,fill:planetFill(pl.type),class:"planet-token"}));
    const specialVisible=sys.revealed&&pl.special&&!pl.cleared;
    if(specialVisible){
      const pirate=pl.special.type==="pirate";
      b.append(svg("circle",{cx:q.x,cy:q.y,r:32,class:`special-planet-ring ${pirate?"pirate":"ice"}`}));
      const badge=svg("rect",{x:q.x-25,y:q.y+15,width:50,height:15,rx:7.5,class:`special-planet-badge ${pirate?"pirate":"ice"}`});b.append(badge);
      const bt=svg("text",{x:q.x,y:q.y+26,class:"special-planet-badge-text"});bt.textContent=pirate?`武器 ${pl.special.need}`:`貨物 ${pl.special.need}`;b.append(bt);
      const icon=svg("text",{x:q.x,y:q.y+3,class:"special-planet-icon"});icon.textContent=pirate?"☠":"❄";b.append(icon);
      const title=svg("title");title.textContent=pirate?`宇宙海賊基地：必要武器数 ${pl.special.need}`:`凍土：必要貨物数 ${pl.special.need}`;badge.append(title);
    }else{
      const t=svg("text",{x:q.x,y:q.y+5,class:"planet-num"});
      t.textContent=!sys.revealed?"?":tokenText(pl.token);b.append(t);
    }
  }
  sec.colonySiteNodes.forEach((id,slot)=>{
    const n=getNode(id),blocked=colonySiteBlocked(sys,slot);
    const dot=svg("circle",{cx:n.x,cy:n.y,r:7,class:"site-dot"+(blocked?" blocked":"")});
    const title=svg("title");title.textContent=blocked?"コロニースポット：植民不可（植民船の停止は可能）":"コロニースポット：植民可能";dot.append(title);b.append(dot);
    if(blocked){b.append(svg("line",{x1:n.x-5,y1:n.y-5,x2:n.x+5,y2:n.y+5,class:"site-block-x"}));b.append(svg("line",{x1:n.x+5,y1:n.y-5,x2:n.x-5,y2:n.y+5,class:"site-block-x"}))}
  });
}
function outpostStationOwners(key){
  const order=S.outpostStationOrder?.[key];
  if(Array.isArray(order)&&order.length)return order.slice(0,5);
  const out=[];for(const p of S.players)for(let i=0;i<(p.tradeStations[key]||0);i++)out.push(p.id);return out.slice(0,5);
}
function showOutpostCards(key){
  const d=OUTPOSTS[key],pool=S.friendshipPools[key]||[];
  const cards=pool.length?pool.map(c=>`<div class="outpost-card-preview"><b>${c.name}</b><span>${c.desc}</span></div>`).join(""):'<div class="trade-note">残っている友好カードはありません。</div>';
  return modalPromise(`<h2>${d.icon} ${d.name}</h2><p>現在残っている有効な友好カードです。</p><div class="outpost-card-list">${cards}</div>`,[{label:"閉じる",value:true,primary:true}]);
}
function drawOutpostSector(b,sec){
  const d=OUTPOSTS[sec.outpost];
  // 他の惑星系タイルと同じ3つの印刷円座標・サイズを使用する。
  // 上=種族 / 左下=基地数 / 右下=設置済み基地。
  const lobes=sectorLobes(sec,39).map(q=>({x:q.x,y:q.y}));
  const top=[...lobes].sort((a,b)=>a.y-b.y)[0];
  const lower=lobes.filter(q=>q!==top).sort((a,b)=>a.x-b.x);
  const left=lower[0],right=lower[1];
  const circles=[top,left,right];
  for(const q of circles)b.append(svg("circle",{cx:q.x,cy:q.y,r:30,class:"sector-lobe outpost-lobe"}));

  const species=svg("circle",{cx:top.x,cy:top.y,r:30,class:"outpost-species-circle"});b.append(species);
  const hit=svg("circle",{cx:top.x,cy:top.y,r:32,class:"outpost-species-hit"});hit.addEventListener("click",()=>showOutpostCards(sec.outpost));b.append(hit);
  const icon=svg("text",{x:top.x,y:top.y-1,class:"outpost-species-icon"});icon.textContent=d.icon;b.append(icon);
  const name=svg("text",{x:top.x,y:top.y+15,class:"outpost-species-name"});name.textContent=d.name;b.append(name);

  const count=svg("text",{x:left.x,y:left.y+6,class:"outpost-count"});count.textContent=`${totalStations(sec.outpost)}/5`;b.append(count);
  const countLabel=svg("text",{x:left.x,y:left.y-12,class:"outpost-count-label"});countLabel.textContent="基地";b.append(countLabel);

  const owners=outpostStationOwners(sec.outpost),pos=[[-10,-10],[4,-10],[-10,4],[4,4],[-3,11]];
  owners.forEach((pid,i)=>{const [dx,dy]=pos[i]||[0,0];b.append(svg("rect",{x:right.x+dx-5,y:right.y+dy-5,width:11,height:11,rx:1.5,fill:S.players[pid]?.color||"#888",class:"outpost-station-piece"}))});
  if(!owners.length){const empty=svg("text",{x:right.x,y:right.y+5,class:"outpost-empty-mark"});empty.textContent="■";b.append(empty)}

  // 実際の交易船停止地点はタイル中央交点。
  b.append(svg("circle",{cx:sec.x,cy:sec.y,r:5,class:"docking"}));
}
function drawHome(b,h){
  const hi=Number(h.id.slice(4)),sys=S.homes[hi],ps=sectorLobes(h,42);
  for(let i=0;i<3;i++){
    const pl=sys.planets[i],q=ps[i];b.append(svg("circle",{cx:q.x,cy:q.y,r:31,fill:planetFill(pl.type),class:"planet-token home-planet"}));
    const t=svg("text",{x:q.x,y:q.y+5,class:"planet-num"});t.textContent=tokenText(pl.token);b.append(t);
  }
  const label=svg("text",{x:h.x,y:h.y+5,class:"home-center-label"});label.textContent=["α","β","γ","δ"][hi];b.append(label);
  h.sites.forEach(id=>{const n=getNode(id);b.append(svg("circle",{cx:n.x,cy:n.y,r:7,class:"site-dot"}))});
}
function drawBuildings(b){
  for(const p of S.players){
    for(const c of p.colonies){
      const n=getNode(c.node);if(!n)continue;
      const isPort=p.spaceports.some(sp=>sp.node===c.node);
      if(isPort){
        b.append(svg("polygon",{points:`${n.x},${n.y-19} ${n.x+19},${n.y} ${n.x},${n.y+19} ${n.x-19},${n.y}`,fill:p.color,class:"spaceport-halo"}));
        b.append(svg("circle",{cx:n.x,cy:n.y,r:10,fill:p.color,class:"spaceport-core"}));
        const mark=svg("text",{x:n.x,y:n.y+1,class:"spaceport-mark"});mark.textContent="◆";b.append(mark);
      }else b.append(svg("circle",{cx:n.x,cy:n.y,r:10,fill:p.color,class:"colony-pip"}));
    }
  }
  for(const bl of S.blockedNeutral){const n=getNode(bl.node);if(n)b.append(svg("circle",{cx:n.x,cy:n.y,r:11,fill:"#777",stroke:"#fff","stroke-width":2}))}
  for(const [key,holder] of Object.entries(S.friendshipMarkerHolder)){
    if(holder===null)continue;const sec=B.sectors.find(s=>s.outpost===key);if(!sec)continue;
    const t=svg("text",{x:sec.x+38,y:sec.y-29,fill:S.players[holder].color,"font-size":18});t.textContent="★";b.append(t);
  }
}
function drawShips(b){
  for(const p of S.players)for(const sh of p.ships){
    const n=getNode(sh.node);if(!n)continue;const cx=n.x,cy=n.y;
    const selected=ui.selectedShip===sh.id;
    const movable=isLocalPlayer(p)&&isMyTurn()&&S.phase==="flight"&&S.speed!==null&&!ui.busy&&!pendingFreeTradeShipBlocks(p)&&shipCanMove(p,sh);
    if(movable&&!selected){
      b.append(svg("circle",{cx,cy,r:18,class:"ship-movable-ring"}));
      b.append(svg("circle",{cx,cy,r:18,class:"ship-movable-wave wave-a"}));
      b.append(svg("circle",{cx,cy,r:18,class:"ship-movable-wave wave-b"}));
    }
    if(selected)b.append(svg("circle",{cx,cy,r:17,class:"ship-select-ring"}));
    let piece;
    const humanClass=isLocalPlayer(p)?" ship-human":"";
    const movableClass=movable?" ship-movable":"";
    const forcedChoiceClass=ui.boardChoice?.style==="ship"&&ui.boardChoice.ids.includes(sh.node)?" ship-forced-choice":"";
    if(sh.type==="colony")piece=svg("polygon",{points:`${cx},${cy-12} ${cx-10},${cy+6} ${cx+10},${cy+6}`,fill:p.color,class:"ship-shape colony-ship"+humanClass+movableClass+forcedChoiceClass});
    else piece=svg("rect",{x:cx-9,y:cy-9,width:18,height:18,rx:2,fill:p.color,class:"ship-shape trade-ship"+humanClass+movableClass+forcedChoiceClass});
    const title=svg("title");title.textContent=`${p.name} / ${sh.type==="colony"?"植民船":"交易船"}${movable?" / 移動可能":""}`;piece.append(title);
    if(isLocalPlayer(p)&&isMyTurn()&&S.phase==="flight"&&S.speed!==null&&!ui.busy&&!pendingFreeTradeShipBlocks(p))piece.addEventListener("click",()=>selectShip(sh.id));
    b.append(piece);
  }
}
function drawSetupTargets(b){
  if(!ui.boardChoice)return;const style=ui.boardChoice.style||"node";
  for(const id of ui.boardChoice.ids){
    const n=getNode(id);if(!n)continue;
    const cls=style==="ship"?"setup-target-ring ship-choice-target":style==="ship-build"?"setup-target-ring ship-build-target":"setup-target-ring";
    const outer=svg("circle",{cx:n.x,cy:n.y,r:style==="ship"?31:style==="ship-build"?25:19,class:cls});
    const hit=svg("circle",{cx:n.x,cy:n.y,r:style==="ship"?34:style==="ship-build"?29:22,class:"setup-target-hit"});
    hit.addEventListener("click",()=>resolveBoardChoice(id));b.append(outer);b.append(hit);
  }
}
function drawMovementTargets(b){
  if(!isMyTurn()||S.phase!=="flight"||S.speed===null||!ui.selectedShip||ui.busy||pendingFreeTradeShipBlocks(me()))return;
  const sh=me().ships.find(s=>s.id===ui.selectedShip);if(!sh||sh.stopped)return;
  if(ui.jumpMode){
    for(const id of Object.keys(B.nodes))if(id!==sh.node&&canEndAt(me(),sh,id,true)){
      const n=getNode(id),c=svg("circle",{cx:n.x,cy:n.y,r:13,class:"movement-target-ring jump-target"});
      const hit=svg("circle",{cx:n.x,cy:n.y,r:22,class:"movement-target-hit jump-target-hit"});
      hit.addEventListener("mouseenter",()=>c.classList.add("hover"));hit.addEventListener("mouseleave",()=>c.classList.remove("hover"));hit.addEventListener("click",()=>spaceJumpHuman(id));
      b.append(c);b.append(hit)
    }return;
  }
  const paths=getReachablePaths(me(),sh);
  for(const [id,path] of paths.entries()){
    const n=getNode(id),dist=path.length-1;
    const c=svg("circle",{cx:n.x,cy:n.y,r:16,class:"movement-target-ring","data-distance":dist});
    const hit=svg("circle",{cx:n.x,cy:n.y,r:21,class:"movement-target-hit"});
    const t=svg("text",{x:n.x,y:n.y+4,class:"movement-target-distance"});t.textContent=String(dist);
    hit.addEventListener("mouseenter",()=>c.classList.add("hover"));
    hit.addEventListener("mouseleave",()=>c.classList.remove("hover"));
    hit.addEventListener("click",()=>moveHumanShip(id,path));
    b.append(c);b.append(t);b.append(hit);
  }
}
function boardHint(){
  if(ui.boardChoice)return ui.boardChoice.message;
  if(S.phase!=="flight")return "船は交点から交点へ移動。惑星系へ隣接すると即時探索します。";
  if(ui.jumpMode)return "スペースジャンプ：空いている有効な交点を1つ選択";
  if(!ui.selectedShip)return S.speed===null?"母船を振ると飛行開始":"光っている船を選択してください";
  const sh=me().ships.find(s=>s.id===ui.selectedShip);
  if(!sh)return "";
  const rem=Math.max(0,S.speed-sh.moved),count=getReachablePaths(me(),sh).size;
  return `${sh.type==="colony"?"植民船▲":"交易船■"} / 残り移動力 ${rem} / 到達可能 ${count}地点${sh.stopped?" / このターン停止":""}`;
}
function renderHomes(){}
function renderLog(){const el=$("log");if(!el)return;el.innerHTML=S.logs.map(x=>`<div class="log-entry"><span>${x.t}</span> <strong>${x.msg}</strong></div>`).join("")}
function renderFriendship(){ /* 友好カードはプレイヤー欄クリックで確認 */ }
function canPlacePendingFreeTradeShip(p){
  return !!p && (p.pendingFreeTradeShips||0)>0 && p.stock.transports>0 && p.stock.tradeStations>0 && freeLaunchSites(p).length>0;
}
function pendingFreeTradeShipBlocks(p){
  return canPlacePendingFreeTradeShip(p);
}
async function placePendingFreeTradeShipHuman(){
  const p=me();if(!pendingFreeTradeShipBlocks(p)||ui.busy)return;
  const sites=freeLaunchSites(p);
  ui.busy=false;
  const site=await chooseBoardNode("無料交易船","無料交易船を置く宇宙港の発進地点を選びます。これは最初に配置可能になった機会で必ず置きます。",sites,"ここに無料交易船を置きますか？");
  if(!site)return;
  p.stock.transports--;p.stock.tradeStations--;p.ships.push({id:"s"+(S.nextShipId++),type:"trade",node:site,moved:0,stopped:false,startedOnColonySite:false});p.pendingFreeTradeShips--;
  if((p.tradeShipMarkersHeld||0)>0){p.tradeShipMarkersHeld--;S.tradeShipMarkers=Math.min(6,S.tradeShipMarkers+1)}
  log(`${p.name}：無料交易船を配置`);
  render();
}
function ensurePendingFreeTradeMarkers(p){
  while((p.tradeShipMarkersHeld||0)<(p.pendingFreeTradeShips||0)&&S.tradeShipMarkers>0){p.tradeShipMarkersHeld=(p.tradeShipMarkersHeld||0)+1;S.tradeShipMarkers--}
}

function renderActions(){
  const a=$("actionArea"),p=player();
  if(S.winner!==null){a.innerHTML='<div class="setup-action-title">ゲーム終了</div>';return}
  if(ui.boardChoice){a.innerHTML=`<div class="setup-action-title">${ui.boardChoice.title}</div>`;return}
  if(ui.setupOptions){
    a.innerHTML=`<div class="setup-action-title">${ui.setupOptions.title}</div><div class="setup-option-grid">${ui.setupOptions.options.map((o,i)=>`<button data-setup-option="${i}" class="${o.primary?"primary":""}">${o.label}</button>`).join("")}</div>`;
    a.querySelectorAll("[data-setup-option]").forEach(btn=>btn.onclick=()=>resolveSetupOption(ui.setupOptions.options[Number(btn.dataset.setupOption)].value));return;
  }
  if(!p.human){a.innerHTML=`<div class="setup-action-title">${p.name} が行動中</div>`;return}
  if(window.NET?.online&&!isLocalPlayer(p)){a.innerHTML=`<div class="setup-action-title">${p.name} の操作待ち</div>`;return}
  if(pendingFreeTradeShipBlocks(p)){
    a.innerHTML=`<div class="setup-action-title">無料交易船を即時配置</div><div class="action-buttons"><button id="freeTradeShipBtn" class="primary">■ 無料交易船 (${p.pendingFreeTradeShips})</button></div>`;
    $("freeTradeShipBtn").onclick=placePendingFreeTradeShipHuman;return;
  }
  if(S.phase==="production"){
    a.innerHTML='<div class="action-buttons"><button id="rollBtn" class="dice-roll-btn">🎲 ダイスを振る</button></div>';
    $("rollBtn").onclick=humanProduction;return;
  }
  if(S.phase==="build"){
    let special="";
    if(hasCard(p,"fameSale")&&!p.turnFlags.fameSale&&p.res.goods>0)special+='<button id="fameSaleBtn">交易品1 → 名声片1</button>';
    const higher=S.players.filter(o=>o.id!==p.id&&o.vp>p.vp);
    if(hasCard(p,"helpingHand")&&!p.turnFlags.helpingHand&&higher.length>=2)special+='<button id="helpingBtn">援助要請を使う</button>';
    a.innerHTML=`<div class="action-buttons">${special}<button id="toFlight" class="primary">飛行フェイズへ</button></div>`;
    $("toFlight").onclick=startHumanFlight;
    if($("fameSaleBtn"))$("fameSaleBtn").onclick=useFameSale;
    if($("helpingBtn"))$("helpingBtn").onclick=useHelpingHand;
    return;
  }
  if(S.speed===null){
    if(!p.ships.length){a.innerHTML='<div class="action-buttons"><button id="skipFlight" class="primary">次の手番</button></div>';$("skipFlight").onclick=endHumanTurn;return}
    a.innerHTML='<div class="action-buttons"><button id="shakeBtn" class="primary">🚀 マザーシップを振る</button></div>';
    $("shakeBtn").onclick=humanShake;return;
  }
  if((p.pendingJump||0)>0){
    a.innerHTML=`<div class="action-buttons"><button id="jumpBtn" class="primary">🌀 スペースジャンプ (${p.pendingJump})</button></div>`;
    $("jumpBtn").onclick=()=>beginHumanJump();return;
  }
  const sh=ui.selectedShip?p.ships.find(s=>s.id===ui.selectedShip):null;
  let loc="";
  if(sh&&!sh.stopped){
    const n=getNode(sh.node);
    if(isColonySite(sh.node)&&sh.type==="colony"){
      const cs=n.colonySite,sys=S.systems[cs.system];if(canColonize(p,sh,sys,cs.slot))loc+='<button id="colonizeBtn">🪐 植民地を設置</button>';
    }
    if(isDock(sh.node)&&sh.type==="trade"&&canEndAt(p,sh,sh.node,false)){loc+='<button id="tradeStationBtn">🤝 交易基地を設置</button>';}
  }
  const invalid=p.ships.some(s=>!canEndAt(p,s,s.node,false));
  const jumpBtn=(p.pendingJump||0)>0&&!ui.jumpMode?`<button id="jumpBtn">🌀 スペースジャンプ (${p.pendingJump})</button>`:"";
  a.innerHTML=`<div class="action-buttons">${loc}${jumpBtn}${ui.jumpMode?'<button id="cancelJump">ジャンプ取消</button>':""}<button id="endFlight" class="primary" ${invalid?'disabled':''}>飛行終了</button></div>`;
  if($("colonizeBtn"))$("colonizeBtn").onclick=()=>humanColonize(sh);
  if($("tradeStationBtn"))$("tradeStationBtn").onclick=async()=>{ui.busy=true;await establishTradeStation(p,sh,getNode(sh.node).outpost,true);ui.busy=false;render()};
  if($("jumpBtn"))$("jumpBtn").onclick=()=>beginHumanJump();
  if($("cancelJump"))$("cancelJump").onclick=()=>{ui.jumpMode=false;render()};
  $("endFlight").onclick=endHumanTurn;
}
function buildStockInfo(p,k){
  if(k==="colonyShip")return {main:`${p.stock.colonies}/9`,sub:`輸送船 ${p.stock.transports}/3`};
  if(k==="tradeShip")return {main:`${p.stock.tradeStations}/7`,sub:`輸送船 ${p.stock.transports}/3`};
  if(k==="spaceport")return {main:`${p.stock.shipyards}/3`,sub:"造船所"};
  if(k==="booster")return {main:`${p.upgrades.booster}/6`,sub:scientistSpeed(p)?`科学者補正 +${scientistSpeed(p)}`:""};
  if(k==="cannon")return {main:`${p.upgrades.cannon}/6`,sub:scientistCombat(p)?`科学者補正 +${scientistCombat(p)}`:""};
  if(k==="freight")return {main:`${p.upgrades.freight}/5`,sub:""};
  return {main:"",sub:""};
}
function renderBuild(){
  const area=$("buildArea");if(!area)return;
  const p=me(),phaseEnabled=isMyTurn()&&S.phase==="build"&&!ui.busy&&!pendingFreeTradeShipBlocks(p);
  area.innerHTML=Object.entries(BUILD).map(([k,v])=>{
    const actionable=phaseEnabled&&canBuild(p,k),stock=buildStockInfo(p,k);
    return `<button class="catan-build-btn${actionable?"":" build-nonclick"}" data-build="${k}" aria-disabled="${actionable?"false":"true"}" title="${phaseEnabled?(canBuild(p,k)?"建設できます":"必要資源・在庫などの条件を満たしていません"):"交易・建設フェイズで建設できます"}">
      <span class="build-icon-wrap">${buildPieceIcon(k)}</span>
      <span class="build-copy">
        <span class="build-title-line"><strong>${v.name}</strong><span class="build-stock-inline">${stock.main}</span>${stock.sub?`<span class="build-stock-sub-inline">${stock.sub}</span>`:""}</span>
        <span class="build-costs">${costChips(v.cost)}</span>
      </span>
    </button>`;
  }).join("");
  document.querySelectorAll("[data-build]").forEach(x=>x.onclick=()=>{
    const k=x.dataset.build;if(!(isMyTurn()&&S.phase==="build"&&!ui.busy&&canBuild(me(),k)))return;humanBuild(k);
  });
}
function canBuild(p,k){
  if(!canPay(p,BUILD[k].cost))return false;
  if(k==="colonyShip")return p.stock.transports>0&&p.stock.colonies>0&&freeLaunchSites(p).length>0;
  if(k==="tradeShip")return p.stock.transports>0&&p.stock.tradeStations>0&&freeLaunchSites(p).length>0;
  if(k==="spaceport")return p.stock.shipyards>0&&p.colonies.some(c=>!p.spaceports.some(s=>s.node===c.node));
  if(k==="booster")return p.upgrades.booster<6&&S.upgradeSupply.booster>0;
  if(k==="cannon")return p.upgrades.cannon<6&&S.upgradeSupply.cannon>0;
  if(k==="freight")return p.upgrades.freight<5&&S.upgradeSupply.freight>0;
  return false;
}
function renderBank(){
  const area=$("bankTradeArea");if(!area)return;
  const p=me(),enabled=isMyTurn()&&S.phase==="build"&&!ui.busy&&!pendingFreeTradeShipBlocks(p);
  area.innerHTML=`<div class="bank-row"><select id="bankGive">${R.map(r=>`<option value="${r}">${RL[r]}</option>`).join("")}</select><select id="bankGet">${R.map(r=>`<option value="${r}">${RL[r]}</option>`).join("")}</select></div><div class="bank-action-row"><div id="bankRateBadge" class="bank-rate-badge"></div><button id="bankBtn" ${enabled?"":"disabled"}>供給と交換</button></div>`;
  const refreshRate=()=>{const give=$("bankGive")?.value,badge=$("bankRateBadge");if(!give||!badge)return;const rate=bankRate(me(),give);badge.innerHTML=`${RI[give]} ${RL[give]} <b>${rate}:1</b>`};
  const giveSel=$("bankGive"),getSel=$("bankGet"),bankBtn=$("bankBtn");if(giveSel)giveSel.onchange=refreshRate;if(getSel)getSel.onchange=refreshRate;refreshRate();if(bankBtn)bankBtn.onclick=bankTrade;
}
function renderPlayerTrade(){
  const area=$("playerTradeArea");if(!area)return;
  const enabled=isMyTurn()&&S.phase==="build"&&!ui.busy&&!pendingFreeTradeShipBlocks(me());
  area.innerHTML=`<button id="tradeOpenBtn" class="trade-open-btn" ${enabled?"":"disabled"}>🤝 プレイヤーと交易</button>`;
  const tradeBtn=$("tradeOpenBtn");if(tradeBtn)tradeBtn.onclick=()=>openCatanTrade();
}
function tradeBundleText(bundle){
  const items=R.filter(r=>(bundle[r]||0)>0).map(r=>`${RI[r]}${RL[r]}×${bundle[r]}`);
  return items.length?items.join("　"):"なし";
}
function bundleTotal(bundle){return R.reduce((s,r)=>s+(bundle[r]||0),0)}
function openCatanTrade(preselected=null){
  if(!isMyTurn()||S.phase!=="build"||ui.busy||pendingFreeTradeShipBlocks(me()))return;
  const p=me(),state={target:preselected??S.players.find(o=>o.id!==mySeat())?.id,give:blankRes(),get:blankRes()};
  const backdrop=$("modalBackdrop"),modal=$("modal");
  backdrop.classList.add("show");
  function redraw(){
    const targets=S.players.filter(o=>o.id!==mySeat());
    modal.innerHTML=`<h2>プレイヤーと交易</h2><div class="trade-builder">
      <div><div class="panel-title">相手</div><div class="trade-target-list">${targets.map(o=>`<button data-trade-target="${o.id}" class="${state.target===o.id?"selected":""}">${o.name}<br><small>資源 ${resTotal(o)}枚</small></button>`).join("")}</div></div>
      <div class="trade-side"><h3 class="good">自分が渡す</h3>${R.map(r=>tradeResourceLine("give",r,state.give[r],p.res[r])).join("")}</div>
      <div class="trade-side"><h3 class="warn">自分が貰う</h3>${R.map(r=>tradeResourceLine("get",r,state.get[r],12)).join("")}</div>
      <div class="trade-summary"><b>${S.players[state.target]?.name||"相手"}</b>へ<br>渡す：${tradeBundleText(state.give)}<br>貰う：${tradeBundleText(state.get)}</div>
      <div class="modal-actions"><button id="tradeCancel">やめる</button><button id="tradeSubmit" class="primary" ${bundleTotal(state.give)<=0||bundleTotal(state.get)<=0?"disabled":""}>この内容で提案</button></div>
    </div>`;
    modal.querySelectorAll("[data-trade-target]").forEach(x=>x.onclick=()=>{state.target=Number(x.dataset.tradeTarget);redraw()});
    modal.querySelectorAll("[data-trade-side]").forEach(x=>x.onclick=()=>{
      const side=x.dataset.tradeSide,r=x.dataset.resource,delta=Number(x.dataset.delta),bundle=state[side];
      const cap=side==="give"?p.res[r]:12;bundle[r]=Math.max(0,Math.min(cap,bundle[r]+delta));redraw();
    });
    $("tradeCancel").onclick=()=>backdrop.classList.remove("show");
    $("tradeSubmit").onclick=()=>submitCatanTrade(state,backdrop,modal);
  }
  redraw();
}
function tradeResourceLine(side,r,n,cap){
  return `<div class="trade-resource-line"><span>${RI[r]} ${RL[r]} <small>${side==="give"?`所持${cap}`:""}</small></span><button data-trade-side="${side}" data-resource="${r}" data-delta="-1" ${n<=0?"disabled":""}>−</button><b>${n}</b><button data-trade-side="${side}" data-resource="${r}" data-delta="1" ${n>=cap?"disabled":""}>＋</button></div>`;
}
async function submitCatanTrade(state,backdrop,modal){
  const p=me(),o=S.players[state.target];if(!o)return;
  if(R.some(r=>state.give[r]>p.res[r])){showToast("渡す資源が足りません");return}
  if(R.some(r=>state.get[r]>o.res[r])){modal.innerHTML=`<h2>交易結果</h2><div class="trade-response no">NO</div><p>${o.name}は要求された資源を持っていません。</p><div class="modal-actions"><button id="tradeClose" class="primary">閉じる</button></div>`;$("tradeClose").onclick=()=>backdrop.classList.remove("show");return}
  modal.innerHTML=`<h2>${o.name}へ交易を提案</h2><div class="trade-summary">あなたが渡す：${tradeBundleText(state.give)}<br>あなたが貰う：${tradeBundleText(state.get)}</div><p>相手の回答を待っています…</p>`;
  let accept;
  if(window.NET?.online&&o.human){
    accept=await window.NET.requestChoice(o.id,{kind:"trade",title:`${p.name}から交易提案`,fromName:p.name,give:clone(state.give),get:clone(state.get)});
  }else{
    await wait(420);
    const offeredValue=R.reduce((s,r)=>s+state.give[r]*(o.res[r]<=1?1.35:o.res[r]<=2?1.12:.9),0);
    const requestedValue=R.reduce((s,r)=>s+state.get[r]*(o.res[r]>=4?.85:o.res[r]>=2?1.0:1.35),0);
    accept=offeredValue>=requestedValue*.9||Math.random()<Math.max(.06,Math.min(.38,offeredValue/(requestedValue||1)*.22));
  }
  if(accept){for(const r of R){p.res[r]-=state.give[r];o.res[r]+=state.give[r];o.res[r]-=state.get[r];p.res[r]+=state.get[r]}announceResourceGain(o,state.give,"プレイヤー交易");announceResourceGain(p,state.get,"プレイヤー交易");log(`${o.name}：交易 YES（渡す ${tradeBundleText(state.give)} / 貰う ${tradeBundleText(state.get)}）`)}
  else log(`${o.name}：交易 NO`);
  modal.innerHTML=`<h2>交易結果</h2><div class="trade-response ${accept?"yes":"no"}">${accept?"YES":"NO"}</div><p>${accept?`${o.name}が交易を承諾しました。`:`${o.name}が交易を断りました。`}</p><div class="modal-actions"><button id="tradeClose" class="primary">閉じる</button></div>`;
  $("tradeClose").onclick=()=>{backdrop.classList.remove("show");render()};
}

async function humanProduction(){
  if(ui.busy||pendingFreeTradeShipBlocks(me()))return;ui.busy=true;
  const d1=1+Math.floor(Math.random()*6),d2=1+Math.floor(Math.random()*6),sum=d1+d2;S.dice=[d1,d2];S.lastDiceActor=me().name;
  await showDiceAnimation(d1,d2,me().name);
  await resolveProduction(sum,me(),true);S.phase="build";ui.busy=false;render();
}
async function resolveProduction(sum,active,humanActive=false){
  S.players.forEach(p=>p.productionReceived=blankRes());
  log(`${active.name}：生産ダイス ${sum}`);
  if(sum===7)await resolveSeven(active,humanActive);
  else{
    // まず全員分の生産要求を集計する。同じ資源が全員分足りない場合、その資源は誰も受け取らない。
    const demand=S.players.map(()=>blankRes());
    for(const p of S.players){
      for(const c of p.colonies){
        const sys=getSystem(c.system);if(!sys)continue;
        const adj=adjacentPlanetsForColony(c);
        for(const pi of adj){const pl=sys.planets[pi];if(pl&&pl.revealed&&(!pl.special||pl.cleared)&&tokenMatches(pl.token,sum))demand[p.id][pl.type]++}
      }
      for(const r of R)if(demand[p.id][r]>0&&p.friendship.some(c=>c.kind==="prod"&&c.resource===r))demand[p.id][r]++;
    }
    for(const r of R){
      const total=demand.reduce((a,d)=>a+d[r],0);
      if(total===0)continue;
      if(S.supply[r]<total){log(`${RL[r]}：供給不足のため、この出目の生産は全員0枚`);continue}
      for(const p of S.players){const n=demand[p.id][r];if(n){S.supply[r]-=n;p.res[r]+=n;p.productionReceived[r]+=n;log(`${p.name}：${RL[r]} +${n}`)}}
    }
    for(const p of S.players)announceResourceGain(p,p.productionReceived,"生産");
    // 銀河救済基金
    for(const p of S.players){
      if(resTotalObj(p.productionReceived)===0&&hasCard(p,"relief")){
        if(p.human&&humanActive){
          let r;
          if(isLocalPlayer(p))r=await chooseResource("銀河救済基金","惑星から資源を得られなかったため、供給から1枚選べます。");
          else if(window.NET?.online)r=await window.NET.requestChoice(p.id,{kind:"options",title:"銀河救済基金",message:"惑星から資源を得られなかったため、供給から1枚選べます。",options:R.map(x=>({label:`${RI[x]} ${RL[x]}`,value:x}))});
          if(r)takeSupply(p,r,1);
        }else{const r=bestNeededResource(p);takeSupply(p,r,1);log(`${p.name}：銀河救済基金で${RL[r]} +1`)}
      }
    }
  }
  const free=active.vp<=7?2:active.vp<=9?1:0;if(free){drawReserve(active,free);log(`${active.name}：予備資源 ${free}枚`)}
}
function resTotalObj(o){return R.reduce((s,r)=>s+(o[r]||0),0)}
function adjacentPlanetsForColony(c){
  const n=getNode(c.node);
  const byGeometry=(n?.planetAdj||[]).filter(x=>x.system===c.system).map(x=>x.planet);
  if(byGeometry.length>=2)return [...new Set(byGeometry)];
  // 幾何情報が無い旧保存データ向けフォールバック。実盤面のsite順は 0=[0,2], 1=[0,1], 2=[1,2]。
  return c.slot===0?[0,2]:c.slot===1?[0,1]:[1,2];
}
async function resolveSeven(active,humanActive){
  // 惑星生産なし。対象者は半分を供給へ戻す。外交官カードなら閾値12。
  for(const p of S.players){
    const threshold=hasCard(p,"reducedTribute")?12:7;
    if(resTotal(p)>threshold){
      const n=Math.floor(resTotal(p)/2);
      if(p.human&&humanActive){
        if(isLocalPlayer(p))await humanDiscard(p,n);
        else if(window.NET?.online){
          const chosen=await window.NET.requestChoice(p.id,{kind:"discard",title:"資源を捨てる",count:n,res:clone(p.res)});
          if(chosen)for(const r of R)if(chosen[r])returnSupply(p,r,chosen[r]);
        }else discardRandomToSupply(p,n);
      }else discardRandomToSupply(p,n);
      log(`${p.name}：7のため資源${n}枚を返却`);
    }
  }
  const victims=S.players.filter(p=>p.id!==active.id&&resTotal(p)>0);
  if(victims.length){
    let victim;
    if(active.human&&humanActive){const v=await modalPromise('<h2>資源を1枚引く</h2><p>相手を選びます。</p>',victims.map(p=>({label:p.name,value:p.id})));victim=S.players[v]}
    else victim=rnd(victims);
    stealRandom(active,victim,1);log(`${active.name}：${victim.name}からランダムに資源1枚を獲得`);
  }
  // 相手全員に予備資源1枚（左隣から順に相当する順番で処理）
  for(let i=1;i<S.count;i++){const p=S.players[(active.id+i)%S.count];drawReserve(p,1);log(`${p.name}：7の特別補給 1枚`)}
}
async function humanDiscard(p,n){
  const chosen=blankRes();
  return new Promise(resolve=>{
    const m=$("modal"),back=$("modalBackdrop");
    function selectedTotal(){return R.reduce((s,r)=>s+chosen[r],0)}
    function draw(){
      const total=selectedTotal();
      m.innerHTML=`<h2>資源を捨てる</h2><p>7が出ました。<b>${n}枚</b>選択してください。</p>
        <div class="discard-picker-status">選択 <b>${total}</b> / ${n}</div>
        <div class="discard-picker">${R.map(r=>`<div class="discard-picker-row">
          <span class="discard-resource-name">${RI[r]} ${RL[r]} <small>所持 ${p.res[r]}</small></span>
          <button data-discard-r="${r}" data-delta="-1" ${chosen[r]<=0?"disabled":""}>−</button>
          <b>${chosen[r]}</b>
          <button data-discard-r="${r}" data-delta="1" ${chosen[r]>=p.res[r]||total>=n?"disabled":""}>＋</button>
        </div>`).join("")}</div>
        <div class="discard-picker-summary">${R.filter(r=>chosen[r]).map(r=>`${RI[r]}${chosen[r]}`).join("　")||"まだ選択されていません"}</div>
        <div class="modal-actions"><button id="discardReset" ${total===0?"disabled":""}>選択をリセット</button><button id="discardConfirm" class="primary" ${total!==n?"disabled":""}>${n}枚を捨てる</button></div>`;
      m.querySelectorAll("[data-discard-r]").forEach(btn=>btn.onclick=()=>{const r=btn.dataset.discardR,delta=Number(btn.dataset.delta);chosen[r]=Math.max(0,Math.min(p.res[r],chosen[r]+delta));draw()});
      $("discardReset").onclick=()=>{R.forEach(r=>chosen[r]=0);draw()};
      $("discardConfirm").onclick=()=>{if(selectedTotal()!==n)return;for(const r of R)if(chosen[r])returnSupply(p,r,chosen[r]);back.classList.remove("show");resolve()};
    }
    back.classList.add("show");draw();
  });
}
function discardRandomToSupply(p,n){for(let i=0;i<n;i++){const a=R.filter(r=>p.res[r]>0);if(!a.length)break;returnSupply(p,rnd(a),1)}}
function stealRandom(to,from,n=1){const gained=blankRes();for(let i=0;i<n;i++){const a=R.filter(r=>from.res[r]>0);if(!a.length)break;const r=rnd(a);from.res[r]--;to.res[r]++;gained[r]++}announceResourceGain(to,gained,"ランダム資源","private",[to.id,from.id]);return gained}
function bestNeededResource(p){return [...R].sort((a,b)=>p.res[a]-p.res[b])[0]}

function bankRate(p,give){
  if(give==="goods"){
    if(hasCard(p,"goods1")&&!p.turnFlags.goods1)return 1;
    return 2;
  }
  if(p.friendship.some(c=>c.kind==="trade2"&&c.resource===give))return 2;
  return 3;
}
function bankTrade(){
  if(!isMyTurn()||S.phase!=="build"||pendingFreeTradeShipBlocks(me()))return;const p=me(),give=$("bankGive").value,get=$("bankGet").value;if(give===get)return;
  const rate=bankRate(p,give);if(p.res[give]<rate){showToast(`${RL[give]}が${rate}枚必要です`);return}if(S.supply[get]<=0){showToast("供給にその資源がありません");return}
  returnSupply(p,give,rate);takeSupply(p,get,1);if(give==="goods"&&rate===1)p.turnFlags.goods1=true;log(`${p.name}：供給交易 ${RL[give]}${rate} → ${RL[get]}1`);render();
}
async function humanBuild(k){
  if(pendingFreeTradeShipBlocks(me()))return;
  const p=me();if(!canBuild(p,k)||ui.busy)return;ui.busy=true;
  try{
    if(k==="spaceport"){
      const cands=p.colonies.filter(c=>!p.spaceports.some(s=>s.node===c.node));
      const chosenNode=await chooseBoardNode("宇宙港を建設","自分の植民地から宇宙港にする場所を選んでください。",cands.map(c=>c.node),"ここを宇宙港にしていいですか？");
      const chosen=cands.find(c=>c.node===chosenNode);if(!chosen)return;
      payCost(p,BUILD.spaceport.cost);p.stock.shipyards--;p.spaceports.push(clone(chosen));addVP(p,1,"宇宙港へ拡張");markBlockingShipsForNewSpaceport(p,chosen.node);render();return;
    }
    if(["booster","cannon","freight"].includes(k)){
      payCost(p,BUILD[k].cost);p.upgrades[k]++;S.upgradeSupply[k]--;log(`${p.name}：${BUILD[k].name}を増設`);await checkAdjacentSpecialUnlocks(p,true);render();return;
    }
    const type=k==="colonyShip"?"colony":"trade",sites=freeLaunchSites(p);if(!sites.length)return;
    const site=await chooseBoardNode(`${BUILD[k].name}を建設`,`盤面上で光っている空き発進地点を選んでください。`,sites,`ここから${BUILD[k].name}を出していいですか？`,"ship-build");if(!site)return;
    payCost(p,BUILD[k].cost);if(type==="colony")p.stock.colonies--;else p.stock.tradeStations--;p.stock.transports--;
    p.ships.push({id:"s"+(S.nextShipId++),type,node:site,moved:0,stopped:false,startedOnColonySite:false});log(`${p.name}：${BUILD[k].name}を建造`);render();
  }finally{ui.busy=false;render()}
}
function colonyLabel(c){return `${getSystem(c.system).name} / 拠点${c.slot+1}`}
function freeLaunchSites(p){return spaceportSitesFor(p).filter(id=>!isOccupied(id))}
function nodeLabel(id){const n=getNode(id);if(n.homeSite)return `${["α","β","γ","δ"][n.homeSite.home]} / サイト${n.homeSite.slot+1}`;if(n.home!==undefined)return `${["α","β","γ","δ"][n.home]} 発進地点`;if(n.colonySite)return `${S.systems[n.colonySite.system].name} / 植民地サイト${n.colonySite.slot+1}`;return `交点 ${id}`}
function markBlockingShipsForNewSpaceport(p,spNode){
  const sites=B.neigh[spNode]||[];
  for(const o of S.players)if(o.id!==p.id)for(const sh of o.ships)if(sites.includes(sh.node))sh.mustVacateSpaceport=true;
}

async function useFameSale(){
  const p=me();if(!hasCard(p,"fameSale")||p.turnFlags.fameSale||p.res.goods<1||S.fameSupply<=0)return;returnSupply(p,"goods",1);gainFame(p,1);p.turnFlags.fameSale=true;log(`${p.name}：交易品1枚で名声片1個を獲得`);render();
}
async function useHelpingHand(){
  const p=me(),higher=S.players.filter(o=>o.id!==p.id&&o.vp>p.vp);if(higher.length<2||p.turnFlags.helpingHand)return;
  let chosen=[];
  for(let step=0;step<2;step++){
    const avail=higher.filter(o=>!chosen.includes(o.id));
    const id=await modalPromise(`<h2>援助要請</h2><p>自分より勝利点が高いプレイヤーから${step+1}人目を選びます。</p>`,avail.map(o=>({label:`${o.name}（${o.vp}VP / 資源${resTotal(o)}枚）`,value:o.id})));
    chosen.push(id);const o=S.players[id];if(resTotal(o)>0)stealRandom(p,o,1);
  }
  p.turnFlags.helpingHand=true;log(`${p.name}：援助要請を使用`);render();
}
function gainFame(p,n){
  const got=Math.min(n,S.fameSupply);if(got<=0)return 0;const before=Math.floor(p.famePieces/2);p.famePieces+=got;S.fameSupply-=got;const after=Math.floor(p.famePieces/2);if(after!==before)addVP(p,after-before,"名声メダル片");return got;
}
function loseFame(p,n){
  const k=Math.min(n,p.famePieces);if(k<=0)return 0;const before=Math.floor(p.famePieces/2);p.famePieces-=k;S.fameSupply+=k;const after=Math.floor(p.famePieces/2);if(after!==before)addVP(p,after-before,"名声メダル片を失う");return k;
}
function addVP(p,n,why){
  p.vp+=n;log(`${p.name}：${why}（${n>=0?"+":""}${n}VP → ${p.vp}VP）`);
  if(p.id===S.turn&&p.vp>=15){S.winner=p.id;setTimeout(()=>winModal(p),80)}
}
function gainPermanentMedal(p,why){p.permanentMedals++;addVP(p,1,why)}
function loseUpgrade(p,preferred=null){
  let types=["booster","cannon","freight"].filter(k=>p.upgrades[k]>0);if(!types.length)return null;
  let k=preferred&&types.includes(preferred)?preferred:rnd(types);p.upgrades[k]--;S.upgradeSupply[k]++;return k;
}
async function chooseLoseUpgrade(p,title="強化パーツを1個外す"){
  const types=["booster","cannon","freight"].filter(k=>p.upgrades[k]>0);if(!types.length)return null;
  if(!p.human)return loseUpgrade(p);
  let k;
  const opts=types.map(x=>({label:BUILD[x].name,value:x}));
  if(isLocalPlayer(p))k=await modalPromise(`<h2>${title}</h2><p>外すパーツを選びます。</p>`,opts);
  else if(window.NET?.online)k=await window.NET.requestChoice(p.id,{kind:"options",title,message:"外すパーツを選びます。",options:opts});
  return k?loseUpgrade(p,k):null;
}
function freeUpgrade(p,k){if(S.upgradeSupply[k]<=0)return false;const max=k==="freight"?5:6;if(p.upgrades[k]>=max)return false;p.upgrades[k]++;S.upgradeSupply[k]--;return true}

function startHumanFlight(){
  if(pendingFreeTradeShipBlocks(me())){render();return;}
  const p=me();S.phase="flight";S.speed=null;S.baseSpeed=null;ui.selectedShip=null;ui.jumpMode=false;
  for(const sh of p.ships){sh.moved=0;sh.stopped=false;sh.startedOnColonySite=isColonySite(sh.node)}
  // 以前に新宇宙港サイトを塞いでいた場合、このターンは可能なら必ず退去対象。
  render();
}
async function humanShake(){
  if(ui.busy)return;ui.busy=true;const p=me();const balls=shakeBalls();S.balls=balls;S.lastMothershipActor=p.name;const black=balls.some(b=>b.black);S.baseSpeed=black?3:balls.reduce((s,b)=>s+b.v,0);S.speed=S.baseSpeed+totalSpeedBonus(p);S.lastMothershipSpeed=S.speed;
  renderMothershipRollStatus();await showMothershipAnimation(balls,p.name,S.speed);
  if(black){await showEncounterPop();await resolveEncounter(p,true)}
  if(black){S.baseSpeed=3;S.speed=3+totalSpeedBonus(p);S.lastMothershipSpeed=S.speed}
  await tryPlacePendingFreeTradeShips(p,true);ui.busy=false;render();
}
function shakeBalls(){const a=shuffle(BALLS);return [clone(a[0]),clone(a[1])]}
function comparisonRoll(p,mode){
  const bs=shakeBalls(),value=bs.reduce((s,b)=>s+b.v,0)+(mode==="combat"?totalCombatBonus(p):totalSpeedBonus(p));return {balls:bs,value};
}
function relativePlayer(p,rel){
  const n=S.count,off={left:1,right:-1,secondLeft:2,secondRight:-2}[rel]||1;return S.players[(p.id+off+n*4)%n];
}
async function compareAgainst(p,opponentRel,mode,human){
  const o=relativePlayer(p,opponentRel),a=comparisonRoll(p,mode),b=comparisonRoll(o,mode),win=a.value>=b.value;
  if(human)await modalPromise(`<h2>${mode==="combat"?"戦闘力":"速度"}比較</h2><p>${p.name}: ${a.balls.map(x=>x.emoji+x.v).join("+")} +補正 = <b>${a.value}</b></p><p>${o.name}: ${b.balls.map(x=>x.emoji+x.v).join("+")} +補正 = <b>${b.value}</b></p><p class="${win?"good":"bad"}">${win?"成功":"失敗"}</p>`,[{label:"続ける",value:true,primary:true}]);
  return win;
}

function selectShip(id){ui.selectedShip=id;ui.jumpMode=false;render()}
function getReachablePaths(p,sh){
  const result=new Map();
  if(!sh||sh.stopped||S.speed===null||(p.pendingJump||0)>0)return result;
  const rem=Math.max(0,S.speed-sh.moved);if(rem<=0)return result;
  const q=[[sh.node,[sh.node]]],best=new Map([[sh.node,0]]);
  while(q.length){
    const [cur,path]=q.shift(),steps=path.length-1;
    if(steps>=rem)continue;
    for(const nx of B.neigh[cur]||[]){
      const ns=steps+1;
      if(best.has(nx)&&best.get(nx)<=ns)continue;
      best.set(nx,ns);const np=[...path,nx];q.push([nx,np]);
      if(nx!==sh.node&&canEndAt(p,sh,nx,false))result.set(nx,np);
    }
  }
  return result;
}
function shipCanMove(p,sh){return getReachablePaths(p,sh).size>0}
function canStepTo(p,sh,nodeId,remaining){
  if((p.pendingJump||0)>0)return false;
  if(!(B.neigh[sh.node]||[]).includes(nodeId))return false;
  // ドッキング地点・植民地サイト・占有交点も「通過」は可能。停止時だけ canEndAt で判定する。
  return remaining>1 || canEndAt(p,sh,nodeId,false);
}
function canEndAt(p,sh,nodeId,jump=false){
  const n=getNode(nodeId);if(!n)return false;
  if(isOccupied(nodeId,sh.id))return false;
  if(opponentSpaceportSite(p,nodeId))return false;
  if(isDock(nodeId)){
    if(sh.type!=="trade")return false;
    // 交易基地コマは交易船建造時点で船に組み込まれて在庫から減っている。
    // ドッキング時に「手元の交易基地在庫」を再要求すると最後の1隻などが不正に到達不能になるため、
    // ここでは前哨基地の空きと貨物ポッド条件だけを判定する。
    const key=n.outpost,total=totalStations(key);
    return total<5&&p.upgrades.freight>total;
  }
  if(isColonySite(nodeId)){
    if(sh.type==="trade")return false;
    const cs=n.colonySite,sys=S.systems[cs.system];
    // 海賊基地・凍土、3人戦の植民上限は「植民不可」の条件であり、
    // 空いているコロニー交点そのものへの植民船の停止は禁止しない。
    // 実際に植民地へ変換できるかは canColonize() で判定する。
    return sys.colonies[cs.slot]===null;
  }
  if(jump&&sh.type==="trade"&&potentialColonySite(nodeId))return false;
  return true;
}
function potentialColonySite(nodeId){return B.sectors.some(s=>!s.revealed&&s.spokes.includes(nodeId))||isColonySite(nodeId)}
async function moveHumanShip(nodeId,presetPath=null){
  const p=me(),sh=p.ships.find(s=>s.id===ui.selectedShip);if(!sh||sh.stopped||S.speed===null||ui.busy||pendingFreeTradeShipBlocks(p))return;
  const paths=getReachablePaths(p,sh),path=presetPath||paths.get(nodeId);if(!path||path[0]!==sh.node||path[path.length-1]!==nodeId)return;
  const rem=S.speed-sh.moved;if(path.length-1>rem)return;
  ui.busy=true;
  try{
    for(let i=1;i<path.length;i++){
      // 探索などで盤面状態が変わっても、実物と同じく選択済みの航路を順に進む。
      if(!(B.neigh[sh.node]||[]).includes(path[i]))break;
      sh.node=path[i];sh.moved++;
      render();await wait(105);
      const arrival=await processArrival(p,sh,true);
      render();
      if(pendingFreeTradeShipBlocks(p)){
        log(`${p.name}：無料交易船を置ける状態になったため移動を一旦停止`);
        break;
      }
      // 未探索惑星系を発見した場合は、選択済みの自動経路をここで破棄する。
      // 船自体は停止扱いにせず、残り移動力を保持したまま再度行き先を選べる。
      if(arrival?.exploredSystem){
        log(`${p.name}：探索のため移動を一旦停止。残り移動力 ${Math.max(0,S.speed-sh.moved)}`);
        break;
      }
      if(sh.stopped||sh.moved>=S.speed)break;
    }
  }finally{ui.busy=false;render()}
}
async function processArrival(p,sh,human){
  let exploredSystem=false;
  // 未発見セクターを発見
  for(const sec of B.sectors.filter(s=>s.verts.includes(sh.node))){
    if(!sec.revealed){sec.revealed=true;const st=S.sectorState.find(x=>x.id===sec.id);st.revealed=true;log(`${p.name}：未発見セクターを発見`);B=buildBoardFromState()}
    if(sec.content.startsWith("system:")){
      const sys=S.systems["sys"+sec.content.split(":")[1]];
      if(!sys.revealed){
        sys.revealed=true;sys.planets.forEach(pl=>pl.revealed=true);exploredSystem=true;
        log(`${p.name}：${sys.name}を探索。3枚の数字ディスクを公開`);
        await showSpecialPlanetDiscoveries(sys,p.name,human);
      }
    }
  }
  // 現在交点に隣接した特殊惑星のみ即時攻略
  const n=getNode(sh.node);for(const ref of n.planetAdj||[]){const sys=S.systems[ref.system],pl=sys.planets[ref.planet];if(pl.revealed&&pl.special&&!pl.cleared){
    const ok=pl.special.type==="pirate"?totalCombatBonus(p)>=pl.special.need:p.upgrades.freight>=pl.special.need;
    if(ok)await clearSpecialPlanet(p,sys,ref.planet,human);
  }}
  return {exploredSystem};
}
async function checkAdjacentSpecialUnlocks(p,human){
  let clearedAny=false;
  for(const sh of [...p.ships]){
    const n=getNode(sh.node);if(!n)continue;
    for(const ref of n.planetAdj||[]){
      const sys=S.systems[ref.system],pl=sys?.planets?.[ref.planet];if(!pl||!pl.revealed||!pl.special||pl.cleared)continue;
      const ok=pl.special.type==="pirate"?totalCombatBonus(p)>=pl.special.need:p.upgrades.freight>=pl.special.need;
      if(ok){await clearSpecialPlanet(p,sys,ref.planet,human);clearedAny=true}
    }
  }
  return clearedAny;
}
async function showSpecialPlanetDiscoveries(sys,discovererName,human=true){
  const specials=sys.planets.filter(pl=>pl.special&&!pl.cleared);
  for(const pl of specials){
    if(pl.special.type==="pirate"){
      log(`${discovererName}：宇宙海賊出現！ 危険度${pl.special.need} / 必要武器数${pl.special.need}`);
      if(human)await modalPromise(`<div class="discovery-alert pirate-alert"><div class="discovery-kicker">${discovererName} が未探索惑星系を開拓</div><h2>☠ 宇宙海賊出現！</h2><div class="discovery-requirement">危険度 <b>${pl.special.need}</b></div><p>必要武器数：<strong>${pl.special.need}</strong></p></div>`,[{label:"確認",value:true,primary:true}]);
    }else if(pl.special.type==="ice"){
      log(`${discovererName}：凍土発見！ 必要貨物数${pl.special.need}`);
      if(human)await modalPromise(`<div class="discovery-alert ice-alert"><div class="discovery-kicker">${discovererName} が未探索惑星系を開拓</div><h2>❄ 凍土発見！</h2><div class="discovery-requirement">必要貨物数 <b>${pl.special.need}</b></div><p>必要貨物数：<strong>${pl.special.need}</strong></p></div>`,[{label:"確認",value:true,primary:true}]);
    }
  }
}
async function clearSpecialPlanet(p,sys,pi,human){
  const pl=sys.planets[pi],kind=pl.special.type;pl.cleared=true;
  gainPermanentMedal(p,kind==="pirate"?"海賊基地解放メダル":"氷惑星テラフォームメダル");
  if(S.reserveNumbers.length){pl.token=S.reserveNumbers.pop()}else pl.token=rnd([3,9,10,11]);
  log(`${p.name}：${kind==="pirate"?"海賊基地を解放":"氷惑星をテラフォーム"}。新しい生産番号 ${tokenText(pl.token)}`);
  if(human)await modalPromise(`<h2>${kind==="pirate"?"海賊基地を解放":"氷惑星をテラフォーム"}</h2><p>永久に失わない1VPメダルを獲得。惑星の新しい生産番号は <b>${tokenText(pl.token)}</b> です。</p>`,[{label:"続ける",value:true,primary:true}]);
}
function colonySiteBlocked(sys,slot){
  if(sys.colonies[slot]!==null)return true;
  // 未探索中は特殊タイルの正体を表示・判定で漏らさない。到着して探索後に封鎖が確定する。
  if(!sys.revealed)return false;
  const sec=getSectorForSystem(sys.id),nodeId=sec?.colonySiteNodes?.[slot],n=nodeId?getNode(nodeId):null;
  let adj=(n?.planetAdj||[]).filter(x=>x.system===sys.id).map(x=>x.planet);
  if(adj.length<2)adj=slot===0?[0,2]:slot===1?[0,1]:[1,2];
  return [...new Set(adj)].some(i=>sys.planets[i]?.special&&!sys.planets[i].cleared);
}
function canColonize(p,sh,sys,slot){
  if(sh.type!=="colony"||sys.colonies[slot]!==null||colonySiteBlocked(sys,slot))return false;
  if(S.count===3&&sys.colonies.filter(x=>x!==null).length>=2)return false;return true;
}
async function humanColonize(sh){
  const p=me(),cs=getNode(sh.node).colonySite;if(!cs)return;const sys=S.systems[cs.system];if(!canColonize(p,sh,sys,cs.slot))return;
  const ok=await modalPromise('<h2>植民地を設置</h2><p>この植民船を植民地に変えます。輸送船は手元へ戻ります。</p>',[{label:"設置する",value:true,primary:true},{label:"今は置かない",value:false}]);if(!ok)return;
  establishColony(p,sh,sys,cs.slot);ui.selectedShip=null;await tryPlacePendingFreeTradeShips(p,true);render();
}
function establishColony(p,sh,sys,slot){
  const sec=getSectorForSystem(sys.id),nodeId=sec.colonySiteNodes[slot];sys.colonies[slot]=p.id;p.colonies.push({system:sys.id,slot,node:nodeId});p.stock.transports++;p.ships=p.ships.filter(s=>s.id!==sh.id);addVP(p,1,"新しい植民地");log(`${p.name}：${sys.name}に植民地を設置`);
}
function totalStations(key){const order=S.outpostStationOrder?.[key];return Array.isArray(order)&&order.length?order.length:S.players.reduce((s,p)=>s+(p.tradeStations[key]||0),0)}
async function establishTradeStation(p,sh,key,human){
  const total=totalStations(key);if(total>=5||p.upgrades.freight<=total)return false;
  p.tradeStations[key]=(p.tradeStations[key]||0)+1;
  S.outpostStationOrder=S.outpostStationOrder||{green:[],diplomats:[],merchants:[],scientists:[]};
  S.outpostStationOrder[key]=S.outpostStationOrder[key]||[];S.outpostStationOrder[key].push(p.id);
  p.stock.transports++;p.ships=p.ships.filter(s=>s.id!==sh.id);if(ui.selectedShip===sh.id)ui.selectedShip=null;
  await grantFriendshipCard(p,key,human);updateFriendshipMarker(key);log(`${p.name}：${OUTPOSTS[key].name}の前哨基地に交易基地を設置`);await tryPlacePendingFreeTradeShips(p,human);return true;
}
async function grantFriendshipCard(p,key,human){
  const pool=S.friendshipPools[key];if(!pool.length)return;
  let id;if(human){id=await modalPromise(`<h2>${OUTPOSTS[key].name}の友好カード</h2><p>残っているカードから1枚選びます。効果はすぐ有効です。</p>`,pool.map(c=>({label:`${c.name}：${c.desc}`,value:c.id})))}else id=cpuChooseFriendship(p,key,pool).id;
  const ix=pool.findIndex(c=>c.id===id),card=pool.splice(ix,1)[0];card.civ=key;p.friendship.push(card);log(`${p.name}：友好カード「${card.name}」を獲得`);await checkAdjacentSpecialUnlocks(p,human);
}
function cpuChooseFriendship(p,key,pool){
  if(key==="scientists")return [...pool].sort((a,b)=>(b.kind==="speed")-(a.kind==="speed"))[0];
  if(key==="green")return [...pool].sort((a,b)=>p.res[a.resource]-p.res[b.resource])[0];
  return rnd(pool);
}
function updateFriendshipMarker(key){
  const counts=S.players.map(p=>p.tradeStations[key]||0),max=Math.max(...counts);
  if(max<=0)return;
  const leaders=counts.map((n,i)=>n===max?i:-1).filter(i=>i>=0),order=S.outpostStationOrder?.[key]||[];
  // 同数なら、その同数プレイヤーのうち最も小さい番号の交易基地を持つ人が友好マーカーを持つ。
  let holder=leaders[0];
  if(leaders.length>1)holder=[...leaders].sort((a,b)=>{
    const ia=order.indexOf(a),ib=order.indexOf(b);return (ia<0?99:ia)-(ib<0?99:ib);
  })[0];
  const current=S.friendshipMarkerHolder[key];if(current===holder)return;
  if(current!==null&&current!==undefined)addVP(S.players[current],-2,`${OUTPOSTS[key].name}友好マーカーを失う`);
  S.friendshipMarkerHolder[key]=holder;addVP(S.players[holder],2,`${OUTPOSTS[key].name}友好マーカー`);
}
function endHumanTurn(){
  const p=me();if(pendingFreeTradeShipBlocks(p)){render();return}
  const dockedTrade=p.ships.find(s=>s.type==="trade"&&isDock(s.node));
  if(dockedTrade){
    showToast("交易ステーション中心で飛行を終える場合は、先に交易基地を設置してください");
    ui.selectedShip=dockedTrade.id;render();return;
  }
  if(p.ships.some(s=>!canEndAt(p,s,s.node,false))){showToast("停止できない交点に船があります");return}
  // 植民地サイト上に前ターンから残っている植民船は、置かないならこのターン中に離れる必要がある。
  const stuck=p.ships.find(s=>s.startedOnColonySite&&isColonySite(s.node)&&s.moved===0);if(stuck){showToast("前ターンから植民地サイトにいる植民船は、植民するか移動する必要があります");return}
  const blocker=p.ships.find(s=>s.mustVacateSpaceport&&s.moved===0);if(blocker){showToast("新しくできた相手宇宙港の発進地点を塞いでいる船は、このターンに移動する必要があります");return}
  for(const sh of p.ships)if(sh.mustVacateSpaceport&&sh.moved>0)delete sh.mustVacateSpaceport;
  ensurePendingFreeTradeMarkers(p);
  ui.selectedShip=null;ui.jumpMode=false;nextTurn();
}
function drawEncounterCard(){
  if(!S.encounterDeck.length){S.encounterDeck=shuffle(S.encounterDiscard);S.encounterDiscard=[]}
  return S.encounterDeck.shift();
}
function encounterNewLogs(beforeCount){
  const diff=Math.max(0,S.logs.length-beforeCount);return S.logs.slice(0,diff).map(x=>x.msg).reverse();
}
function encounterRelationLabel(rel){
  return {left:"左隣のプレイヤー",right:"右隣のプレイヤー",secondLeft:"左へ2人目のプレイヤー",secondRight:"右へ2人目のプレイヤー"}[rel]||"指定された相手プレイヤー";
}
function encounterEffectText(e){
  const m={
    none:"変化なし",nothing:"変化なし",fame:"名声片を1個得る",fameMinus:"名声片を1個失う",
    resource:"好きな資源を1枚得る",resourceFame:"好きな資源1枚＋名声片1個を得る",
    twoFame:"好きな資源2枚＋名声片1個を得る",choice2fame:"好きな資源2枚＋名声片1個を得る",
    goods:"交易品1枚を得る",goodsFame:"交易品1枚＋名声片1個を得る",foodBad:"食料1枚を得るが名声片1個を失う",
    poverty:"他の各プレイヤーから資源1枚ずつ受け取るが、名声片を2個失う",
    returnGift:"この遭遇で渡した贈り物の資源が返ってくる",
    freeUpgradeFame:"母船強化を1個無料で追加し、名声片1個を得る",
    loseUpgrade:"母船強化を1個外す",upgrade:"母船強化を1個外す",loseUpgradeFame:"母船強化を1個外し、名声片1個を得る",
    stop:"自分の船1隻がこの飛行フェイズ中は移動不可",stopFame:"自分の船1隻が移動不可になり、名声片1個を得る",
    stopFameMinus:"自分の船1隻が移動不可になり、名声片1個を失う",
    freeTrade:"無料交易船1隻を獲得。置けるなら即配置、置けなければマーカーを持ち最初の配置可能機会で必ず配置",
    ore2fame:"鉱石2枚＋名声片1個を得る",carbon2fame:"炭素2枚＋名声片1個を得る",goods2fame:"交易品2枚＋名声片1個を得る",
    stealAllFame:"各相手からランダムに資源1枚ずつ奪い、名声片1個を得る",
    jump:"船1隻が即時スペースジャンプ可能",jumpFame:"船1隻が即時スペースジャンプ可能になり、名声片1個を得る"
  };return m[e]||String(e||"変化なし");
}
function encounterBranch(label,text,cls=""){
  return `<div class="enc-branch ${cls}"><b>${label}</b><span>${text}</span></div>`;
}
function encounterFullSummary(c){
  const title='<div class="encounter-full-title">カード全効果 <small>※公式カード原文ではなく、処理内容を完全に確認できる要約</small></div>';
  let body="";
  if(c.type==="merchantGift"){
    const tables={1:["poverty","foodBad","resourceFame","twoFame"],2:["fameMinus","resource","resourceFame","freeUpgradeFame"],3:["fameMinus","returnGift","fame","goodsFame"],4:["goods","resourceFame","twoFame","returnGift"],5:["stopFameMinus","fameMinus","resourceFame","freeTrade"],6:["stopFameMinus","fameMinus","resourceFame","freeTrade"]};
    body='<div class="enc-rule-note">先に0～3枚の資源を贈り物として供給へ戻します。贈った枚数で結果が決まります。</div>'+tables[c.variant].map((e,i)=>encounterBranch(`${i}枚贈る`,encounterEffectText(e))).join("");
  }else if(c.type==="merchantPirate"){
    body='<div class="enc-rule-note">0～3枚の贈り物を渡した後、相手が偽装海賊だと判明します。</div>'+encounterBranch('戦わない','贈った資源は戻らず、この遭遇は終了')+encounterBranch('戦う',`${encounterRelationLabel(c.opponent)}が海賊役。母船の戦闘力を比較する`)+encounterBranch('勝利','渡した贈り物を回収し、名声片1個を得る','good')+encounterBranch('敗北','自分の船1隻がこのターン移動不可','bad');
  }else if(c.type==="pirateDemand"){
    const payExtra=c.payFame?'さらに名声片1個を失う':c.payStop?'さらに自分の船1隻が移動不可':'';
    body=encounterBranch('資源を渡す',`資源2枚を供給へ戻す${payExtra?`。${payExtra}`:''}`)+encounterBranch('戦う',`${encounterRelationLabel(c.opponent)}が海賊役。母船の戦闘力を比較する`)+encounterBranch('戦闘に勝利',encounterEffectText(c.win),'good')+encounterBranch('戦闘に敗北',encounterEffectText(c.lose),'bad');
  }else if(c.type==="shadyTrade"){
    const decline=c.decline==="fame"?'名声片1個を得て終了':'何も起きず終了';
    const table=c.variant===1?["名声片1個を失う","受け取った2資源を返し、名声片1個を失う","そのまま2資源を保持"]:["そのまま2資源を保持","受け取った2資源を返し、名声片1個を失う","名声片1個を失う"];
    body=encounterBranch('断る',decline)+encounterBranch('取引する','資源1枚を払い、好きな資源2枚を先に受け取る。その後、母船の球2個の数値合計で判定')+encounterBranch('球合計 3以下',table[0])+encounterBranch('球合計 4',table[1])+encounterBranch('球合計 5以上',table[2]);
  }else if(c.type==="pirateRobbery"){
    const decline=c.decline==="fame"?'名声片1個を得て終了':'何も起きず終了';
    const table=c.variant===1?["約束を反故にされ、名声片1個を失う","各相手からランダム資源1枚ずつ奪うが、名声片1個を失う","各相手からランダム資源1枚ずつ奪う"]:["各相手からランダム資源1枚ずつ奪う","各相手からランダム資源1枚ずつ奪うが、名声片1個を失う","約束を反故にされ、名声片1個を失う"];
    body=encounterBranch('断る',decline)+encounterBranch('持ちかけを受ける','資源1枚を払い、その後に母船の球2個の数値合計で結果判定')+encounterBranch('球合計 3以下',table[0])+encounterBranch('球合計 4',table[1])+encounterBranch('球合計 5以上',table[2]);
  }else if(c.type==="pirateEscape"){
    body=encounterBranch('逃走を選ぶ',`${encounterRelationLabel(c.opponent)}と速度補正を比較。自分が同値以上なら逃走成功${c.flee==="fameMinus"?'（名声片1個を失う）':'（追加損失なし）'}。条件を満たせない場合は戦闘へ`)+encounterBranch('戦う／逃走失敗',`${encounterRelationLabel(c.opponent)}が海賊役。母船の戦闘力を比較`)+encounterBranch('戦闘に勝利',encounterEffectText(c.win),'good')+encounterBranch('戦闘に敗北',encounterEffectText(c.lose),'bad');
  }else if(c.type==="distressSpeed"){
    body=encounterBranch('救助しない',c.decline==="fameMinus"?'名声片1個を失う':'変化なし')+encounterBranch('救助する',`${encounterRelationLabel(c.opponent)}と母船速度を比較`)+encounterBranch('救助成功',encounterEffectText(c.win),'good')+encounterBranch('救助失敗',encounterEffectText(c.lose),'bad');
  }else if(c.type==="rescueCombat"){
    body=encounterBranch('救助しない',c.decline==="fameMinus"?'名声片1個を失う':'変化なし')+encounterBranch('救助する',`${encounterRelationLabel(c.opponent)}が海賊役。母船の戦闘力を比較`)+encounterBranch('救助成功',encounterEffectText(c.win),'good')+encounterBranch('救助失敗',encounterEffectText(c.lose),'bad');
  }else if(c.type==="wormhole"){
    body=encounterBranch('試さない','このカードでは結果を解決せず、ただちに別の遭遇カードを1枚引く')+encounterBranch('ジャンプを試す',`${encounterRelationLabel(c.opponent)}と母船速度を比較`)+encounterBranch('成功','船1隻が即時スペースジャンプ可能','good')+encounterBranch('失敗',encounterEffectText(c.fail),'bad');
  }else if(c.type==="travelerGift"){
    const tables={1:["loseUpgradeFame","fame","fame","jump"],2:["none","fame","fame","freeTrade"],3:["fameMinus","fame","fame","jumpFame"]};
    body='<div class="enc-rule-note">旅人へ0～3枚の資源を寄付します。寄付枚数で結果が決まります。</div>'+tables[c.variant].map((e,i)=>encounterBranch(`${i}枚寄付`,encounterEffectText(e))).join("");
  }else if(c.type==="wear"){
    body=encounterBranch('全員','母船強化が8個を超えているプレイヤーは、強化を1個外す')+encounterBranch('その後','遭遇山札全体を混ぜ直し、ただちに新しい遭遇カードを引く');
  }else if(c.type==="wearCouncil"){
    body=encounterBranch('全員','母船強化が6個を超えているプレイヤーは、強化を1個外す')+encounterBranch('銀河評議会','貨物ポッド最多のプレイヤー全員が名声片1個を得る')+encounterBranch('その後','遭遇山札全体を混ぜ直し、ただちに新しい遭遇カードを引く');
  }
  return `<div class="encounter-full-guide">${title}${body}</div>`;
}
async function showEncounterFinished(card,lines,actorName=""){
  const clean=(lines||[]).filter(Boolean);const body=clean.length?clean.map(x=>`<div class="encounter-finish-line">${x}</div>`).join(""):'<div class="encounter-finish-line">特に変化はありませんでした。</div>';
  await modalPromise(`<div class="encounter-no">遭遇カード No.${card.n}</div><h2 class="encounter-title">${encounterTitle(card)}</h2>${actorName?`<div class="encounter-actor">${actorName} が引いた遭遇</div>`:""}<div class="encounter-card-recap"><div class="encounter-card-recap-title">今回引いたカード</div><div>${encounterIntro(card)}</div></div>${encounterFullSummary(card)}<div class="encounter-finish"><div class="encounter-finish-title">今回の選択・解決結果</div>${body}</div>`,[{label:"閉じる",value:true,primary:true}]);
}
async function resolveEncounter(p,human,forcedDepth=0){
  if(forcedDepth>4)return;
  const no=drawEncounterCard(),card=ENCOUNTERS.find(c=>c.n===no);S.currentEncounter=no;
  const encounterLogStart=S.logs.length;
  if(human)await modalPromise(`<div class="encounter-no">ENCOUNTER</div><h2 class="encounter-title">${encounterTitle(card)}</h2><div class="encounter-box">${encounterIntro(card)}</div>`,[{label:"判断へ",value:true,primary:true}]);
  let drawAgain=false;
  if(card.type==="merchantGift")await encounterMerchantGift(p,card,human);
  else if(card.type==="merchantPirate")await encounterMerchantPirate(p,card,human);
  else if(card.type==="pirateDemand")await encounterPirateDemand(p,card,human);
  else if(card.type==="shadyTrade")await encounterShadyTrade(p,card,human);
  else if(card.type==="pirateRobbery")await encounterPirateRobbery(p,card,human);
  else if(card.type==="pirateEscape")await encounterPirateEscape(p,card,human);
  else if(card.type==="distressSpeed")await encounterDistress(p,card,human);
  else if(card.type==="rescueCombat")await encounterRescue(p,card,human);
  else if(card.type==="wormhole")drawAgain=await encounterWormhole(p,card,human);
  else if(card.type==="travelerGift")await encounterTraveler(p,card,human);
  else if(card.type==="wear")drawAgain=await encounterWear(p,card,human,false);
  else if(card.type==="wearCouncil")drawAgain=await encounterWear(p,card,human,true);
  await showEncounterFinished(card,encounterNewLogs(encounterLogStart),p.name);
  log(`${p.name}：遭遇を解決`);S.encounterDiscard.push(no);S.currentEncounter=null;
  if(drawAgain)await resolveEncounter(p,human,forcedDepth+1);
}
function encounterTitle(c){
  return {merchantGift:"商船との遭遇",merchantPirate:"偽装商船",pirateDemand:"宇宙海賊の要求",shadyTrade:"海賊の取引",pirateRobbery:"海賊の持ちかけ",pirateEscape:"海賊襲撃",distressSpeed:"救難信号",rescueCombat:"海賊に襲われた船",wormhole:"ワームホール",travelerGift:"旅人たち",wear:"摩耗事故",wearCouncil:"摩耗事故と銀河評議会"}[c.type]||"遭遇";
}
function encounterIntro(c){
  if(c.type==="merchantGift")return "商人が贈り物を求めています。0～3枚の資源を先に渡してから結果が決まります。";
  if(c.type==="merchantPirate")return "商人を名乗る船に贈り物を渡したところ、正体が判明します。";
  if(c.type==="pirateDemand")return "海賊が資源2枚を要求しています。支払うか戦うかを選びます。";
  if(c.type==="shadyTrade")return "海賊が資源1枚と引き換えに、別の資源2枚を提示しています。";
  if(c.type==="pirateRobbery")return "海賊が、資源1枚を払えば他の全員から資源を奪うと持ちかけています。";
  if(c.type==="pirateEscape")return "海賊に襲撃されました。まず逃走を試みるか判断します。";
  if(c.type==="distressSpeed")return "恒星へ落下しかけている船から救難信号が届きました。救助するなら速度を競います。";
  if(c.type==="rescueCombat")return "海賊に襲われている船を発見しました。救助するなら戦闘です。";
  if(c.type==="wormhole")return "ワームホールを発見しました。ジャンプを試みるか判断します。";
  if(c.type==="travelerGift")return "銀河で敬われる旅人たちが寄付を求めています。0～3枚を渡します。";
  return "全プレイヤーに影響する整備・銀河イベントです。";
}
async function chooseOffer(p,max,human,title){
  const maxPay=Math.min(max,resTotal(p));let n;
  if(human)n=await modalPromise(`<h2>${title}</h2><p>何枚渡しますか？</p>`,Array.from({length:maxPay+1},(_,i)=>({label:`${i}枚`,value:i,primary:i===Math.min(2,maxPay)})));
  else n=Math.min(maxPay,p.vp<8?2:1+Math.floor(Math.random()*3));
  const cards=await payAnyResources(p,n,human);return {n,cards};
}
async function payAnyResources(p,n,human){
  const paid=[];
  for(let i=0;i<n;i++){
    const av=R.filter(r=>p.res[r]>0);if(!av.length)break;let r;
    if(human)r=await modalPromise(`<h2>資源を渡す</h2><div class="counter">${i+1}/${n}</div>`,av.map(x=>({label:`${RI[x]} ${RL[x]} (${p.res[x]})`,value:x})));
    else r=rnd(av);returnSupply(p,r,1);paid.push(r);
  }
  return paid;
}
async function chooseResource(title,desc="資源を1枚選びます。"){
  const available=R.filter(r=>S.supply[r]>0);if(!available.length)return null;
  return modalPromise(`<h2>${title}</h2><p>${desc}</p>`,available.map(r=>({label:`${RI[r]} ${RL[r]}`,value:r})));
}
async function gainChoiceResources(p,n,human){
  for(let i=0;i<n;i++){let r=human?await chooseResource("報酬を選択",`供給から資源を選択（${i+1}/${n}）`):bestNeededResource(p);if(!r)break;takeSupply(p,r,1)}
}
async function encounterMerchantGift(p,c,human){
  const gift=await chooseOffer(p,3,human,"商人への贈り物");
  const tables={
    1:["poverty","foodBad","resourceFame","twoFame"],
    2:["fameMinus","resource","resourceFame","freeUpgradeFame"],
    3:["fameMinus","returnGift","fame","goodsFame"],
    4:["goods","resourceFame","twoFame","returnGift"],
    5:["stopFameMinus","fameMinus","resourceFame","freeTrade"],
    6:["stopFameMinus","fameMinus","resourceFame","freeTrade"]
  };
  await applyEncounterEffect(p,tables[c.variant][gift.n]||"nothing",human,gift.cards);
}
async function encounterMerchantPirate(p,c,human){
  const gift=await chooseOffer(p,3,human,"商人への贈り物");
  const attack=human?await modalPromise('<h2>正体は海賊でした</h2><p>攻撃しますか？</p>',[{label:"攻撃する",value:true,primary:true},{label:"見逃す",value:false}]):true;
  if(!attack){log(`${p.name}：海賊を見逃し、贈り物は戻らなかった`);return}
  const win=await compareAgainst(p,c.opponent,"combat",human);
  if(win){for(const r of gift.cards)takeSupply(p,r,1);gainFame(p,1);log(`${p.name}：偽装海賊に勝利し、贈り物を回収＋名声`) }
  else{await stopOneShip(p,human);log(`${p.name}：偽装海賊に敗北し、船1隻が停止`) }
}
async function encounterPirateDemand(p,c,human){
  const can=resTotal(p)>=2, pay=can&&(human?await modalPromise('<h2>海賊の要求</h2><p>資源2枚を渡しますか？ 渡さなければ戦闘です。</p>',[{label:"2枚渡す",value:true},{label:"戦う",value:false,primary:true}]):Math.random()<.35);
  if(pay){await payAnyResources(p,2,human);if(c.payFame)loseFame(p,1);if(c.payStop)await stopOneShip(p,human);log(`${p.name}：海賊へ資源2枚を支払った`);return}
  const win=await compareAgainst(p,c.opponent,"combat",human);await applyEncounterEffect(p,win?c.win:c.lose,human);log(`${p.name}：海賊戦 ${win?"勝利":"敗北"}`);
}
function encounterShakeTier(){
  const balls=shakeBalls(),sum=balls.reduce((a,b)=>a+b.v,0);return {balls,sum,tier:sum<=3?0:sum===4?1:2};
}
async function encounterShadyTrade(p,c,human){
  const can=resTotal(p)>=1,accept=can&&(human?await modalPromise('<h2>怪しい取引</h2><p>資源1枚を渡し、好きな資源2枚を受け取りますか？</p>',[{label:"取引する",value:true,primary:true},{label:"断る",value:false}]):Math.random()<.55);
  if(!accept){if(c.decline==="fame")gainFame(p,1);log(`${p.name}：怪しい取引を断った`);return}
  await payAnyResources(p,1,human);const gained=[];
  for(let i=0;i<2;i++){const r=human?await chooseResource("取引で受け取る資源",`資源を選択（${i+1}/2）`):bestNeededResource(p);if(r&&takeSupply(p,r,1))gained.push(r)}
  const roll=encounterShakeTier();
  if(human)await modalPromise(`<h2>取引後の母船判定</h2><p>${roll.balls.map(b=>b.emoji+b.v).join(" + ")} → 球の合計 <b>${roll.sum}</b></p>`,[{label:"結果を見る",value:true,primary:true}]);
  const table=c.variant===1?["fameMinus","confiscate","none"]:["none","confiscate","fameMinus"];
  const out=table[roll.tier];
  if(out==="fameMinus")loseFame(p,1);
  if(out==="confiscate"){for(const r of gained){if(p.res[r]>0)returnSupply(p,r,1)}loseFame(p,1)}
  log(`${p.name}：海賊との取引結果を処理`);
}
async function encounterPirateRobbery(p,c,human){
  const accept=resTotal(p)>0&&(human?await modalPromise('<h2>海賊の持ちかけ</h2><p>資源1枚を払い、他の全員から資源1枚ずつ奪わせますか？</p>',[{label:"受ける",value:true,primary:true},{label:"断る",value:false}]):Math.random()<.55);
  if(!accept){if(c.decline==="fame")gainFame(p,1);log(`${p.name}：海賊の持ちかけを断った`);return}
  await payAnyResources(p,1,human);const roll=encounterShakeTier();
  if(human)await modalPromise(`<h2>海賊の母船判定</h2><p>${roll.balls.map(b=>b.emoji+b.v).join(" + ")} → 球の合計 <b>${roll.sum}</b></p>`,[{label:"結果を見る",value:true,primary:true}]);
  const table=c.variant===1?["cheat","stealFame","steal"]:["steal","stealFame","cheat"];
  const out=table[roll.tier];
  if(out==="steal"||out==="stealFame")for(const o of S.players)if(o.id!==p.id&&resTotal(o)>0)stealRandom(p,o,1);
  if(out==="stealFame"||out==="cheat")loseFame(p,1);
  log(`${p.name}：海賊の持ちかけの結果を処理`);
}
async function encounterPirateEscape(p,c,human){
  const o=relativePlayer(p,c.opponent),canEscape=totalSpeedBonus(p)>=totalSpeedBonus(o);
  const flee=human?await modalPromise('<h2>海賊襲撃</h2><p>逃走を試みますか？</p>',[{label:"逃走を試す",value:true},{label:"戦う",value:false,primary:true}]):canEscape;
  if(flee&&canEscape){if(c.flee==="fameMinus")loseFame(p,1);log(`${p.name}：海賊から逃走成功`);return}
  const win=await compareAgainst(p,c.opponent,"combat",human);await applyEncounterEffect(p,win?c.win:c.lose,human);log(`${p.name}：海賊戦 ${win?"勝利":"敗北"}`);
}
async function encounterDistress(p,c,human){
  const yes=human?await modalPromise('<h2>救難信号</h2><p>救助へ向かいますか？</p>',[{label:"救助する",value:true,primary:true},{label:"見送る",value:false}]):Math.random()<.72;
  if(!yes){if(c.decline==="fameMinus")loseFame(p,1);log(`${p.name}：救難信号を見送った`);return}
  const win=await compareAgainst(p,c.opponent,"speed",human);await applyEncounterEffect(p,win?c.win:c.lose,human);log(`${p.name}：救助任務 ${win?"成功":"失敗"}`);
}
async function encounterRescue(p,c,human){
  const yes=human?await modalPromise('<h2>救助判断</h2><p>海賊に襲われている船を救助しますか？</p>',[{label:"救助する",value:true,primary:true},{label:"離脱する",value:false}]):Math.random()<.75;
  if(!yes){if(c.decline==="fameMinus")loseFame(p,1);log(`${p.name}：救助を見送った`);return}
  const win=await compareAgainst(p,c.opponent,"combat",human);await applyEncounterEffect(p,win?c.win:c.lose,human);log(`${p.name}：救助戦 ${win?"成功":"失敗"}`);
}
async function encounterWormhole(p,c,human){
  const yes=human?await modalPromise('<h2>ワームホール</h2><p>スペースジャンプを試みますか？</p>',[{label:"試みる",value:true,primary:true},{label:"やめる",value:false}]):Math.random()<.7;
  if(!yes){log(`${p.name}：ワームホールを避けた。別の遭遇へ`);return true}
  const win=await compareAgainst(p,c.opponent,"speed",human);if(win)grantSpaceJump(p);else await applyEncounterEffect(p,c.fail,human);return false;
}
async function encounterTraveler(p,c,human){
  const gift=await chooseOffer(p,3,human,"旅人への寄付");
  const tables={
    1:["loseUpgradeFame","fame","fame","jump"],
    2:["none","fame","fame","freeTrade"],
    3:["fameMinus","fame","fame","jumpFame"]
  };
  await applyEncounterEffect(p,tables[c.variant][gift.n]||"none",human,gift.cards);
}
async function encounterWear(p,c,human,council){
  for(const o of S.players){
    if(o.upgrades.booster+o.upgrades.cannon+o.upgrades.freight<=c.threshold)continue;
    const title=o.human&&!human?"CPUの遭遇効果：あなたの強化を1個外してください":"摩耗：強化を1個外す";
    await chooseLoseUpgrade(o,title);
  }
  if(council){const max=Math.max(...S.players.map(o=>o.upgrades.freight));S.players.filter(o=>o.upgrades.freight===max).forEach(o=>gainFame(o,1));log("銀河評議会：貨物ポッド最多のプレイヤーが名声片1個を獲得")}
  // 全遭遇カードを混ぜ直してから新しい1枚を引く
  S.encounterDeck=shuffle([...S.encounterDeck,...S.encounterDiscard.map(n=>n),c.n]);S.encounterDiscard=[];log("遭遇山札を全てシャッフル");return true;
}
async function applyEncounterEffect(p,e,human,giftCards=[]){
  if(!e||e==="none"||e==="nothing")return;
  if(e==="fame")gainFame(p,1);
  else if(e==="fameMinus")loseFame(p,1);
  else if(e==="resource")await gainChoiceResources(p,1,human);
  else if(e==="resourceFame"){await gainChoiceResources(p,1,human);gainFame(p,1)}
  else if(e==="twoFame"||e==="choice2fame"){await gainChoiceResources(p,2,human);gainFame(p,1)}
  else if(e==="goods")takeSupply(p,"goods",1);
  else if(e==="goodsFame"){takeSupply(p,"goods",1);gainFame(p,1)}
  else if(e==="foodBad"){takeSupply(p,"food",1);loseFame(p,1)}
  else if(e==="poverty"){await opponentsGiveChosenResource(p,!human);loseFame(p,2)}
  else if(e==="returnGift"){for(const r of giftCards)takeSupply(p,r,1)}
  else if(e==="freeUpgradeFame"){await freeUpgradeChoice(p,human);gainFame(p,1)}
  else if(e==="loseUpgrade")await chooseLoseUpgrade(p);
  else if(e==="upgrade")await chooseLoseUpgrade(p);
  else if(e==="loseUpgradeFame"){await chooseLoseUpgrade(p);gainFame(p,1)}
  else if(e==="stop")await stopOneShip(p,human);
  else if(e==="stopFame"){await stopOneShip(p,human);gainFame(p,1)}
  else if(e==="stopFameMinus"){await stopOneShip(p,human);loseFame(p,1)}
  else if(e==="freeTrade")await awardFreeTradeShip(p,human);
  else if(e==="ore2fame"){takeSupply(p,"ore",2);gainFame(p,1)}
  else if(e==="carbon2fame"){takeSupply(p,"carbon",2);gainFame(p,1)}
  else if(e==="goods2fame"){takeSupply(p,"goods",2);gainFame(p,1)}
  else if(e==="stealAllFame"){for(const o of S.players)if(o.id!==p.id&&resTotal(o)>0)stealRandom(p,o,1);gainFame(p,1)}
  else if(e==="jump")grantSpaceJump(p);
  else if(e==="jumpFame"){grantSpaceJump(p);gainFame(p,1)}
}
async function opponentsGiveChosenResource(receiver,cpuEncounter=false){
  for(let step=1;step<S.count;step++){
    const o=S.players[(receiver.id+step)%S.count];if(resTotal(o)<=0)continue;
    let r;
    if(o.human){
      const opts=R.filter(x=>o.res[x]>0).map(x=>({label:`${RI[x]} ${RL[x]} (${o.res[x]})`,value:x}));
      if(isLocalPlayer(o))r=await modalPromise(`<h2>商人遭遇</h2><p>${o.name}：${receiver.name}へ渡す資源を1枚選びます。</p>`,opts);
      else if(window.NET?.online)r=await window.NET.requestChoice(o.id,{kind:"options",title:"商人遭遇",message:`${receiver.name}へ渡す資源を1枚選びます。`,options:opts});
    }else r=[...R].filter(x=>o.res[x]>0).sort((a,b)=>o.res[b]-o.res[a])[0];
    o.res[r]--;receiver.res[r]++;announceResourceGain(receiver,oneGain(r,1),"遭遇");
  }
}
async function freeUpgradeChoice(p,human){
  const av=["booster","cannon","freight"].filter(k=>S.upgradeSupply[k]>0&&p.upgrades[k]<(k==="freight"?5:6));if(!av.length)return;
  const k=human?await modalPromise('<h2>無料強化</h2><p>追加する強化を選びます。</p>',av.map(x=>({label:BUILD[x].name,value:x}))):rnd(av);freeUpgrade(p,k);log(`${p.name}：無料で${BUILD[k].name}を追加`);await checkAdjacentSpecialUnlocks(p,human);
}
async function stopOneShip(p,human){
  const eligible=p.ships.filter(s=>!s.mustVacateSpaceport);if(!eligible.length)return;let id;
  if(human){const nodes=eligible.map(s=>s.node);let nodeId;
    if(isLocalPlayer(p))nodeId=await chooseBoardNode("休ませる船を選択","この飛行フェイズに移動できなくなる船を、盤面上の強調表示から選んでください。",nodes,"この船を休ませますか？","ship");
    else if(window.NET?.online)nodeId=await window.NET.requestChoice(p.id,{kind:"board",style:"ship",title:"休ませる船を選択",message:"この飛行フェイズに移動できなくなる船を、盤面上の強調表示から選んでください。",ids:nodes,confirmText:"この船を休ませますか？"});
    id=eligible.find(s=>s.node===nodeId)?.id;
  }else id=rnd(eligible).id;
  const sh=p.ships.find(s=>s.id===id);if(sh){sh.stopped=true;log(`${p.name}：${sh.type==="colony"?"植民船":"交易船"}1隻がこの飛行フェイズ中は移動不可`)}
}
function grantSpaceJump(p){p.pendingJump=(p.pendingJump||0)+1;log(`${p.name}：スペースジャンプ権を獲得`)}
async function awardFreeTradeShip(p,human){
  p.pendingFreeTradeShips++;
  log(`${p.name}：無料交易船を獲得`);
  await showCenterNotice(`${p.name}が無料交易船を獲得`,`置ける状態になったら即座に配置`);
  // 人間は「現在状況」の強制ボタンから盤面上の発進地点を選ぶ。CPUは置けるなら即配置。
  if(!human)await tryPlacePendingFreeTradeShips(p,false);
  render();
}
async function tryPlacePendingFreeTradeShips(p,human){
  if(human){render();return false}
  let placed=false;
  while(canPlacePendingFreeTradeShip(p)){
    const sites=freeLaunchSites(p),site=rnd(sites);
    p.stock.transports--;p.stock.tradeStations--;p.ships.push({id:"s"+(S.nextShipId++),type:"trade",node:site,moved:0,stopped:false,startedOnColonySite:false});p.pendingFreeTradeShips--;placed=true;
    if((p.tradeShipMarkersHeld||0)>0){p.tradeShipMarkersHeld--;S.tradeShipMarkers=Math.min(6,S.tradeShipMarkers+1)}
    log(`${p.name}：遭遇報酬の交易船を無料配置`);
  }
  return placed;
}

function beginHumanJump(){
  const p=me();if(pendingFreeTradeShipBlocks(p)||(p.pendingJump||0)<=0||!p.ships.length)return;
  if(ui.selectedShip&&p.ships.some(s=>s.id===ui.selectedShip&&!s.stopped)){ui.jumpMode=true;render();return}
  modalPromise('<h2>スペースジャンプ</h2><p>ジャンプさせる船を選びます。ジャンプ後、その船の通常移動は終了します。</p>',p.ships.filter(s=>!s.stopped).map(s=>({label:`${s.type==="colony"?"植民船":"交易船"} @ ${nodeLabel(s.node)}`,value:s.id}))).then(id=>{ui.selectedShip=id;ui.jumpMode=true;render()});
}
async function spaceJumpHuman(nodeId){
  const p=me(),sh=p.ships.find(s=>s.id===ui.selectedShip);if(!sh||!ui.jumpMode||(p.pendingJump||0)<=0||!canEndAt(p,sh,nodeId,true))return;
  ui.busy=true;sh.node=nodeId;sh.stopped=true;sh.moved=S.speed;p.pendingJump--;ui.jumpMode=false;
  await processArrival(p,sh,true);
  if(isDock(nodeId)&&sh.type==="trade"&&p.ships.includes(sh))await establishTradeStation(p,sh,getNode(nodeId).outpost,true);
  log(`${p.name}：スペースジャンプを使用`);ui.busy=false;render();
}

function validCpuColonyTargets(p,sh){
  const out=[];
  for(const sys of Object.values(S.systems)){
    const sec=getSectorForSystem(sys.id);if(!sec)continue;
    for(let slot=0;slot<3;slot++)if(canColonize(p,sh,sys,slot))out.push(sec.colonySiteNodes[slot]);
  }
  return out;
}
function validCpuTradeTargets(p){
  return B.sectors.filter(s=>s.outpost&&totalStations(s.outpost)<5&&p.upgrades.freight>totalStations(s.outpost)).map(s=>s.dockNode).filter(Boolean);
}
function bfsPath(start,goal,forShip=null){
  if(start===goal)return [start];const q=[[start]],seen=new Set([start]);
  while(q.length){const path=q.shift(),cur=path[path.length-1];for(const nx of B.neigh[cur]||[]){
    if(seen.has(nx))continue;seen.add(nx);const next=[...path,nx];if(nx===goal)return next;q.push(next)
  }}return null;
}
function nearestPath(start,targets){
  let best=null;for(const t of targets){const p=bfsPath(start,t);if(p&&(!best||p.length<best.length))best=p}return best;
}
async function cpuBuildOne(p,k){
  if(!canBuild(p,k))return false;
  if(k==="spaceport"){
    const c=p.colonies.find(c=>!p.spaceports.some(s=>s.node===c.node));if(!c)return false;
    payCost(p,BUILD[k].cost);p.stock.shipyards--;p.spaceports.push(clone(c));addVP(p,1,"宇宙港へ拡張");markBlockingShipsForNewSpaceport(p,c.node);return true;
  }
  payCost(p,BUILD[k].cost);
  if(["booster","cannon","freight"].includes(k)){p.upgrades[k]++;S.upgradeSupply[k]--;log(`${p.name}：${BUILD[k].name}を増設`);await checkAdjacentSpecialUnlocks(p,false);return true}
  const sites=freeLaunchSites(p);if(!sites.length)return false;
  const type=k==="colonyShip"?"colony":"trade";if(type==="colony")p.stock.colonies--;else p.stock.tradeStations--;p.stock.transports--;
  p.ships.push({id:"s"+(S.nextShipId++),type,node:rnd(sites),moved:0,stopped:false,startedOnColonySite:false});log(`${p.name}：${BUILD[k].name}を建造`);return true;
}
function cpuTryBankTrade(p,want){
  if(S.supply[want]<=0)return false;
  const gives=[...R].filter(r=>r!==want).sort((a,b)=>p.res[b]-p.res[a]);
  for(const g of gives){const rate=bankRate(p,g);if(p.res[g]>=rate){returnSupply(p,g,rate);takeSupply(p,want,1);if(g==="goods"&&rate===1)p.turnFlags.goods1=true;log(`${p.name}：供給交易 ${RL[g]}${rate} → ${RL[want]}1`);return true}}
  return false;
}
function cpuPrepareCost(p,cost){
  let guard=10;while(!canPay(p,cost)&&guard--){const missing=Object.keys(cost).find(r=>p.res[r]<(cost[r]||0));if(!missing||!cpuTryBankTrade(p,missing))break}return canPay(p,cost);
}
async function cpuBuildPhase(p){
  // 友好カードの能動効果
  if(hasCard(p,"fameSale")&&!p.turnFlags.fameSale&&p.res.goods>0&&S.fameSupply>0&&Math.random()<.75){returnSupply(p,"goods",1);gainFame(p,1);p.turnFlags.fameSale=true;log(`${p.name}：交易品で名声片を獲得`)}
  const higher=S.players.filter(o=>o.id!==p.id&&o.vp>p.vp).sort((a,b)=>resTotal(b)-resTotal(a));if(hasCard(p,"helpingHand")&&!p.turnFlags.helpingHand&&higher.length>=2){if(resTotal(higher[0]))stealRandom(p,higher[0],1);if(resTotal(higher[1]))stealRandom(p,higher[1],1);p.turnFlags.helpingHand=true;log(`${p.name}：援助要請を使用`)}
  await tryPlacePendingFreeTradeShips(p,false);
  // 優先度：船が少ない→植民/交易、必要能力→強化、余裕があれば宇宙港
  const plan=[];
  if(p.ships.length<2)plan.push(p.stock.colonies>0?"colonyShip":"tradeShip");
  if(p.upgrades.booster<3)plan.push("booster");
  if(p.upgrades.freight<2)plan.push("freight");
  if(p.upgrades.cannon<2)plan.push("cannon");
  if(p.stock.transports>0&&p.stock.tradeStations>0)plan.push("tradeShip");
  if(p.stock.transports>0&&p.stock.colonies>0)plan.push("colonyShip");
  if(p.spaceports.length<2)plan.push("spaceport");
  let built=0;
  for(const k of plan){if(built>=3)break;if(!canPay(p,BUILD[k].cost))cpuPrepareCost(p,BUILD[k].cost);if(await cpuBuildOne(p,k))built++}
}
async function cpuUseJump(p){
  if((p.pendingJump||0)<=0||!p.ships.length)return false;
  const ships=p.ships.filter(s=>!s.stopped&&!s.mustVacateSpaceport);if(!ships.length)return false;
  for(const sh of ships){const targets=sh.type==="colony"?validCpuColonyTargets(p,sh):validCpuTradeTargets(p);const target=targets.find(id=>canEndAt(p,sh,id,true));if(target){sh.node=target;sh.stopped=true;sh.moved=S.speed||0;p.pendingJump--;await processArrival(p,sh,false);if(sh.type==="colony"&&p.ships.includes(sh)){const cs=getNode(target).colonySite,sys=S.systems[cs.system];if(canColonize(p,sh,sys,cs.slot))establishColony(p,sh,sys,cs.slot)}else if(sh.type==="trade"&&p.ships.includes(sh)&&isDock(target))await establishTradeStation(p,sh,getNode(target).outpost,false);log(`${p.name}：スペースジャンプを使用`);return true}}
  return false;
}
async function cpuMoveShip(p,sh){
  if(!p.ships.includes(sh)||sh.stopped)return;
  // 前ターンから植民地サイトにいて建設できるなら即植民。
  if(isColonySite(sh.node)&&sh.type==="colony"){
    const cs=getNode(sh.node).colonySite,sys=S.systems[cs.system];
    if(canColonize(p,sh,sys,cs.slot)){establishColony(p,sh,sys,cs.slot);return}
  }
  let guard=Math.max(6,(S.speed||0)+4);
  while(p.ships.includes(sh)&&!sh.stopped&&sh.moved<(S.speed||0)&&guard--){
    let targets=sh.type==="colony"?validCpuColonyTargets(p,sh):validCpuTradeTargets(p);
    // 植民先が無ければ未探索セクター周辺を探索目標にする。
    if(sh.type==="colony"&&!targets.length)targets=B.sectors.filter(s=>!s.revealed).flatMap(s=>s.verts);
    if(!targets.length)break;
    const path=nearestPath(sh.node,targets);
    if(!path||path.length<2)break;
    const nid=path[1];
    if(!(B.neigh[sh.node]||[]).includes(nid))break;
    sh.node=nid;sh.moved++;
    const arrival=await processArrival(p,sh,false);
    await tryPlacePendingFreeTradeShips(p,false);
    if(!p.ships.includes(sh))return;
    // 探索でBが再構築された場合は、古い経路を捨てて現在位置から再計算する。
    if(arrival?.exploredSystem){
      log(`${p.name}：探索後、残り移動力 ${Math.max(0,(S.speed||0)-sh.moved)} で航路を再計算`);
    }
    if(sh.type==="colony"&&isColonySite(sh.node)){
      const cs=getNode(sh.node).colonySite,sys=S.systems[cs.system];
      if(canColonize(p,sh,sys,cs.slot)){establishColony(p,sh,sys,cs.slot);return}
    }
    if(sh.type==="trade"&&isDock(sh.node)&&canEndAt(p,sh,sh.node,false)){
      await establishTradeStation(p,sh,getNode(sh.node).outpost,false);return
    }
  }
  // 最終地点が停止不可なら、残り移動力内で停止可能な隣接点へ退避を試みる。
  if(p.ships.includes(sh)&&!canEndAt(p,sh,sh.node,false)&&sh.moved<(S.speed||0)){
    const rem=(S.speed||0)-sh.moved;
    const paths=getReachablePaths(p,sh);
    let best=null;
    for(const [id,path] of paths.entries())if(path.length-1<=rem&&canEndAt(p,sh,id,false)&&(!best||path.length<best.length))best=path;
    if(best&&best.length>1){
      for(let i=1;i<best.length&&sh.moved<(S.speed||0);i++){sh.node=best[i];sh.moved++;await processArrival(p,sh,false);if(!p.ships.includes(sh))return}
    }
  }
}
async function cpuFlightPhase(p){
  for(const sh of p.ships){sh.moved=0;sh.stopped=false;sh.startedOnColonySite=isColonySite(sh.node)}
  if(!p.ships.length)return;
  const balls=shakeBalls(),black=balls.some(b=>b.black);S.balls=balls;S.lastMothershipActor=p.name;S.baseSpeed=black?3:balls.reduce((s,b)=>s+b.v,0);S.speed=S.baseSpeed+totalSpeedBonus(p);S.lastMothershipSpeed=S.speed;log(`${p.name}：マザーシップ速度 ${S.speed}${black?" / 黒球遭遇":""}`);
  renderMothershipRollStatus();await showMothershipAnimation(balls,p.name,S.speed);
  if(black){
    await showEncounterPop();
    try{await resolveEncounter(p,false)}catch(err){console.error("CPU encounter error",err);log(`${p.name}：遭遇処理でエラーを検出したため手番を継続`);S.currentEncounter=null}
    S.baseSpeed=3;S.speed=3+totalSpeedBonus(p);S.lastMothershipSpeed=S.speed;render();
  }
  await tryPlacePendingFreeTradeShips(p,false);
  while((p.pendingJump||0)>0&&await cpuUseJump(p)){}
  const processed=new Set();
  while(true){
    const sh=p.ships.find(s=>!processed.has(s.id));
    if(!sh)break;
    processed.add(sh.id);
    await cpuMoveShip(p,sh);
    await tryPlacePendingFreeTradeShips(p,false);
  }
}
let onlineCpuTimer=null;
function canDriveOnlineCpu(){
  return !!(window.NET?.online&&window.NET.connected&&window.NET.isHost?.()&&S&&S.setupComplete&&S.winner===null&&player()&&!player().human&&!ui.busy);
}
function scheduleOnlineCpuTurn(delay=420){
  if(!window.NET?.online)return;
  clearTimeout(onlineCpuTimer);onlineCpuTimer=null;
  if(!canDriveOnlineCpu())return;
  const turn=S.turn,round=S.round;
  onlineCpuTimer=setTimeout(async()=>{
    onlineCpuTimer=null;
    if(!canDriveOnlineCpu()||S.turn!==turn||S.round!==round)return;
    const was=window.NET.coordinatorMode;window.NET.coordinatorMode=true;
    try{
      await cpuTurn();
      await window.NET.flushState(S);
    }catch(err){
      console.error("online CPU driver error",err);
    }finally{
      window.NET.coordinatorMode=was;
      scheduleOnlineCpuTurn(500);
    }
  },delay);
}

async function cpuTurn(){
  if(S.winner!==null)return;const p=player();if(p.human)return;
  if(p.vp>=15){S.winner=p.id;winModal(p);return}
  ui.busy=true;render();
  try{
    await wait(260);
    const d1=1+Math.floor(Math.random()*6),d2=1+Math.floor(Math.random()*6);S.dice=[d1,d2];S.lastDiceActor=p.name;await showDiceAnimation(d1,d2,p.name);await resolveProduction(d1+d2,p,false);S.phase="build";render();await wait(220);
    await cpuBuildPhase(p);S.phase="flight";render();await wait(220);
    await cpuFlightPhase(p);render();await wait(260);
    ensurePendingFreeTradeMarkers(p);
  }catch(err){console.error("CPU turn error",err);log(`${p.name}：CPU処理エラーを検出。手番を継続します`)}
  finally{ui.busy=false}
  nextTurn();
}
function resetTurnFlags(p){p.turnFlags={fameSale:false,goods1:false,helpingHand:false}}
function nextTurn(){
  if(S.winner!==null){render();return}
  S.phase="production";S.baseSpeed=null;S.speed=null;ui.selectedShip=null;ui.jumpMode=false;
  // 生産ダイスは手番終了時に固定欄から消す。
  S.dice=null;S.lastDiceActor=null;
  S.turn=(S.turn+1)%S.count;if(S.turn===S.setupStarting)S.round++;resetTurnFlags(player());
  if(window.NET?.online){
    const was=window.NET.coordinatorMode;window.NET.coordinatorMode=true;render();
    window.NET.flushState(S).finally(()=>{window.NET.coordinatorMode=was;scheduleOnlineCpuTurn(450)});
  }else render();
  if(player().vp>=15){S.winner=player().id;winModal(player());return}
  if(window.NET?.online)scheduleOnlineCpuTurn(500);
  else if(!player().human)setTimeout(cpuTurn,350);
}

function showToast(msg){return modalPromise(`<h2>確認</h2><p>${msg}</p>`,[{label:"OK",value:true,primary:true}])}
function modalPromise(html,choices){
  return new Promise(resolve=>{const m=$("modal");m.innerHTML=html+`<div class="modal-actions">${choices.map((c,i)=>`<button data-choice="${i}" class="${c.primary?"primary":""}">${c.label}</button>`).join("")}</div>`;$("modalBackdrop").classList.add("show");m.querySelectorAll("[data-choice]").forEach(btn=>btn.onclick=()=>{$("modalBackdrop").classList.remove("show");resolve(choices[Number(btn.dataset.choice)].value)})})
}
function helpModal(){
  modalPromise(`<h2>2019年版ルール再現 v${VERSION}</h2>
  <div class="rule-sheet">
  <p><b>勝利：</b>開始4VP。自分の手番中に15VPへ到達すると勝利。</p>
  <p><b>手番：</b>生産 → 交易・建設 → 飛行。4～7VPは予備資源2枚、8～9VPは1枚、10VP以上は0枚。</p>
  <p><b>7：</b>惑星生産なし。規定枚数超のプレイヤーは半分を返し、手番プレイヤーは相手1人からランダムに1枚取得。ほかの全員は予備資源1枚。</p>
  <p><b>交易：</b>供給とは通常3:1、交易品は2:1。商人カードで改善。プレイヤー間交易は任意比率。相手端末へ提案を送り、YES / NOで回答します。</p>
  <p><b>飛行：</b>黄2・黄2・赤3・青1・黒0から2球。黒なしなら2球合計、黒ありなら基本速度3＋遭遇。その後、動力等を加算。</p>
  <p><b>探索：</b>未探索セクターへ接触すると公開。海賊基地は大砲、氷惑星は貨物ポッドが規定値以上なら即時解放し、永久1VPと予備数字を得ます。</p>
  <p><b>異星文明：</b>交易船でドッキングし、既設基地数より多い貨物ポッドが必要。友好カードを1枚選択。単独最多なら2VP友好マーカー。</p>
  <p><b>遭遇：</b>32枚を番号別に処理。商人・海賊・救難・ワームホール・旅人・摩耗イベントの分岐をカード番号ごとに実装しています。公式本文・イラストは収録していません。</p>
  </div>`,[{label:"閉じる",value:true,primary:true}]);
}

function implementationModal(){
  modalPromise(`<h2>実装範囲</h2><div class="rule-sheet">
    <p><b>基本セット：</b>3～4人、4VP開始、15VP勝利、5資源、予備資源、生産、7、交易、建設、飛行、探索を実装。</p>
    <p><b>駒：</b>各色 植民地9・交易基地7・輸送船3・造船所3。植民船/交易船/宇宙港は元駒の組み合わせとして在庫管理します。</p>
    <p><b>母船：</b>黄2・黄2・赤3・青1・黒0。黒球時の遭遇、動力/大砲/貨物ポッド上限、科学者カード補正を分離して実装。</p>
    <p><b>異星文明：</b>4文明×友好カード5枚。友好マーカー2VPと単独最多時の移動を実装。</p>
    <p><b>特殊惑星：</b>海賊基地 4/5/6、氷惑星 3/4、予備数字 3/9/10/11/11、永久1VPを実装。</p>
    <p><b>遭遇：</b>1～32をカード別に照合し、贈答枚数、拒否結果、相手位置、戦闘/速度比較、即時スペースジャンプ、摩耗まで個別処理。カード番号と結果は判断前には表示しません。公式カード文章・画像は複製していません。</p>
    <p><b>盤面：</b>公式盤面のハニカム交点格子・15セクター位置・Near/Far区分を座標化し、航路接続を再構成。初心者固定、Strategic、Explorer、Wild Spaceを選択できます。</p><p><b>表示：</b>公式画像・ロゴ・カード原文は収録せず、自作SVGと効果要約へ置換しています。</p>
  </div>`,[{label:"閉じる",value:true,primary:true}]);
}
function winModal(p){
  render();modalPromise(`<h2>🏆 ${p.name} の勝利</h2><p><b>${p.vp}勝利点</b>に到達しました。</p><p>第${S.round}巡でゲーム終了です。</p>`,[{label:"盤面を見る",value:true,primary:true}]);
}
async function resetGame(){
  if(window.NET?.online){
    if(!confirm(`ROOM ${window.NET.room} を初期化しますか？\n進行中のゲームと参加者情報が消えます。`))return;
    try{await window.NET.resetRoom()}catch(e){alert(`初期化に失敗しました: ${e.message}`)}
    return;
  }
  if(confirm("保存データを消してタイトルへ戻しますか？")){localStorage.removeItem(SAVE_KEY);location.reload()}
}

function chooseDiscardBundleUI(res,n,title="資源を捨てる"){
  const chosen=blankRes();
  return new Promise(resolve=>{
    const m=$("modal"),back=$("modalBackdrop");
    function selectedTotal(){return R.reduce((sum,r)=>sum+chosen[r],0)}
    function draw(){
      const total=selectedTotal();
      m.innerHTML=`<h2>${title}</h2><p><b>${n}枚</b>選択してください。</p>
        <div class="discard-picker-status">選択 <b>${total}</b> / ${n}</div>
        <div class="discard-picker">${R.map(r=>`<div class="discard-picker-row">
          <span class="discard-resource-name">${RI[r]} ${RL[r]} <small>所持 ${res[r]||0}</small></span>
          <button data-net-discard-r="${r}" data-delta="-1" ${chosen[r]<=0?"disabled":""}>−</button>
          <b>${chosen[r]}</b>
          <button data-net-discard-r="${r}" data-delta="1" ${chosen[r]>=(res[r]||0)||total>=n?"disabled":""}>＋</button>
        </div>`).join("")}</div>
        <div class="modal-actions"><button id="netDiscardReset" ${total===0?"disabled":""}>リセット</button><button id="netDiscardConfirm" class="primary" ${total!==n?"disabled":""}>${n}枚を選択</button></div>`;
      m.querySelectorAll("[data-net-discard-r]").forEach(btn=>btn.onclick=()=>{const r=btn.dataset.netDiscardR,delta=Number(btn.dataset.delta);chosen[r]=Math.max(0,Math.min(res[r]||0,chosen[r]+delta));draw()});
      $("netDiscardReset").onclick=()=>{R.forEach(r=>chosen[r]=0);draw()};
      $("netDiscardConfirm").onclick=()=>{if(selectedTotal()!==n)return;back.classList.remove("show");resolve(clone(chosen))};
    }
    back.classList.add("show");draw();
  });
}

async function handleOnlineChoiceRequest(req){
  const q=req?.payload||req||{};
  if(q.kind==="board")return chooseBoardNode(q.title||"場所を選択",q.message||"盤面から選択してください。",q.ids||[],q.confirmText||"ここでいいですか？",q.style||"node");
  if(q.kind==="discard")return chooseDiscardBundleUI(q.res||blankRes(),Number(q.count)||0,q.title||"資源を捨てる");
  if(q.kind==="trade"){
    const give=tradeBundleText(q.give||blankRes()),get=tradeBundleText(q.get||blankRes());
    return modalPromise(`<h2>${q.title||"交易提案"}</h2><div class="trade-summary"><b>${q.fromName||"相手"}</b>からの提案<br><br>相手が渡す：${give}<br>相手が貰う：${get}</div><p>この交易に応じますか？</p>`,[
      {label:"YES",value:true,primary:true},{label:"NO",value:false}
    ]);
  }
  if(q.kind==="options")return modalPromise(`<h2>${q.title||"選択"}</h2>${q.message?`<p>${q.message}</p>`:""}`,q.options||[]);
  return null;
}

async function hostStartOnline(roster,setupMode){
  if(!window.NET?.online)throw new Error("オンライン接続がありません");
  if(!Array.isArray(roster)||(roster.length!==3&&roster.length!==4))throw new Error("人間＋CPUの合計を3人または4人にしてください");
  const names=roster.map((x,i)=>x?.name||`Player ${i+1}`);
  newGame(names[0],roster.length,setupMode||"beginner");
  S.players.forEach((p,i)=>{p.name=names[i];p.human=!roster[i]?.cpu;p.cpu=!!roster[i]?.cpu});
  if(Array.isArray(S.logs))for(const entry of S.logs)for(let i=1;i<names.length;i++)entry.msg=entry.msg.replaceAll(`CPU ${i}`,names[i]);
  S.onlineRoom=window.NET.room;S.online=true;S.onlineRoster=clone(roster);
  B=buildBoardFromState();showScreen("gameScreen");render();
  if($("onlineRoomBadge"))$("onlineRoomBadge").textContent=`ROOM ${window.NET.room} / P${mySeat()+1}`;
  await window.NET.startGame(clone(S));
  await window.NET.flushState(S);
  if(!S.setupComplete){await runAdvancedSetup();await window.NET.flushState(S)}
  scheduleOnlineCpuTurn(500);
  return true;
}

function receiveOnlineState(state){
  if(!state)return;
  S=clone(state);B=buildBoardFromState();
  showScreen("gameScreen");render();
  if($("onlineRoomBadge"))$("onlineRoomBadge").textContent=`ROOM ${window.NET?.room||"-"} / P${mySeat()+1}`;
  scheduleOnlineCpuTurn(420);
}

async function playNetEvent(event){
  if(!event)return;
  if(window.NET)window.NET.playingNetEvent=true;
  try{
    if(event.kind==="dice")await showDiceAnimation(event.d1,event.d2,event.actor);
    else if(event.kind==="mothership")await showMothershipAnimation(event.balls||[],event.actor,event.totalSpeed);
    else if(event.kind==="encounter_pop")await showEncounterPop();
    else if(event.kind==="center_notice")await showCenterNotice(event.text,event.sub||"");
    else if(event.kind==="resource_gain")showResourceGainOverlay(event.payload);
    else if(event.kind==="pin"){
      ui.pin={x:event.x,y:event.y,until:Date.now()+5000};
      if(ui.pinTimer)clearTimeout(ui.pinTimer);
      ui.pinTimer=setTimeout(()=>{ui.pin=null;ui.pinTimer=null;render()},5050);render();
    }
  }finally{if(window.NET)window.NET.playingNetEvent=false}
}

window.SFOnlineAPI={
  receiveState:receiveOnlineState,
  hostStart:hostStartOnline,
  handleChoiceRequest:handleOnlineChoiceRequest,
  playNetEvent,
  maybeDriveCpu:()=>scheduleOnlineCpuTurn(250),
  getState:()=>S?clone(S):null
};
window.dispatchEvent(new Event("starfarers-api-ready"));

if(window.NET?.online){
  if($("helpBtn"))$("helpBtn").onclick=helpModal;
  if($("virtual1920Btn"))$("virtual1920Btn").onclick=toggleVirtual1920Mode;
  if($("logBtn"))$("logBtn").onclick=showFullLog;
  if($("pinBtn"))$("pinBtn").onclick=togglePinMode;
  if($("rulesBtn"))$("rulesBtn").onclick=implementationModal;
  if($("saveBtn"))$("saveBtn").onclick=async()=>{await window.NET.flushState(S);showToast("同期しました。");};
  if($("resetBtn"))$("resetBtn").onclick=resetGame;
}else{
  if($("startBtn"))$("startBtn").onclick=async()=>{newGame($("playerName").value,Number($("playerCount").value),$("setupMode").value);showScreen("gameScreen");render();if(!S.setupComplete)await runAdvancedSetup();else if(!player().human)setTimeout(cpuTurn,450)};
  if($("continueBtn"))$("continueBtn").onclick=async()=>{if(load()){showScreen("gameScreen");render();if(!S.setupComplete)await runAdvancedSetup();else if(!player().human)setTimeout(cpuTurn,450)}};
  if($("helpBtn"))$("helpBtn").onclick=helpModal;
  if($("virtual1920Btn"))$("virtual1920Btn").onclick=toggleVirtual1920Mode;
  if($("logBtn"))$("logBtn").onclick=showFullLog;
  if($("pinBtn"))$("pinBtn").onclick=togglePinMode;
  if($("rulesBtn"))$("rulesBtn").onclick=implementationModal;
  if($("saveBtn"))$("saveBtn").onclick=()=>{save();showToast("保存しました。");};
  if($("resetBtn"))$("resetBtn").onclick=resetGame;
  if(localStorage.getItem(SAVE_KEY)&&$("continueBtn"))$("continueBtn").style.display="block";
}

applyVirtual1920Mode();

})();
