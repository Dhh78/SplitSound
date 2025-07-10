import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { AudioSharingCapabilities, AudioDevice, ConnectionStatus } from '../types';

let BleManager: any = null;
let BleDevice: any = null;

if (Platform.OS !== 'web') {
  try {
    const bleModule = require('react-native-ble-plx');
    BleManager = bleModule.BleManager;
    BleDevice = bleModule.Device;
  } catch (error) {
    console.warn('Bluetooth not available on this platform');
  }
}

class AudioSharingService {
  private bleManager: any = null;
  private connectedDevices: AudioDevice[] = [];
  private isSharing: boolean = false;
  private sharingMethod: 'bluetooth' | 'wifi' | null = null;

  constructor() {
    if (Platform.OS !== 'web' && BleManager) {
      this.bleManager = new BleManager();
    }
  }

  async detectCapabilities(): Promise<AudioSharingCapabilities> {
    const capabilities: AudioSharingCapabilities = {
      supportsAudioSharing: false,
      supportsDualAudio: false,
      supportsAuracast: false,
      deviceModel: Device.modelName || 'Unknown',
    };

    if (Platform.OS === 'ios') {
      const systemVersion = parseFloat(Device.osVersion || '0');
      capabilities.supportsAudioSharing = systemVersion >= 13.0;
    } else if (Platform.OS === 'android') {
      const systemVersion = parseInt(Device.osVersion || '0');
      const deviceBrand = Device.brand?.toLowerCase() || '';
      
      if (deviceBrand.includes('samsung') && systemVersion >= 26) {
        capabilities.supportsDualAudio = true;
      }
      
      if (systemVersion >= 35) { // Android 15 is API level 35
        capabilities.supportsAuracast = true;
      }
    }

    return capabilities;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'web' || !this.bleManager) {
        return false;
      }
      
      const bluetoothState = await this.bleManager.state();
      if (bluetoothState !== 'PoweredOn') {
        return false;
      }
      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  async startBluetoothSharing(): Promise<boolean> {
    try {
      if (Platform.OS === 'web' || !this.bleManager) {
        console.log('Bluetooth not available on web platform');
        return false;
      }

      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        return false;
      }

      this.bleManager.startDeviceScan(null, null, (error: any, device: any) => {
        if (error) {
          console.error('Bluetooth scan error:', error);
          return;
        }

        if (device && device.name) {
          const audioDevice: AudioDevice = {
            id: device.id,
            name: device.name,
            type: 'bluetooth',
            connected: false,
          };
          
          const existingIndex = this.connectedDevices.findIndex(d => d.id === device.id);
          if (existingIndex === -1) {
            this.connectedDevices.push(audioDevice);
          }
        }
      });

      this.isSharing = true;
      this.sharingMethod = 'bluetooth';
      return true;
    } catch (error) {
      console.error('Bluetooth sharing failed:', error);
      return false;
    }
  }

  async startWiFiSharing(): Promise<boolean> {
    try {
      console.log('Starting Wi-Fi audio sharing...');
      
      this.isSharing = true;
      this.sharingMethod = 'wifi';
      return true;
    } catch (error) {
      console.error('Wi-Fi sharing failed:', error);
      return false;
    }
  }

  async stopSharing(): Promise<void> {
    try {
      if (this.sharingMethod === 'bluetooth' && this.bleManager) {
        this.bleManager.stopDeviceScan();
        for (const device of this.connectedDevices) {
          if (device.type === 'bluetooth' && device.connected) {
          }
        }
      } else if (this.sharingMethod === 'wifi') {
        console.log('Stopping Wi-Fi sharing...');
      }

      this.isSharing = false;
      this.sharingMethod = null;
      this.connectedDevices = [];
    } catch (error) {
      console.error('Stop sharing failed:', error);
    }
  }

  getConnectionStatus(): ConnectionStatus {
    return {
      isSharing: this.isSharing,
      connectedDevices: this.connectedDevices,
      sharingMethod: this.sharingMethod,
      syncOffset: 0, // Default sync offset
    };
  }

  async connectToDevice(deviceId: string): Promise<boolean> {
    try {
      const device = this.connectedDevices.find(d => d.id === deviceId);
      if (!device) {
        return false;
      }

      if (device.type === 'bluetooth' && this.bleManager) {
        const bleDevice = await this.bleManager.connectToDevice(deviceId);
        await bleDevice.discoverAllServicesAndCharacteristics();
        
        device.connected = true;
        return true;
      }

      return false;
    } catch (error) {
      console.error('Device connection failed:', error);
      return false;
    }
  }

  setSyncOffset(offset: number): void {
    console.log(`Setting sync offset to ${offset}ms`);
  }
}

export default new AudioSharingService();
