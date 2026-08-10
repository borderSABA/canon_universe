(() => {
"use strict";

const base = String(window.STARFARERS_SERVER_URL || "").replace(/\/$/, "");
const CLIENT_KEY = "starfarers_online_client_id_v3";
const savedClientId = localStorage.getItem(CLIENT_KEY) || (crypto.randomUUID ? crypto.randomUUID() : `c_${Date.now()}_${Math.random().toString(36).slice(2)}`);
localStorage.setItem(CLIENT_KEY, savedClientId);

const pending = new Map();
let choiceSeq = 1;
let roomPoll = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
let intentionalClose = false;
let lastJoin = null;
let queuedPackets = [];

const NET = window.NET = {
  online: true,
  base,
  clientId: savedClientId,
  socket: null,
  room: null,
  seat: null,
  hostSeat: null,
  connected: false,
  lobby: null,
  applyingRemote: false,
  coordinatorMode: false,
  stateTimer: null,
  lastSentJson: "",
  isLocalPlayer(p){ return !!p && Number(p.id) === Number(this.seat); },
  mySeat(){ return Number.isInteger(this.seat) ? this.seat : 0; },
  canPublishState(state){
    if(!this.connected || !state) return false;
    if(this.coordinatorMode) return true;
    return Number(state.turn) === Number(this.seat);
  },
  scheduleStateSync(state){
    if(this.applyingRemote || !this.canPublishState(state)) return;
    clearTimeout(this.stateTimer);
    this.stateTimer = setTimeout(() => this.flushState(state), 55);
  },
  async flushState(state){
    clearTimeout(this.stateTimer); this.stateTimer = null;
    if(this.applyingRemote || !this.canPublishState(state) || !this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
    const json = JSON.stringify(state);
    if(json === this.lastSentJson) return true;
    this.lastSentJson = json;
    this.send({type:"state_update", state});
    await new Promise(r=>setTimeout(r,20));
    return true;
  },
  send(obj){ if(this.socket && this.socket.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(obj)); },
  broadcastEvent(event){ this.send({type:"relay", targetSeat:null, packet:{type:"game_event", event}}); },
  sendPin(pin){ this.broadcastEvent({kind:"pin", ...pin}); },
  async requestChoice(targetSeat,payload){
    if(Number(targetSeat) === Number(this.seat)) return window.SFOnlineAPI?.handleChoiceRequest?.({requestId:"local",fromSeat:this.seat,payload});
    const requestId = `${this.clientId}_${Date.now()}_${choiceSeq++}`;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{pending.delete(requestId);reject(new Error("choice timeout"))},180000);
      pending.set(requestId,{resolve,reject,timer});
      this.send({type:"relay",targetSeat:Number(targetSeat),packet:{type:"choice_request",requestId,fromSeat:this.seat,payload}});
    });
  },
  respondChoice(targetSeat,requestId,value){ this.send({type:"relay",targetSeat:Number(targetSeat),packet:{type:"choice_response",requestId,value}}); },
  async startGame(state){
    if(this._startPending)throw new Error("開始処理中です");
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this._startPending=null;reject(new Error("サーバーから開始応答がありません"))},8000);
      this._startPending={resolve,reject,timer};
      this.send({type:"start_game",state});
    });
  },
  async resetRoom(room=this.room){
    if(!room) return;
    const res = await fetch(`${base}/api/room/${encodeURIComponent(room)}/reset`,{method:"POST"});
    if(!res.ok) throw new Error(`reset ${res.status}`);
  }
};

