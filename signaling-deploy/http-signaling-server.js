const http = require('http');
const url = require('url');

const sessions = new Map();

console.log('🚀 SplitSound HTTP Signaling Server starting...');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  console.log('📥 HTTP Request:', req.method, path);
  
  if (req.method === 'POST' && path === '/signaling') {
    handleSignalingRequest(req, res);
  } else if (req.method === 'GET' && path === '/poll') {
    handlePollingRequest(req, res);
  } else if (req.method === 'GET' && path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', timestamp: Date.now() }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

function handleSignalingRequest(req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    try {
      const message = JSON.parse(body);
      console.log('📥 Received signaling message:', message.type, 'from', message.deviceId);
      
      if (message.type === 'host') {
        handleHostRegistration(message, res);
      } else if (message.type === 'join') {
        handleClientJoin(message, res);
      } else {
        relayMessage(message, res);
      }
    } catch (error) {
      console.error('❌ Failed to parse message:', error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });
}

function handlePollingRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const sessionCode = parsedUrl.query.session;
  const deviceId = parsedUrl.query.device;
  
  if (!sessionCode || !deviceId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing session or device parameter' }));
    return;
  }
  
  if (sessions.has(sessionCode)) {
    const session = sessions.get(sessionCode);
    const messages = session.pendingMessages.get(deviceId) || [];
    session.pendingMessages.set(deviceId, []);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ messages, timestamp: Date.now() }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Session not found' }));
  }
}

function handleHostRegistration(message, res) {
  const sessionCode = message.sessionCode;
  
  if (!sessions.has(sessionCode)) {
    sessions.set(sessionCode, {
      host: message.deviceId,
      clients: new Set([message.deviceId]),
      pendingMessages: new Map(),
      created: Date.now()
    });
    console.log('🏠 Created new session:', sessionCode, 'for host:', message.deviceId);
  } else {
    const session = sessions.get(sessionCode);
    session.host = message.deviceId;
    session.clients.add(message.deviceId);
    console.log('🏠 Host rejoined session:', sessionCode);
  }
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    type: 'host_registered',
    sessionCode: sessionCode,
    deviceId: message.deviceId,
    timestamp: Date.now()
  }));
}

function handleClientJoin(message, res) {
  const sessionCode = message.sessionCode;
  
  if (sessions.has(sessionCode)) {
    const session = sessions.get(sessionCode);
    session.clients.add(message.deviceId);
    
    console.log('📱 Client joined session:', sessionCode, 'device:', message.deviceId);
    
    const joinMessage = {
      type: 'device_joined',
      deviceId: message.deviceId,
      platform: message.platform,
      timestamp: Date.now()
    };
    
    session.clients.forEach(clientId => {
      if (clientId !== message.deviceId) {
        if (!session.pendingMessages.has(clientId)) {
          session.pendingMessages.set(clientId, []);
        }
        session.pendingMessages.get(clientId).push(joinMessage);
      }
    });
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      type: 'joined_session',
      sessionCode: sessionCode,
      deviceId: message.deviceId,
      timestamp: Date.now()
    }));
  } else {
    console.log('❌ Session not found:', sessionCode);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      type: 'error',
      message: 'Session not found',
      sessionCode: sessionCode
    }));
  }
}

function relayMessage(message, res) {
  const sessionCode = message.sessionCode;
  
  if (!sessions.has(sessionCode)) {
    console.log('❌ Cannot relay message: no valid session');
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Session not found' }));
    return;
  }
  
  const session = sessions.get(sessionCode);
  const relayedMessage = {
    ...message,
    relayedBy: 'signaling-server',
    relayTimestamp: Date.now()
  };
  
  let relayCount = 0;
  session.clients.forEach(clientId => {
    if (clientId !== message.deviceId) {
      if (!session.pendingMessages.has(clientId)) {
        session.pendingMessages.set(clientId, []);
      }
      session.pendingMessages.get(clientId).push(relayedMessage);
      relayCount++;
    }
  });
  
  console.log('🔄 Relaying message type:', message.type, 'to', relayCount, 'clients');
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    type: 'message_relayed', 
    relayCount,
    timestamp: Date.now() 
  }));
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
  console.log(`✅ SplitSound HTTP Signaling Server running on port ${PORT}`);
  console.log(`📡 HTTP endpoint: http://localhost:${PORT}`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});
