import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, Alert } from 'react-native';
import AudioSharingButton from './src/components/AudioSharingButton';
import DeviceList from './src/components/DeviceList';
import SyncAdjustment from './src/components/SyncAdjustment';
import AudioSharingService from './src/services/AudioSharingService';
import { AppState, AudioSharingCapabilities, ConnectionStatus } from './src/types';
import i18n from './src/utils/i18n';

export default function App() {
  const [appState, setAppState] = useState<AppState>({
    capabilities: {
      supportsAudioSharing: false,
      supportsDualAudio: false,
      supportsAuracast: false,
    },
    connectionStatus: {
      isSharing: false,
      connectedDevices: [],
      sharingMethod: null,
      syncOffset: 0,
    },
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setAppState(prev => ({ ...prev, isLoading: true }));
      
      const capabilities = await AudioSharingService.detectCapabilities();
      const connectionStatus = AudioSharingService.getConnectionStatus();
      
      setAppState(prev => ({
        ...prev,
        capabilities,
        connectionStatus,
        isLoading: false,
      }));
    } catch (error) {
      setAppState(prev => ({
        ...prev,
        error: 'Failed to initialize app',
        isLoading: false,
      }));
    }
  };

  const handleShareAudio = async () => {
    try {
      setAppState(prev => ({ ...prev, isLoading: true }));

      if (appState.connectionStatus.isSharing) {
        await AudioSharingService.stopSharing();
      } else {
        let success = false;
        
        if (appState.capabilities.supportsAudioSharing || 
            appState.capabilities.supportsDualAudio || 
            appState.capabilities.supportsAuracast) {
          success = await AudioSharingService.startBluetoothSharing();
        }
        
        if (!success) {
          success = await AudioSharingService.startWiFiSharing();
        }

        if (!success) {
          Alert.alert(
            i18n.t('app.permissionRequired'),
            i18n.t('app.bluetoothPermissionRequired')
          );
        }
      }

      const connectionStatus = AudioSharingService.getConnectionStatus();
      setAppState(prev => ({
        ...prev,
        connectionStatus,
        isLoading: false,
      }));
    } catch (error) {
      setAppState(prev => ({
        ...prev,
        error: 'Failed to toggle audio sharing',
        isLoading: false,
      }));
    }
  };

  const handleDevicePress = async (deviceId: string) => {
    try {
      const success = await AudioSharingService.connectToDevice(deviceId);
      if (success) {
        const connectionStatus = AudioSharingService.getConnectionStatus();
        setAppState(prev => ({ ...prev, connectionStatus }));
      }
    } catch (error) {
      console.error('Device connection failed:', error);
    }
  };

  const handleSyncChange = (offset: number) => {
    AudioSharingService.setSyncOffset(offset);
    setAppState(prev => ({
      ...prev,
      connectionStatus: {
        ...prev.connectionStatus,
        syncOffset: offset,
      },
    }));
  };

  const getCapabilityText = () => {
    const { capabilities } = appState;
    if (capabilities.supportsAudioSharing) {
      return i18n.t('app.deviceSupportsAudioSharing');
    } else if (capabilities.supportsDualAudio) {
      return i18n.t('app.deviceSupportsDualAudio');
    } else if (capabilities.supportsAuracast) {
      return i18n.t('app.deviceSupportsAuracast');
    } else {
      return i18n.t('app.bluetoothNotSupported');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{i18n.t('app.title')}</Text>
        
        <Text style={styles.capabilityText}>{getCapabilityText()}</Text>
        
        {!appState.capabilities.supportsAudioSharing && 
         !appState.capabilities.supportsDualAudio && 
         !appState.capabilities.supportsAuracast && (
          <Text style={styles.fallbackText}>{i18n.t('app.usingWiFiFallback')}</Text>
        )}

        <AudioSharingButton
          isSharing={appState.connectionStatus.isSharing}
          isLoading={appState.isLoading}
          onPress={handleShareAudio}
        />

        {appState.connectionStatus.isSharing && (
          <>
            <DeviceList
              devices={appState.connectionStatus.connectedDevices}
              onDevicePress={handleDevicePress}
            />
            
            {appState.connectionStatus.sharingMethod === 'wifi' && (
              <SyncAdjustment
                syncOffset={appState.connectionStatus.syncOffset}
                onSyncChange={handleSyncChange}
              />
            )}
          </>
        )}

        {appState.error && (
          <Text style={styles.errorText}>{appState.error}</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  capabilityText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  fallbackText: {
    fontSize: 14,
    color: '#ff6600',
    textAlign: 'center',
    marginBottom: 30,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 14,
    color: '#ff4444',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
});
