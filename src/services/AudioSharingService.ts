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
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true
        });
        this.audioStream = stream;
        console.log('✅ Audio permissions granted (Web)');
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
          console.error('No audio input device found. Please check microphone connection.');
        } else if (error.name === 'NotAllowedError') {
          console.error('Audio permission denied by user. Please grant microphone access.');
        }
      }
      return false;
    }
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
      const deviceId = Device.modelName || 'Unknown Device';
      
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
      const deviceId = Device.modelName || 'Unknown Device';
      
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
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      if (this.isHost && this.audioStream) {
        this.audioStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.audioStream);
        });
      }

      this.peerConnection.ontrack = (event: any) => {
        console.log('🎵 Received remote audio stream');
        if (!this.isHost) {
          this.playRemoteAudio(event.streams[0]);
        }
        const deviceConnectedMessage = {
          type: 'device-connected',
          deviceId: Device.modelName || 'Connected Device',
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
            deviceId: Device.modelName || 'Unknown Device',
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
          deviceId: Device.modelName || 'Host Device',
          timestamp: Date.now()
        };
        this.signalingSocket?.send(JSON.stringify(hostMessage));
        console.log('📤 Sent host registration:', hostMessage);
      };

      this.signalingSocket.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📥 Host received message:', message);
          if (message.sessionCode === sessionCode || !message.sessionCode) {
            await this.handleSignalingMessage(message);
          } else {
            console.log('🚫 Ignoring message for different session:', message.sessionCode);
          }
        } catch (error) {
          console.error('❌ Failed to parse signaling message:', error);
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
          deviceId: deviceId,
          timestamp: Date.now()
        };
        this.signalingSocket?.send(JSON.stringify(joinMessage));
        console.log('📤 Sent join request:', joinMessage);
      };

      this.signalingSocket.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📥 Client received message:', message);
          if (message.sessionCode === sessionCode || !message.sessionCode) {
            await this.handleSignalingMessage(message);
          } else {
            console.log('🚫 Ignoring message for different session:', message.sessionCode);
          }
        } catch (error) {
          console.error('❌ Failed to parse signaling message:', error);
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
            await this.peerConnection.setRemoteDescription(message.offer);
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            const answerMessage = {
              type: 'answer',
              answer: answer,
              sessionCode: this.currentSession?.sessionId,
              deviceId: Device.modelName || 'Client Device',
              timestamp: Date.now()
            };
            this.signalingSocket?.send(JSON.stringify(answerMessage));
            console.log('📤 Sent answer:', answerMessage);
          }
          break;

        case 'answer':
          if (this.isHost) {
            console.log('📨 Host: Received answer');
            await this.peerConnection.setRemoteDescription(message.answer);
            this.addConnectedDevice(message.deviceId || 'Remote Device', false);
            console.log('✅ WebRTC connection established');
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
              deviceId: Device.modelName || 'Host Device',
              timestamp: Date.now()
            };
            this.signalingSocket?.send(JSON.stringify(offerMessage));
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
        deviceId: Device.modelName || 'Unknown Device',
        isHost: this.isHost,
        sessionCode: this.currentSession.sessionId,
        timestamp: Date.now()
      };
      this.signalingSocket.send(JSON.stringify(stateMessage));
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
      connectedDevices: this.connectedDevices,
      currentSession: this.currentSession,
      peerConnectionState: this.peerConnection?.connectionState,
      signalingState: this.peerConnection?.signalingState,
      iceConnectionState: this.peerConnection?.iceConnectionState,
      hasAudioStream: !!this.audioStream,
      signalingConnected: this.signalingSocket?.readyState === WebSocket.OPEN,
      syncOffset: this.syncOffset
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