function validServer(){ return /^https?:\/\//.test(base) && !base.includes("YOUR-WORKER"); }
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function setServerState(text,ok=null){ const e=$("serverState"); if(!e)return;e.textContent=text;e.className="server-state"+(ok===true?" ok":ok===false?" bad":""); }
function titleMsg(text){ const e=$("titleMessage");if(e)e.textContent=text||""; }

async function refreshRooms(){
  if(!validServer()){ setServerState("config.js にCloudflare Worker URLを設定してください。",false); renderRooms([]); return; }
  try{
    const r=await fetch(`${base}/api/rooms`,{cache:"no-store"});
    if(!r.ok) throw new Error(String(r.status));
    const data=await r.json(); setServerState("オンラインサーバー接続OK",true); renderRooms(data.rooms||[]);
  }catch(err){ setServerState("サーバーへ接続できません。Worker URL・デプロイ状態を確認してください。",false); }
}
function renderRooms(rooms){
  const g=$("roomGrid"); if(!g)return;
  const map=new Map(rooms.map(x=>[String(x.room),x]));
  g.innerHTML=["1","2","3","4"].map(id=>{
    const s=map.get(id)||{occupied:0,connected:0,started:false};
    const full=s.occupied>=4;
    return `<div class="room-card ${s.started?"started":""} ${full?"full":""}">
      <div><div class="room-name">ROOM ${id}</div><div class="room-meta">${s.started?"ゲーム中":"待機中"} / 接続 ${s.connected||0}人 / 席 ${s.occupied||0}/4</div></div>
      <div class="room-actions"><button data-join-room="${id}" ${full&&!s.started?"disabled":""}>参加</button><button data-reset-room="${id}" class="danger">初期化</button></div>
    </div>`;
  }).join("");
  g.querySelectorAll("[data-join-room]").forEach(b=>b.onclick=()=>joinRoom(b.dataset.joinRoom));
  g.querySelectorAll("[data-reset-room]").forEach(b=>b.onclick=()=>manualReset(b.dataset.resetRoom));
}

async function manualReset(room){
  if(!validServer()) return;
  if(!confirm(`ROOM ${room} を初期化しますか？\n進行中のゲームと参加者情報も消えます。`)) return;
  try{ await NET.resetRoom(room); titleMsg(`ROOM ${room} を初期化しました。`); setTimeout(refreshRooms,250); }
  catch(e){ titleMsg(`初期化に失敗しました: ${e.message}`); }
}

function joinRoom(room){
  if(!validServer()){ titleMsg("先にconfig.jsへWorker URLを設定してください。"); return; }
  const name=($("playerName")?.value||"").trim(); if(!name){titleMsg("名前を入力してください。");return;}
  intentionalClose=false; lastJoin={room:String(room),name};
  const wsBase=base.replace(/^http:/,"ws:").replace(/^https:/,"wss:");
  const url=`${wsBase}/api/room/${encodeURIComponent(room)}/ws?name=${encodeURIComponent(name)}&client=${encodeURIComponent(savedClientId)}`;
  titleMsg(`ROOM ${room} に接続中…`);
  const ws=new WebSocket(url); NET.socket=ws;
  ws.onopen=()=>{NET.connected=true;reconnectAttempts=0;setConnBadge(true);};
  ws.onmessage=ev=>{try{handleMessage(JSON.parse(ev.data))}catch(e){console.error(e)}};
  ws.onerror=()=>{};
  ws.onclose=ev=>{
    NET.connected=false;setConnBadge(false);
    if(intentionalClose) return;
    if(ev.code===4001){ titleMsg("部屋が満員です。"); showTitleOnly(); return; }
    if(ev.code===4000){ titleMsg("部屋が初期化されました。"); showTitleOnly(); setTimeout(refreshRooms,250); return; }
    scheduleReconnect();
  };
}
function scheduleReconnect(){
  if(!lastJoin||intentionalClose)return;
  clearTimeout(reconnectTimer);const delay=Math.min(8000,800*Math.pow(1.7,reconnectAttempts++));
  showReconnect(true);reconnectTimer=setTimeout(()=>joinRoom(lastJoin.room),delay);
}
function showReconnect(show){
  let e=document.querySelector(".net-reconnect-banner");
  if(show){if(!e){e=document.createElement("div");e.className="net-reconnect-banner";e.textContent="サーバーへ再接続中…";document.body.appendChild(e)}}else e?.remove();
}
function setConnBadge(ok){const e=$("onlineConnBadge");if(!e)return;e.textContent=ok?"● 接続中":"● 再接続中";e.classList.toggle("offline",!ok);if(ok)showReconnect(false);}

function handleMessage(msg){
  if(msg.type==="welcome"){
    NET.room=String(msg.room);NET.seat=Number(msg.seat);NET.hostSeat=Number(msg.hostSeat);NET.lobby=msg.snapshot;
    titleMsg(""); showLobby(msg.snapshot); if(msg.snapshot?.gameState) applyGameState(msg.snapshot.gameState,true);
    return;
  }
  if(msg.type==="lobby"){
    NET.lobby=msg.snapshot;NET.hostSeat=Number(msg.snapshot?.hostSeat ?? NET.hostSeat);showLobby(msg.snapshot);return;
  }
  if(msg.type==="start_ack"){
    const p=NET._startPending;if(p){clearTimeout(p.timer);NET._startPending=null;p.resolve(true)}return;
  }
  if(msg.type==="game_started"||msg.type==="state"){
    applyGameState(msg.state,false);return;
  }
  if(msg.type==="relay"){ handleRelay(msg.packet,msg.fromSeat); return; }
  if(msg.type==="room_reset"){ alert("この部屋は初期化されました。"); showTitleOnly(); return; }
  if(msg.type==="error"){
    const p=NET._startPending;if(p){clearTimeout(p.timer);NET._startPending=null;p.reject(new Error(msg.message||"サーバーエラー"))}
    titleMsg(msg.message||"サーバーエラー");
  }
}
function applyGameState(state,initial){
  if(!state)return;
  if(window.SFOnlineAPI?.receiveState){
    NET.applyingRemote=true;try{window.SFOnlineAPI.receiveState(state)}finally{NET.applyingRemote=false}
    $("onlineRoomBadge") && ($("onlineRoomBadge").textContent=`ROOM ${NET.room} / P${NET.seat+1}`);
  }else queuedPackets.push({kind:"state",state});
}
async function handleRelay(packet,fromSeat){
  if(!packet)return;
  if(packet.type==="choice_response"){
    const p=pending.get(packet.requestId);if(p){clearTimeout(p.timer);pending.delete(packet.requestId);p.resolve(packet.value)}return;
  }
  if(packet.type==="choice_request"){
    if(!window.SFOnlineAPI?.handleChoiceRequest){queuedPackets.push({kind:"choice",packet,fromSeat});return}
    try{const value=await window.SFOnlineAPI.handleChoiceRequest(packet);NET.respondChoice(packet.fromSeat??fromSeat,packet.requestId,value)}catch(e){console.error(e);NET.respondChoice(packet.fromSeat??fromSeat,packet.requestId,null)}
    return;
  }
  if(packet.type==="game_event"){
    if(window.SFOnlineAPI?.playNetEvent)window.SFOnlineAPI.playNetEvent(packet.event);else queuedPackets.push({kind:"event",event:packet.event});
  }
}

function showLobby(snapshot){
  if(!snapshot)return;
  const title=$("titleScreen"),game=$("gameScreen"); if(game?.classList.contains("active")&&snapshot.gameState)return;
  title?.classList.add("active");game?.classList.remove("active");
  if($("roomSelectCard"))$("roomSelectCard").style.display="none";
  $("lobbyCard").style.display="block";$("lobbyRoomName").textContent=`ROOM ${NET.room}`;
  const seats=snapshot.seats||[];
  $("lobbyPlayers").innerHTML=[0,1,2,3].map(i=>{const s=seats.find(x=>x.seat===i);return `<div class="lobby-player"><span class="seat" style="color:${["#ffd34e","#ff5f68","#f0f0f0","#4ca9ff"][i]}">P${i+1}　${s?esc(s.name):"空席"}</span><span>${s?(s.connected?"接続中":"切断"):("待機")}${i===snapshot.hostSeat?'<span class="host">HOST</span>':""}</span></div>`}).join("");
  const isHost=Number(NET.seat)===Number(snapshot.hostSeat);$("hostControls").style.display=isHost?"block":"none";$("guestWaiting").style.display=isHost?"none":"block";
  if(isHost && snapshot.config?.setupMode)$("setupMode").value=snapshot.config.setupMode;
}
function showTitleOnly(){
  intentionalClose=true;try{NET.socket?.close()}catch(e){}NET.socket=null;NET.connected=false;NET.room=null;NET.seat=null;NET.lobby=null;lastJoin=null;
  $("gameScreen")?.classList.remove("active");$("titleScreen")?.classList.add("active");if($("roomSelectCard"))$("roomSelectCard").style.display="block";$("lobbyCard") && ($("lobbyCard").style.display="none");showReconnect(false);refreshRooms();
}

async function hostStart(){
  const snap=NET.lobby; if(!snap)return;
  const connected=(snap.seats||[]).filter(s=>s.connected).sort((a,b)=>a.seat-b.seat);
  if(connected.length<3||connected.length>4){alert("ゲーム開始には3人または4人の接続が必要です。");return;}
  if(!window.SFOnlineAPI?.hostStart){alert("ゲーム読込中です。もう一度押してください。");return;}
  const names=connected.map(s=>s.name),setup=$("setupMode").value;
  NET.coordinatorMode=true;
  try{await window.SFOnlineAPI.hostStart(names,setup)}catch(e){console.error(e);alert(`開始処理でエラー: ${e.message}`)}finally{NET.coordinatorMode=false;}
}

function leaveRoom(){ intentionalClose=true;NET.send({type:"leave_room"});try{NET.socket?.close(1000,"leave")}catch(e){}showTitleOnly(); }

function drainQueue(){
  if(!window.SFOnlineAPI)return;
  const q=queuedPackets;queuedPackets=[];
  for(const x of q){if(x.kind==="state")applyGameState(x.state,false);else if(x.kind==="event")window.SFOnlineAPI.playNetEvent?.(x.event);else if(x.kind==="choice")handleRelay(x.packet,x.fromSeat)}
}
window.addEventListener("starfarers-api-ready",drainQueue);

window.addEventListener("DOMContentLoaded",()=>{
  $("refreshRoomsBtn").onclick=refreshRooms;$("onlineStartBtn").onclick=hostStart;$("leaveRoomBtn").onclick=leaveRoom;
  $("setupMode").onchange=()=>NET.send({type:"lobby_config",config:{setupMode:$("setupMode").value}});
  refreshRooms();roomPoll=setInterval(()=>{if(!NET.room)refreshRooms()},5000);
});

})();
