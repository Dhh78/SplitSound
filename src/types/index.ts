export interface AudioDevice {
  id: string;
  name: string;
  type: 'bluetooth' | 'wifi';
  connected: boolean;
}

export interface AudioSharingCapabilities {
  supportsAudioSharing: boolean; // Apple Audio Sharing
  supportsDualAudio: boolean; // Samsung Dual Audio
  supportsAuracast: boolean; // Bluetooth LE Audio / Auracast
  bluetoothVersion?: string;
  deviceModel?: string;
}

export interface ConnectionStatus {
  isSharing: boolean;
  connectedDevices: AudioDevice[];
  sharingMethod: 'bluetooth' | 'wifi' | null;
  syncOffset: number;
}

export interface AppState {
  capabilities: AudioSharingCapabilities;
  connectionStatus: ConnectionStatus;
  isLoading: boolean;
  error: string | null;
}
