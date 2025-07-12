const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const sessions = new Map();

console.log('🚀 SplitSound WebRTC Signaling Server starting...');

wss.on('connection', (ws, req) => {
  console.log('🔗 New WebSocket connection from:', req.socket.remoteAddress);
  
  ws.sessionCode = null;
  ws.deviceId = null;
  ws.isHost = false;
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📥 Received message:', message.type, 'from', message.deviceId);
      
      if (message.type === 'host') {
        handleHostRegistration(ws, message);
      } else if (message.type === 'join') {
        handleClientJoin(ws, message);
      } else {
        relayMessage(ws, message);
      }
    } catch (error) {
      console.error('❌ Failed to parse message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed for device:', ws.deviceId);
    if (ws.sessionCode && sessions.has(ws.sessionCode)) {
      const session = sessions.get(ws.sessionCode);
      session.clients = session.clients.filter(client => client !== ws);
      
      if (session.clients.length === 0) {
        sessions.delete(ws.sessionCode);
        console.log('🗑️ Deleted empty session:', ws.sessionCode);
      } else {
        broadcastToSession(ws.sessionCode, {
          type: 'device_disconnected',
          deviceId: ws.deviceId,
          timestamp: Date.now()
        }, ws);
      }
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error for device:', ws.deviceId, error);
  });
});

function handleHostRegistration(ws, message) {
  const sessionCode = message.sessionCode;
  ws.sessionCode = sessionCode;
  ws.deviceId = message.deviceId;
  ws.isHost = true;
  
  if (!sessions.has(sessionCode)) {
    sessions.set(sessionCode, {
      host: ws,
      clients: [ws],
      created: Date.now()
    });
    console.log('🏠 Created new session:', sessionCode, 'for host:', message.deviceId);
  } else {
    const session = sessions.get(sessionCode);
    session.host = ws;
    session.clients.push(ws);
    console.log('🏠 Host rejoined session:', sessionCode);
  }
  
  ws.send(JSON.stringify({
    type: 'host_registered',
    sessionCode: sessionCode,
    deviceId: message.deviceId,
    timestamp: Date.now()
  }));
}

function handleClientJoin(ws, message) {
  const sessionCode = message.sessionCode;
  ws.sessionCode = sessionCode;
  ws.deviceId = message.deviceId;
  ws.isHost = false;
  
  if (sessions.has(sessionCode)) {
    const session = sessions.get(sessionCode);
    session.clients.push(ws);
    
    console.log('📱 Client joined session:', sessionCode, 'device:', message.deviceId);
    
    ws.send(JSON.stringify({
      type: 'joined_session',
      sessionCode: sessionCode,
      deviceId: message.deviceId,
      timestamp: Date.now()
    }));
    
    broadcastToSession(sessionCode, {
      type: 'device_joined',
      deviceId: message.deviceId,
      platform: message.platform,
      timestamp: Date.now()
    }, ws);
    
    if (session.host && session.host !== ws) {
      session.host.send(JSON.stringify({
        type: 'client_connected',
        deviceId: message.deviceId,
        platform: message.platform,
        timestamp: Date.now()
      }));
    }
  } else {
    console.log('❌ Session not found:', sessionCode);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Session not found',
      sessionCode: sessionCode
    }));
  }
}

function relayMessage(ws, message) {
  if (!ws.sessionCode || !sessions.has(ws.sessionCode)) {
    console.log('❌ Cannot relay message: no valid session');
    return;
  }
  
  const session = sessions.get(ws.sessionCode);
  const targetClients = session.clients.filter(client => 
    client !== ws && 
    client.readyState === WebSocket.OPEN
  );
  
  console.log('🔄 Relaying message type:', message.type, 'to', targetClients.length, 'clients');
  
  targetClients.forEach(client => {
    try {
      client.send(JSON.stringify({
        ...message,
        relayedBy: 'signaling-server',
        relayTimestamp: Date.now()
      }));
    } catch (error) {
      console.error('❌ Failed to relay message to client:', error);
    }
  });
}

function broadcastToSession(sessionCode, message, excludeWs = null) {
  if (!sessions.has(sessionCode)) return;
  
  const session = sessions.get(sessionCode);
  const targetClients = session.clients.filter(client => 
    client !== excludeWs && 
    client.readyState === WebSocket.OPEN
  );
  
  console.log('📢 Broadcasting to session:', sessionCode, 'clients:', targetClients.length);
  
  targetClients.forEach(client => {
    try {
      client.send(JSON.stringify(message));
    } catch (error) {
      console.error('❌ Failed to broadcast to client:', error);
    }
  });
}

setInterval(() => {
  const now = Date.now();
  const expiredSessions = [];
  
  sessions.forEach((session, sessionCode) => {
    if (now - session.created > 24 * 60 * 60 * 1000) {
      expiredSessions.push(sessionCode);
    }
  });
  
  expiredSessions.forEach(sessionCode => {
    sessions.delete(sessionCode);
    console.log('🗑️ Cleaned up expired session:', sessionCode);
  });
}, 60 * 60 * 1000);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`✅ SplitSound Signaling Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});
