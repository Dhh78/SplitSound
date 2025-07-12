import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { CompanionDevice, AudioSession, ConnectionStatus } from '../types';

declare global {
  interface Window {
    RTCPeerConnection: any;
    webkitRTCPeerConnection: any;
    mozRTCPeerConnection: any;
  }
}

class SplitSoundCompanionService {
  private currentSession: AudioSession | null = null;
  private isHost: boolean = false;
  private isConnected: boolean = false;
  private connectedDevices: CompanionDevice[] = [];
  private syncOffset: number = 0;
  private peerConnection: any = null;
  private audioStream: MediaStream | null = null;
  private signalingSocket: WebSocket | null = null;
  private localAudio: HTMLAudioElement | null = null;
  private lastSentMessage: string = '';
  private lastReceivedMessage: string = '';
  private messagesSent: number = 0;
  private messagesReceived: number = 0;
  private debugErrors: string[] = [];
  private signalingMessageHistory: any[] = [];
  private webSocketUrl: string = '';
  private connectionAttempts: number = 0;

  constructor() {
    this.initializeWebRTC();
  }

  private async initializeWebRTC(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        const RTCPeerConnection = window.RTCPeerConnection || 
                                 window.webkitRTCPeerConnection || 
                                 window.mozRTCPeerConnection;
        
        if (RTCPeerConnection) {
          console.log('WebRTC supported');
        } else {
          console.warn('WebRTC not supported in this browser');
        }
      } else {
        const { RTCPeerConnection } = require('react-native-webrtc');
        console.log('React Native WebRTC initialized');
      }
    } catch (error) {
      console.warn('WebRTC initialization failed:', error);
    }
  }

  async requestAudioPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        
        if (audioInputs.length === 0) {
          console.warn('⚠️ No audio input devices available, continuing without audio stream');
          return true;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true
        });
        this.audioStream = stream;
        console.log('✅ Audio permissions granted (Web)');
        stream.getTracks().forEach(track => track.stop());
        return true;
      } else {
        const { mediaDevices } = require('react-native-webrtc');
        const stream = await mediaDevices.getUserMedia({
          audio: true,
          video: false
        });
        this.audioStream = stream;
        console.log('✅ Audio permissions granted (Mobile)');
        return true;
      }
    } catch (error: any) {
      console.error('❌ Audio permission request failed:', error);
      this.debugErrors.push(`Audio permission error: ${error}`);
      
      if (error.name === 'NotAllowedError') {
        this.debugErrors.push('User denied microphone access. Please enable in settings.');
        console.error('Audio permission denied by user. Please grant microphone access.');
        return false;
      } else if (error.name === 'NotFoundError') {
        this.debugErrors.push('No microphone found. Please connect an audio device.');
        console.warn('⚠️ No audio input device found, continuing without audio stream for signaling test');
      } else if (error.name === 'NotReadableError') {
        this.debugErrors.push('Microphone is being used by another application.');
      }
      
      console.warn('⚠️ Audio permissions failed, continuing without audio stream for signaling test');
      return true;
    }
  }

  private getDeviceId(): string {
    if (Platform.OS === 'web') {
      return `Web-${navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Browser'}-${Date.now().toString().slice(-4)}`;
    }
    return Device.modelName || `${Platform.OS}-Device-${Date.now().toString().slice(-4)}`;
  }

  generateSessionCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  async startHosting(): Promise<{ success: boolean; sessionCode?: string; error?: string }> {
    try {
      const hasPermissions = await this.requestAudioPermissions();
      if (!hasPermissions) {
        return { success: false, error: 'Audio permissions required' };
      }

      const sessionCode = this.generateSessionCode();
      const deviceId = this.getDeviceId();
      
      this.currentSession = {
        sessionId: sessionCode,
        hostDeviceId: deviceId,
        connectedDevices: [{
          id: deviceId,
          name: deviceId,
          connected: true,
          isHost: true
        }],
        isActive: true,
        syncOffset: 0
      };

      this.isHost = true;
      this.isConnected = true;
      
      await this.setupPeerConnection();
      await this.startSignalingServer(sessionCode);

      console.log(`Started hosting session: ${sessionCode}`);
      return { success: true, sessionCode };
    } catch (error) {
      console.error('Failed to start hosting:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async joinSession(sessionCode: string): Promise<{ success: boolean; error?: string }> {
    try {
      const deviceId = this.getDeviceId();
      
      this.currentSession = {
        sessionId: sessionCode,
        hostDeviceId: 'Remote Host',
        connectedDevices: [{
          id: deviceId,
          name: deviceId,
          connected: true,
          isHost: false
        }],
        isActive: true,
        syncOffset: 0
      };
      
      await this.setupPeerConnection();
      await this.connectToHost(sessionCode, deviceId);
      
      this.isHost = false;
      this.isConnected = true;
      
      console.log(`Joined session: ${sessionCode}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to join session:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async setupPeerConnection(): Promise<void> {
    try {
      let RTCPeerConnection;
      
      if (Platform.OS === 'web') {
        RTCPeerConnection = window.RTCPeerConnection || 
                           window.webkitRTCPeerConnection || 
                           window.mozRTCPeerConnection;
      } else {
        const webrtc = require('react-native-webrtc');
        RTCPeerConnection = webrtc.RTCPeerConnection;
      }

      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
      });

      if (this.isHost && this.audioStream) {
        this.audioStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.audioStream);
        });
        console.log('🎵 Added audio tracks to peer connection');
      } else if (this.isHost) {
        console.warn('⚠️ Host has no audio stream to share');
      }

      this.peerConnection.ontrack = (event: any) => {
        console.log('🎵 Received remote audio stream');
        if (!this.isHost) {
          this.playRemoteAudio(event.streams[0]);
        }
        const deviceConnectedMessage = {
          type: 'device-connected',
          deviceId: this.getDeviceId(),
          isHost: this.isHost,
          sessionCode: this.currentSession?.sessionId,
          timestamp: Date.now()
        };
        this.sendSignalingMessage(deviceConnectedMessage);
        console.log('📤 Sent device connected notification:', deviceConnectedMessage);
      };

      this.peerConnection.onicecandidate = (event: any) => {
        if (event.candidate) {
          const candidateMessage = {
            type: 'ice-candidate',
            candidate: event.candidate,
            sessionCode: this.currentSession?.sessionId,
            deviceId: this.getDeviceId(),
            timestamp: Date.now()
          };
          this.sendSignalingMessage(candidateMessage);
          console.log('🧊 Sent ICE candidate:', candidateMessage);
        }
      };

      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection.connectionState;
        console.log(`🔗 Connection state changed: ${state}`);
        
        if (state === 'connected') {
          this.isConnected = true;
          console.log('✅ WebRTC connection established');
          this.notifyConnectionStateChange('connected');
        } else if (state === 'disconnected' || state === 'failed') {
          this.isConnected = false;
          console.log('❌ WebRTC connection lost');
          this.notifyConnectionStateChange('disconnected');
        } else if (state === 'connecting') {
          console.log('🔄 WebRTC connecting...');
        }
      };

    } catch (error) {
      console.error('Failed to setup peer connection:', error);
    }
  }

  private playRemoteAudio(stream: MediaStream): void {
    try {
      if (Platform.OS === 'web') {
        if (!this.localAudio) {
          this.localAudio = new Audio();
          this.localAudio.autoplay = true;
        }
        this.localAudio.srcObject = stream;
        this.localAudio.play().catch(e => console.error('Audio play failed:', e));
      } else {
        console.log('Playing remote audio stream on React Native');
      }
    } catch (error) {
      console.error('Failed to play remote audio:', error);
    }
  }

  private async startSignalingServer(sessionCode: string): Promise<void> {
    try {
      console.log(`🚀 Starting signaling for session: ${sessionCode}`);
      
      const httpSignalingServers = [
        `http://localhost:8080`,
        `https://user:768a9d987985a9fa9980949d5296b187@audio-sharing-app-tunnel-mdwb5fz4.devinapps.com`
      ];
      
      for (const serverUrl of httpSignalingServers) {
        try {
          console.log(`🔗 Attempting HTTP signaling connection to: ${serverUrl}`);
          const response = await fetch(`${serverUrl}/signaling`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'host',
              sessionCode: sessionCode,
              deviceId: this.getDeviceId(),
              platform: Platform.OS,
              timestamp: Date.now()
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.type === 'host_registered') {
              console.log(`✅ HTTP signaling server connected: ${serverUrl}`);
              this.webSocketUrl = serverUrl;
              this.startHttpPolling(sessionCode);
              return;
            }
          }
        } catch (error) {
          console.log(`❌ HTTP signaling failed for ${serverUrl}:`, error);
        }
      }
      
      const signalingServers = [
        `wss://user:2e735e944a8dac33119387800ef6e48b@audio-sharing-app-tunnel-ayekalym.devinapps.com`,
        `wss://echo.websocket.org`,
        `wss://ws.postman-echo.com/raw`,
        `wss://connect.websocket.in/v3/1/${sessionCode}`,
        `wss://socketsbay.com/wss/v2/2/${sessionCode}/`
      ];
      
      let connected = false;
      this.connectionAttempts = 0;
      
      for (const serverUrl of signalingServers) {
        try {
          this.connectionAttempts++;
          console.log(`🔗 Attempting connection ${this.connectionAttempts}/${signalingServers.length} to: ${serverUrl}`);
          this.signalingSocket = new WebSocket(serverUrl);
          this.webSocketUrl = serverUrl;
          
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 8000);
            this.signalingSocket!.onopen = () => {
              clearTimeout(timeout);
              connected = true;
              console.log(`✅ Successfully connected to signaling server: ${serverUrl}`);
              resolve(true);
            };
            this.signalingSocket!.onerror = (error) => {
              clearTimeout(timeout);
              console.error(`❌ WebSocket connection error for ${serverUrl}:`, error);
              reject(new Error(`WebSocket connection failed: ${error}`));
            };
            this.signalingSocket!.onclose = (event) => {
              clearTimeout(timeout);
              console.warn(`🔌 WebSocket closed during connection attempt: ${event.code} - ${event.reason}`);
              reject(new Error(`WebSocket closed: ${event.code} - ${event.reason}`));
            };
          });
          
          if (connected) break;
        } catch (error) {
          console.warn(`Failed to connect to ${serverUrl}:`, error);
          this.debugErrors.push(`Signaling server ${serverUrl} failed: ${error}`);
          if (this.signalingSocket) {
            this.signalingSocket.close();
            this.signalingSocket = null;
          }
        }
      }
      
      if (!connected) {
        console.log('🔄 WebSocket servers failed, using localStorage signaling for local testing');
        this.setupLocalStorageSignaling(sessionCode, true);
        return;
      }
      
      this.signalingSocket!.onopen = () => {
        console.log('🔗 Signaling server connected as host');
        this.debugErrors = this.debugErrors.filter(e => !e.includes('Signaling server'));
        const hostMessage = {
          type: 'host',
          sessionCode: sessionCode,
          deviceId: this.getDeviceId(),
          timestamp: Date.now(),
          action: 'register_host',
          platform: Platform.OS,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'React Native'
        };
        this.signalingSocket?.send(JSON.stringify(hostMessage));
        this.lastSentMessage = `host registration to session ${sessionCode}`;
        this.messagesSent++;
        this.signalingMessageHistory.push({
          direction: 'sent',
          message: hostMessage,
          timestamp: new Date().toISOString()
        });
        console.log('📤 Sent host registration:', hostMessage);
      };

      this.signalingSocket!.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          this.lastReceivedMessage = `${message.type} from ${message.deviceId || 'unknown'}`;
          this.messagesReceived++;
          this.signalingMessageHistory.push({
            direction: 'received',
            message: message,
            timestamp: new Date().toISOString()
          });
          console.log('📥 Host received message:', message);
          
          if (message.sessionCode === sessionCode || !message.sessionCode || message.type === 'echo') {
            if (message.type !== 'echo' && message.deviceId !== this.getDeviceId()) {
              await this.handleSignalingMessage(message);
            } else if (message.type === 'echo') {
              console.log('🔄 Received echo message, ignoring');
            } else {
              console.log('🚫 Ignoring message from self');
            }
          } else {
            console.log('🚫 Ignoring message for different session:', message.sessionCode);
          }
        } catch (error) {
          console.error('❌ Failed to parse signaling message:', error);
          this.debugErrors.push(`Parse error: ${error}`);
        }
      };

      this.signalingSocket!.onerror = (error) => {
        console.error('❌ Signaling error:', error);
        this.debugErrors.push(`Signaling error: ${error}`);
      };

      this.signalingSocket!.onclose = (event) => {
        console.log('🔌 Signaling connection closed:', event.code, event.reason);
        if (event.code !== 1000) {
          this.debugErrors.push(`Signaling closed unexpectedly: ${event.code} - ${event.reason}`);
        }
      };

    } catch (error) {
      console.error('❌ Failed to start signaling server:', error);
    }
  }

  private async connectToHost(sessionCode: string, deviceId: string): Promise<void> {
    try {
      console.log(`🔍 Connecting to host with session: ${sessionCode}`);
      
      const httpSignalingServers = [
        `http://localhost:8080`,
        `https://user:768a9d987985a9fa9980949d5296b187@audio-sharing-app-tunnel-mdwb5fz4.devinapps.com`
      ];
      
      for (const serverUrl of httpSignalingServers) {
        try {
          console.log(`🔗 Attempting HTTP signaling connection to: ${serverUrl}`);
          const response = await fetch(`${serverUrl}/signaling`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'join',
              sessionCode: sessionCode,
              deviceId: deviceId,
              platform: Platform.OS,
              timestamp: Date.now()
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.type === 'joined_session') {
              console.log(`✅ HTTP signaling server connected: ${serverUrl}`);
              this.webSocketUrl = serverUrl;
              this.startHttpPolling(sessionCode);
              return;
            }
          }
        } catch (error) {
          console.log(`❌ HTTP signaling failed for ${serverUrl}:`, error);
        }
      }
      
      const signalingServers = [
        `wss://user:2e735e944a8dac33119387800ef6e48b@audio-sharing-app-tunnel-ayekalym.devinapps.com`,
        `wss://echo.websocket.org`,
        `wss://ws.postman-echo.com/raw`,
        `wss://connect.websocket.in/v3/1/${sessionCode}`,
        `wss://socketsbay.com/wss/v2/2/${sessionCode}/`
      ];
      
      let connected = false;
      this.connectionAttempts = 0;
      
      for (const serverUrl of signalingServers) {
        try {
          this.connectionAttempts++;
          console.log(`🔗 Attempting connection ${this.connectionAttempts}/${signalingServers.length} to: ${serverUrl}`);
          this.signalingSocket = new WebSocket(serverUrl);
          this.webSocketUrl = serverUrl;
          
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 8000);
            this.signalingSocket!.onopen = () => {
              clearTimeout(timeout);
              connected = true;
              console.log(`✅ Successfully connected to signaling server: ${serverUrl}`);
              resolve(true);
            };
            this.signalingSocket!.onerror = (error) => {
              clearTimeout(timeout);
              console.error(`❌ WebSocket connection error for ${serverUrl}:`, error);
              reject(new Error(`WebSocket connection failed: ${error}`));
            };
            this.signalingSocket!.onclose = (event) => {
              clearTimeout(timeout);
              console.warn(`🔌 WebSocket closed during connection attempt: ${event.code} - ${event.reason}`);
              reject(new Error(`WebSocket closed: ${event.code} - ${event.reason}`));
            };
          });
          
          if (connected) break;
        } catch (error) {
          console.warn(`Failed to connect to ${serverUrl}:`, error);
          this.debugErrors.push(`Signaling server ${serverUrl} failed: ${error}`);
          if (this.signalingSocket) {
            this.signalingSocket.close();
            this.signalingSocket = null;
          }
        }
      }
      
      if (!connected) {
        console.log('🔄 WebSocket servers failed, using localStorage signaling for local testing');
        this.setupLocalStorageSignaling(sessionCode, false);
        return;
      }
      
      this.signalingSocket!.onopen = () => {
        console.log('🔗 Connected to signaling server as client');
        this.debugErrors = this.debugErrors.filter(e => !e.includes('Signaling server'));
        const joinMessage = {
          type: 'join',
          sessionCode: sessionCode,
          deviceId: this.getDeviceId(),
          timestamp: Date.now(),
          action: 'join_session',
          platform: Platform.OS,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'React Native'
        };
        this.signalingSocket?.send(JSON.stringify(joinMessage));
        this.lastSentMessage = `join request to session ${sessionCode}`;
        this.messagesSent++;
        this.signalingMessageHistory.push({
          direction: 'sent',
          message: joinMessage,
          timestamp: new Date().toISOString()
        });
        console.log('📤 Sent join request:', joinMessage);
      };

      this.signalingSocket!.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          this.lastReceivedMessage = `${message.type} from ${message.deviceId || 'unknown'}`;
          this.messagesReceived++;
          this.signalingMessageHistory.push({
            direction: 'received',
            message: message,
            timestamp: new Date().toISOString()
          });
          console.log('📥 Client received message:', message);
          
          if (message.sessionCode === sessionCode || !message.sessionCode || message.type === 'echo') {
            if (message.type !== 'echo' && message.deviceId !== this.getDeviceId()) {
              await this.handleSignalingMessage(message);
            } else if (message.type === 'echo') {
              console.log('🔄 Received echo message, ignoring');
            } else {
              console.log('🚫 Ignoring message from self');
            }
          } else {
            console.log('🚫 Ignoring message for different session:', message.sessionCode);
          }
        } catch (error) {
          console.error('❌ Failed to parse signaling message:', error);
          this.debugErrors.push(`Parse error: ${error}`);
        }
      };

      this.signalingSocket!.onerror = (error) => {
        console.error('❌ Signaling error:', error);
        this.debugErrors.push(`Signaling error: ${error}`);
      };

      this.signalingSocket!.onclose = (event) => {
        console.log('🔌 Signaling connection closed:', event.code, event.reason);
        if (event.code !== 1000) {
          this.debugErrors.push(`Signaling closed unexpectedly: ${event.code} - ${event.reason}`);
        }
      };

    } catch (error) {
      console.error('❌ Failed to connect to host:', error);
    }
  }

  private async handleSignalingMessage(message: any): Promise<void> {
    try {
      console.log(`🔄 Handling signaling message: ${message.type}`);
      
      switch (message.type) {
        case 'offer':
          if (!this.isHost) {
            console.log('📨 Client: Received offer, creating answer');
            this.addConnectedDevice(message.deviceId || 'Host Device', true);
            await this.peerConnection.setRemoteDescription(message.offer);
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            const answerMessage = {
              type: 'answer',
              answer: answer,
              sessionCode: this.currentSession?.sessionId,
              deviceId: this.getDeviceId(),
              timestamp: Date.now()
            };
            this.sendSignalingMessage(answerMessage);
            this.lastSentMessage = `answer to ${message.deviceId || 'host'}`;
            console.log('📤 Sent answer:', answerMessage);
            
            const clientConnectedMessage = {
              type: 'device-connected',
              deviceId: this.getDeviceId(),
              isHost: false,
              sessionCode: this.currentSession?.sessionId,
              timestamp: Date.now()
            };
            this.sendSignalingMessage(clientConnectedMessage);
            console.log('📤 Client: Sent device connected notification:', clientConnectedMessage);
            
            this.notifyConnectionStateChange('connected');
          }
          break;

        case 'answer':
          if (this.isHost) {
            console.log('📨 Host: Received answer from client');
            this.addConnectedDevice(message.deviceId || 'Client Device', false);
            await this.peerConnection.setRemoteDescription(message.answer);
            console.log('✅ WebRTC connection established');
            
            this.notifyConnectionStateChange('connected');
          }
          break;

        case 'ice-candidate':
          console.log('🧊 Received ICE candidate');
          if (message.candidate) {
            await this.peerConnection.addIceCandidate(message.candidate);
            console.log('✅ ICE candidate added');
          }
          break;

        case 'join':
          if (this.isHost && message.sessionCode === this.currentSession?.sessionId) {
            console.log('👋 Host: Client wants to join, creating offer');
            this.addConnectedDevice(message.deviceId || 'Remote Device', false);
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            const offerMessage = {
              type: 'offer',
              offer: offer,
              sessionCode: this.currentSession?.sessionId,
              deviceId: this.getDeviceId(),
              timestamp: Date.now()
            };
            this.sendSignalingMessage(offerMessage);
            this.lastSentMessage = `offer to ${message.deviceId || 'client'}`;
            console.log('📤 Sent offer:', offerMessage);
          }
          break;

        case 'device-connected':
          console.log('📱 Device connected notification');
          this.addConnectedDevice(message.deviceId, message.isHost);
          break;

        case 'device-disconnected':
          console.log('📱 Device disconnected notification');
          this.removeConnectedDevice(message.deviceId);
          break;
      }
    } catch (error) {
      console.error('❌ Error handling signaling message:', error);
    }
  }

  private addConnectedDevice(deviceId: string, isHost: boolean): void {
    const existingDevice = this.connectedDevices.find(d => d.id === deviceId);
    if (!existingDevice) {
      const newDevice: CompanionDevice = {
        id: deviceId,
        name: deviceId,
        connected: true,
        isHost: isHost
      };
      this.connectedDevices.push(newDevice);
      console.log(`✅ Added connected device: ${deviceId} (Host: ${isHost})`);
      
      if (this.currentSession) {
        this.currentSession.connectedDevices = [...this.connectedDevices];
        console.log(`📱 Updated session devices:`, this.currentSession.connectedDevices);
      }
    } else {
      existingDevice.connected = true;
      console.log(`🔄 Updated existing device: ${deviceId}`);
    }
  }

  private removeConnectedDevice(deviceId: string): void {
    const deviceIndex = this.connectedDevices.findIndex(d => d.id === deviceId);
    if (deviceIndex !== -1) {
      this.connectedDevices.splice(deviceIndex, 1);
      console.log(`❌ Removed connected device: ${deviceId}`);
      
      if (this.currentSession) {
        this.currentSession.connectedDevices = [...this.connectedDevices];
        console.log(`📱 Updated session devices:`, this.currentSession.connectedDevices);
      }
    }
  }

  private notifyConnectionStateChange(state: string): void {
    if (this.signalingSocket && this.currentSession) {
      const stateMessage = {
        type: state === 'connected' ? 'device-connected' : 'device-disconnected',
        deviceId: this.getDeviceId(),
        isHost: this.isHost,
        sessionCode: this.currentSession.sessionId,
        timestamp: Date.now()
      };
      this.signalingSocket.send(JSON.stringify(stateMessage));
      this.lastSentMessage = `${state} notification`;
      console.log(`📤 Sent connection state: ${state}`, stateMessage);
    }
  }

  async stopSession(): Promise<void> {
    try {
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => track.stop());
        this.audioStream = null;
      }

      if (this.signalingSocket) {
        this.signalingSocket.close();
        this.signalingSocket = null;
      }

      if (this.localAudio) {
        this.localAudio.pause();
        this.localAudio.srcObject = null;
        this.localAudio = null;
      }

      this.currentSession = null;
      this.isHost = false;
      this.isConnected = false;
      this.connectedDevices = [];
      this.lastSentMessage = '';
      this.lastReceivedMessage = '';
      this.messagesSent = 0;
      this.messagesReceived = 0;
      this.debugErrors = [];
      
      console.log('Session stopped');
    } catch (error) {
      console.error('Failed to stop session:', error);
    }
  }

  getConnectionStatus(): ConnectionStatus {
    const status = {
      isHost: this.isHost,
      isConnected: this.isConnected,
      sessionId: this.currentSession?.sessionId || null,
      connectedDevices: this.currentSession?.connectedDevices || this.connectedDevices,
      syncOffset: this.syncOffset,
    };
    console.log('📊 Current connection status:', status);
    return status;
  }

  getDebugInfo(): any {
    const webSocketState = this.signalingSocket?.readyState;
    let webSocketStateText = 'Unknown';
    if (webSocketState === WebSocket.CONNECTING) webSocketStateText = 'Connecting';
    else if (webSocketState === WebSocket.OPEN) webSocketStateText = 'Open';
    else if (webSocketState === WebSocket.CLOSING) webSocketStateText = 'Closing';
    else if (webSocketState === WebSocket.CLOSED) webSocketStateText = 'Closed';

    return {
      isHost: this.isHost,
      isConnected: this.isConnected,
      sessionId: this.currentSession?.sessionId,
      deviceId: this.getDeviceId(),
      connectedDevices: this.connectedDevices,
      currentSession: this.currentSession,
      peerConnectionState: this.peerConnection?.connectionState,
      signalingState: this.peerConnection?.signalingState,
      iceConnectionState: this.peerConnection?.iceConnectionState,
      iceGatheringState: this.peerConnection?.iceGatheringState,
      hasAudioStream: !!this.audioStream,
      audioTrackCount: this.audioStream?.getTracks().length || 0,
      signalingConnected: this.signalingSocket?.readyState === WebSocket.OPEN,
      webSocketState: webSocketStateText,
      webSocketUrl: this.webSocketUrl,
      connectionAttempts: this.connectionAttempts,
      syncOffset: this.syncOffset,
      lastSentMessage: this.lastSentMessage,
      lastReceivedMessage: this.lastReceivedMessage,
      messagesSent: this.messagesSent || 0,
      messagesReceived: this.messagesReceived || 0,
      signalingMessages: this.signalingMessageHistory.slice(-10) || [],
      errors: this.debugErrors || [],
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'React Native'
    };
  }

  exportDebugLogs(): string {
    const debugInfo = this.getDebugInfo();
    const logData = {
      timestamp: debugInfo.timestamp,
      deviceInfo: {
        role: debugInfo.isHost ? 'Host' : 'Client',
        deviceId: debugInfo.deviceId,
        sessionId: debugInfo.sessionId,
        connected: debugInfo.isConnected,
        platform: debugInfo.platform,
        userAgent: debugInfo.userAgent
      },
      webrtcStatus: {
        peerConnectionState: debugInfo.peerConnectionState,
        signalingState: debugInfo.signalingState,
        iceConnectionState: debugInfo.iceConnectionState,
        iceGatheringState: debugInfo.iceGatheringState,
        webSocketState: debugInfo.webSocketState,
        webSocketUrl: debugInfo.webSocketUrl,
        connectionAttempts: debugInfo.connectionAttempts
      },
      mediaStatus: {
        hasAudioStream: debugInfo.hasAudioStream,
        audioTrackCount: debugInfo.audioTrackCount,
        syncOffset: debugInfo.syncOffset
      },
      connectedDevices: debugInfo.connectedDevices,
      signalingMessages: {
        lastSent: debugInfo.lastSentMessage,
        lastReceived: debugInfo.lastReceivedMessage,
        messagesSent: debugInfo.messagesSent,
        messagesReceived: debugInfo.messagesReceived,
        messageHistory: debugInfo.signalingMessages || []
      },
      errors: debugInfo.errors,
      fullSession: debugInfo.currentSession
    };
    
    return JSON.stringify(logData, null, 2);
  }

  setSyncOffset(offset: number): void {
    this.syncOffset = offset;
    if (this.localAudio && Platform.OS === 'web') {
      this.localAudio.currentTime += offset / 1000;
    }
    console.log(`Setting sync offset to ${offset}ms`);
  }

  getCurrentSession(): AudioSession | null {
    return this.currentSession;
  }

  private setupLocalStorageSignaling(sessionCode: string, isHost: boolean): void {
    console.log(`🔗 Using localStorage signaling for session: ${sessionCode} as ${isHost ? 'host' : 'client'}`);
    
    const storageKey = `splitsound_session_${sessionCode}`;
    const deviceId = this.getDeviceId();
    
    if (isHost) {
      const hostMessage = {
        type: 'host',
        sessionCode: sessionCode,
        deviceId: deviceId,
        timestamp: Date.now()
      };
      
      localStorage.setItem(storageKey, JSON.stringify({
        host: hostMessage,
        clients: [],
        messages: [hostMessage]
      }));
      
      console.log('🔗 Host session initialized in localStorage');
      this.lastSentMessage = `${hostMessage.type} from ${deviceId}`;
      this.messagesSent++;
      
      this.startLocalStoragePolling(storageKey, isHost);
    } else {
      const joinMessage = {
        type: 'join',
        sessionCode: sessionCode,
        deviceId: deviceId,
        timestamp: Date.now()
      };
      
      const sessionData = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (sessionData.host) {
        sessionData.clients = sessionData.clients || [];
        sessionData.clients.push(joinMessage);
        sessionData.messages = sessionData.messages || [];
        sessionData.messages.push(joinMessage);
        
        localStorage.setItem(storageKey, JSON.stringify(sessionData));
        
        console.log('🔗 Client joined session in localStorage');
        this.lastSentMessage = `${joinMessage.type} from ${deviceId}`;
        this.messagesSent++;
        
        this.addConnectedDevice(sessionData.host.deviceId || 'Host Device', true);
        
        this.sendSignalingMessage(joinMessage);
        
        this.handleSignalingMessage(sessionData.host);
        
        this.startLocalStoragePolling(storageKey, isHost);
      } else {
        throw new Error('Host session not found in localStorage');
      }
    }
  }

  private startHttpPolling(sessionCode: string): void {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${this.webSocketUrl}/poll?session=${sessionCode}&device=${this.getDeviceId()}`);
        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            data.messages.forEach((message: any) => {
              console.log('📥 Received HTTP message:', message.type);
              this.messagesReceived++;
              this.lastReceivedMessage = `${message.type} from ${message.deviceId}`;
              this.signalingMessageHistory.push({
                direction: 'received',
                message: message,
                timestamp: new Date().toISOString()
              });
              this.handleSignalingMessage(message);
            });
          }
        }
      } catch (error) {
        console.error('❌ HTTP polling error:', error);
        this.debugErrors.push(`HTTP polling error: ${error}`);
      }
      
      if (!this.isConnected) {
        clearInterval(pollInterval);
      }
    }, 2000);
  }

  private startLocalStoragePolling(storageKey: string, isHost: boolean): void {
    const pollInterval = setInterval(() => {
      try {
        const sessionData = JSON.parse(localStorage.getItem(storageKey) || '{}');
        const messages = sessionData.messages || [];
        
        messages.forEach((message: any) => {
          if (message.deviceId !== this.getDeviceId()) {
            if (!this.processedMessages.has(message.timestamp)) {
              this.processedMessages.add(message.timestamp);
              this.lastReceivedMessage = `${message.type} from ${message.deviceId}`;
              this.messagesReceived++;
              this.handleSignalingMessage(message);
            }
          }
        });
        
        if (!this.currentSession) {
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('localStorage polling error:', error);
        clearInterval(pollInterval);
      }
    }, 1000);
  }

  private processedMessages = new Set<number>();
  
  private async sendSignalingMessage(message: any): Promise<void> {
    if (this.webSocketUrl && this.webSocketUrl.startsWith('http')) {
      try {
        const messageWithId = {
          ...message,
          messageId: Date.now() + Math.random(),
          senderDeviceId: this.getDeviceId(),
          deviceId: this.getDeviceId(),
          sessionCode: this.currentSession?.sessionId
        };
        
        const response = await fetch(`${this.webSocketUrl}/signaling`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messageWithId)
        });
        
        if (response.ok) {
          this.messagesSent++;
          this.lastSentMessage = `${message.type} to ${message.sessionCode || 'unknown'}`;
          this.signalingMessageHistory.push({
            direction: 'sent',
            message: messageWithId,
            timestamp: new Date().toISOString()
          });
          console.log('📤 Sent message via HTTP:', messageWithId);
          return;
        } else {
          console.error('HTTP signaling send failed:', response.status);
          this.debugErrors.push(`HTTP signaling send error: ${response.status}`);
        }
      } catch (error) {
        console.error('HTTP signaling send error:', error);
        this.debugErrors.push(`HTTP signaling send error: ${error}`);
      }
    }
    
    if (this.signalingSocket && this.signalingSocket.readyState === WebSocket.OPEN) {
      try {
        const messageWithId = {
          ...message,
          messageId: Date.now() + Math.random(),
          senderDeviceId: this.getDeviceId()
        };
        this.signalingSocket.send(JSON.stringify(messageWithId));
        this.messagesSent++;
        this.lastSentMessage = `${message.type} to ${message.sessionCode || 'unknown'}`;
        this.signalingMessageHistory.push({
          direction: 'sent',
          message: messageWithId,
          timestamp: new Date().toISOString()
        });
        console.log('📤 Sent message via WebSocket:', messageWithId);
      } catch (error) {
        console.error('WebSocket send error:', error);
        this.debugErrors.push(`WebSocket send error: ${error}`);
        this.fallbackToLocalStorage(message);
      }
    } else if (this.currentSession?.sessionId) {
      this.fallbackToLocalStorage(message);
    } else {
      console.error('No signaling method available');
      this.debugErrors.push('No signaling method available for message: ' + message.type);
    }
  }

  private fallbackToLocalStorage(message: any): void {
    if (!this.currentSession?.sessionId) return;
    
    const storageKey = `splitsound_session_${this.currentSession.sessionId}`;
    try {
      const sessionData = JSON.parse(localStorage.getItem(storageKey) || '{}');
      sessionData.messages = sessionData.messages || [];
      
      const messageWithTimestamp = {
        ...message,
        timestamp: Date.now(),
        deviceId: this.getDeviceId()
      };
      
      sessionData.messages.push(messageWithTimestamp);
      localStorage.setItem(storageKey, JSON.stringify(sessionData));
      this.messagesSent++;
      console.log('📤 Sent message via localStorage fallback:', messageWithTimestamp);
      this.lastSentMessage = `${message.type} from ${this.getDeviceId()}`;
      
      if (['offer', 'answer', 'ice-candidate'].includes(message.type)) {
        console.log('🔄 WebRTC message stored for localStorage signaling');
      }
    } catch (error) {
      console.error('Failed to send message via localStorage:', error);
      this.debugErrors.push(`localStorage send error: ${error}`);
    }
  }
}

export default SplitSoundCompanionService;
