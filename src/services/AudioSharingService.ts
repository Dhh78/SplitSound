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
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 44100
          } 
        });
        this.audioStream = stream;
        return true;
      } else {
        const { mediaDevices } = require('react-native-webrtc');
        const stream = await mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
          video: false
        });
        this.audioStream = stream;
        return true;
      }
    } catch (error) {
      console.error('Audio permission request failed:', error);
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
        console.log('Received remote audio stream');
        if (!this.isHost) {
          this.playRemoteAudio(event.streams[0]);
        }
      };

      this.peerConnection.onicecandidate = (event: any) => {
        if (event.candidate && this.signalingSocket) {
          this.signalingSocket.send(JSON.stringify({
            type: 'ice-candidate',
            candidate: event.candidate
          }));
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
      console.log(`Starting signaling for session: ${sessionCode}`);
      
      this.signalingSocket = new WebSocket('wss://echo.websocket.org');
      
      this.signalingSocket.onopen = () => {
        console.log('Signaling server connected');
        this.signalingSocket?.send(JSON.stringify({
          type: 'host',
          sessionCode: sessionCode
        }));
      };

      this.signalingSocket.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        await this.handleSignalingMessage(message);
      };

      this.signalingSocket.onerror = (error) => {
        console.error('Signaling error:', error);
      };

    } catch (error) {
      console.error('Failed to start signaling server:', error);
    }
  }

  private async connectToHost(sessionCode: string, deviceId: string): Promise<void> {
    try {
      console.log(`Connecting to host with session: ${sessionCode}`);
      
      this.signalingSocket = new WebSocket('wss://echo.websocket.org');
      
      this.signalingSocket.onopen = () => {
        console.log('Connected to signaling server');
        this.signalingSocket?.send(JSON.stringify({
          type: 'join',
          sessionCode: sessionCode,
          deviceId: deviceId
        }));
      };

      this.signalingSocket.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        await this.handleSignalingMessage(message);
      };

      this.signalingSocket.onerror = (error) => {
        console.error('Signaling error:', error);
      };

    } catch (error) {
      console.error('Failed to connect to host:', error);
    }
  }

  private async handleSignalingMessage(message: any): Promise<void> {
    try {
      switch (message.type) {
        case 'offer':
          if (!this.isHost) {
            await this.peerConnection.setRemoteDescription(message.offer);
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            this.signalingSocket?.send(JSON.stringify({
              type: 'answer',
              answer: answer
            }));
          }
          break;

        case 'answer':
          if (this.isHost) {
            await this.peerConnection.setRemoteDescription(message.answer);
          }
          break;

        case 'ice-candidate':
          await this.peerConnection.addIceCandidate(message.candidate);
          break;

        case 'join':
          if (this.isHost) {
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            this.signalingSocket?.send(JSON.stringify({
              type: 'offer',
              offer: offer
            }));
          }
          break;
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
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
    return {
      isHost: this.isHost,
      isConnected: this.isConnected,
      sessionId: this.currentSession?.sessionId || null,
      connectedDevices: this.connectedDevices,
      syncOffset: this.syncOffset,
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
