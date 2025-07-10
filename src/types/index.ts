export interface CompanionDevice {
  id: string;
  name: string;
  connected: boolean;
  isHost: boolean;
}

export interface AudioSession {
  sessionId: string;
  hostDeviceId: string;
  connectedDevices: CompanionDevice[];
  isActive: boolean;
  syncOffset: number;
}

export interface ConnectionStatus {
  isHost: boolean;
  isConnected: boolean;
  sessionId: string | null;
  connectedDevices: CompanionDevice[];
  syncOffset: number;
}

export interface AppState {
  connectionStatus: ConnectionStatus;
  isLoading: boolean;
  error: string | null;
  mode: 'idle' | 'hosting' | 'joining';
}
