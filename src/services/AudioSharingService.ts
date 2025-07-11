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
    } catch (error) {
      console.error('❌ Audio permission request failed:', error);
      if (error instanceof Error) {
        if (error.name === 'NotFoundError') {
          console.warn('⚠️ No audio input device found, continuing without audio stream for signaling test');
        } else if (error.name === 'NotAllowedError') {
          console.error('Audio permission denied by user. Please grant microphone access.');
          return false;
        }
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
        this.signalingSocket?.send(JSON.stringify(deviceConnectedMessage));
        console.log('📤 Sent device connected notification:', deviceConnectedMessage);
      };

      this.peerConnection.onicecandidate = (event: any) => {
        if (event.candidate && this.signalingSocket) {
          const candidateMessage = {
            type: 'ice-candidate',
            candidate: event.candidate,
            sessionCode: this.currentSession?.sessionId,
            deviceId: this.getDeviceId(),
            timestamp: Date.now()
          };
          this.signalingSocket.send(JSON.stringify(candidateMessage));
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
      
      this.signalingSocket = new WebSocket(`wss://socketsbay.com/wss/v2/1/${sessionCode}/`);
      
      this.signalingSocket.onopen = () => {
        console.log('🔗 Signaling server connected as host');
        const hostMessage = {
          type: 'host',
          sessionCode: sessionCode,
          deviceId: this.getDeviceId(),
          timestamp: Date.now()
        };
        this.signalingSocket?.send(JSON.stringify(hostMessage));
        this.lastSentMessage = `host to session ${sessionCode}`;
        this.messagesSent++;
        console.log('📤 Sent host registration:', hostMessage);
      };

      this.signalingSocket.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          this.lastReceivedMessage = `${message.type} from ${message.deviceId || 'unknown'}`;
          this.messagesReceived++;
          console.log('📥 Host received message:', message);
          if (message.sessionCode === sessionCode || !message.sessionCode) {
            await this.handleSignalingMessage(message);
          } else {
            console.log('🚫 Ignoring message for different session:', message.sessionCode);
          }
        } catch (error) {
          console.error('❌ Failed to parse signaling message:', error);
          this.debugErrors.push(`Parse error: ${error}`);
        }
      };

      this.signalingSocket.onerror = (error) => {
        console.error('❌ Signaling error:', error);
      };

      this.signalingSocket.onclose = (event) => {
        console.log('🔌 Signaling connection closed:', event.code, event.reason);
      };

    } catch (error) {
      console.error('❌ Failed to start signaling server:', error);
    }
  }

  private async connectToHost(sessionCode: string, deviceId: string): Promise<void> {
    try {
      console.log(`🔍 Connecting to host with session: ${sessionCode}`);
      
      this.signalingSocket = new WebSocket(`wss://socketsbay.com/wss/v2/1/${sessionCode}/`);
      
      this.signalingSocket.onopen = () => {
        console.log('🔗 Connected to signaling server as client');
        const joinMessage = {
          type: 'join',
          sessionCode: sessionCode,
          deviceId: this.getDeviceId(),
          timestamp: Date.now()
        };
        this.signalingSocket?.send(JSON.stringify(joinMessage));
        this.lastSentMessage = `join to session ${sessionCode}`;
        this.messagesSent++;
        console.log('📤 Sent join request:', joinMessage);
      };

      this.signalingSocket.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          this.lastReceivedMessage = `${message.type} from ${message.deviceId || 'unknown'}`;
          this.messagesReceived++;
          console.log('📥 Client received message:', message);
          if (message.sessionCode === sessionCode || !message.sessionCode) {
            await this.handleSignalingMessage(message);
          } else {
            console.log('🚫 Ignoring message for different session:', message.sessionCode);
          }
        } catch (error) {
          console.error('❌ Failed to parse signaling message:', error);
          this.debugErrors.push(`Parse error: ${error}`);
        }
      };

      this.signalingSocket.onerror = (error) => {
        console.error('❌ Signaling error:', error);
      };

      this.signalingSocket.onclose = (event) => {
        console.log('🔌 Signaling connection closed:', event.code, event.reason);
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
            this.signalingSocket?.send(JSON.stringify(answerMessage));
            this.lastSentMessage = `answer to ${message.deviceId || 'host'}`;
            console.log('📤 Sent answer:', answerMessage);
            
            const clientConnectedMessage = {
              type: 'device-connected',
              deviceId: this.getDeviceId(),
              isHost: false,
              sessionCode: this.currentSession?.sessionId,
              timestamp: Date.now()
            };
            this.signalingSocket?.send(JSON.stringify(clientConnectedMessage));
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
            this.signalingSocket?.send(JSON.stringify(offerMessage));
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
      syncOffset: this.syncOffset,
      lastSentMessage: this.lastSentMessage,
      lastReceivedMessage: this.lastReceivedMessage,
      messagesSent: this.messagesSent || 0,
      messagesReceived: this.messagesReceived || 0,
      errors: this.debugErrors || []
    };
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
}

export default new SplitSoundCompanionService();
