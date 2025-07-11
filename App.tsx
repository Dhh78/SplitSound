import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Alert, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AudioSharingButton from './src/components/AudioSharingButton';
import DeviceList from './src/components/DeviceList';
import SyncAdjustment from './src/components/SyncAdjustment';
import QRCodeGenerator from './src/components/QRCodeGenerator';
import QRCodeScanner from './src/components/QRCodeScanner';
import DebugPanel from './src/components/DebugPanel';
import AudioSharingService from './src/services/AudioSharingService';
import { AppState, ConnectionStatus } from './src/types';
import i18n from './src/utils/i18n';

export default function App() {
  const [appState, setAppState] = useState<AppState>({
    connectionStatus: {
      isHost: false,
      isConnected: false,
      sessionId: null,
      connectedDevices: [],
      syncOffset: 0,
    },
    isLoading: false,
    error: null,
    mode: 'idle',
  });

  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  useEffect(() => {
    updateConnectionStatus();
  }, []);

  const updateConnectionStatus = () => {
    const status = AudioSharingService.getConnectionStatus();
    setAppState(prev => ({
      ...prev,
      connectionStatus: status,
    }));
  };

  const handleShareAudio = async () => {
    setAppState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await AudioSharingService.startHosting();
      if (result.success) {
        setAppState(prev => ({
          ...prev,
          mode: 'hosting',
          isLoading: false,
        }));
        updateConnectionStatus();
      } else {
        setAppState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Failed to start hosting',
        }));
      }
    } catch (error) {
      setAppState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  };

  const handleJoinAudio = () => {
    setShowQRScanner(true);
  };

  const handleQRScanSuccess = async (sessionCode: string) => {
    setShowQRScanner(false);
    setAppState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await AudioSharingService.joinSession(sessionCode);
      if (result.success) {
        setAppState(prev => ({
          ...prev,
          mode: 'joining',
          isLoading: false,
        }));
        updateConnectionStatus();
      } else {
        setAppState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Failed to join session',
        }));
      }
    } catch (error) {
      setAppState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  };

  const handleQRScanCancel = () => {
    setShowQRScanner(false);
  };

  const handleStopSharing = async () => {
    setAppState(prev => ({ ...prev, isLoading: true }));
    
    try {
      await AudioSharingService.stopSession();
      setAppState(prev => ({
        ...prev,
        mode: 'idle',
        isLoading: false,
        error: null,
      }));
      updateConnectionStatus();
    } catch (error) {
      setAppState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to stop session',
      }));
    }
  };

  const handleDevicePress = (deviceId: string) => {
    console.log('Device pressed:', deviceId);
  };

  const handleSyncChange = (offset: number) => {
    AudioSharingService.setSyncOffset(offset);
    updateConnectionStatus();
  };

  if (showQRScanner) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <QRCodeScanner
          onScanSuccess={handleQRScanSuccess}
          onCancel={handleQRScanCancel}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{i18n.t('app.title')}</Text>
          <TouchableOpacity 
            style={styles.debugButton}
            onPress={() => setShowDebugPanel(true)}
          >
            <Text style={styles.debugButtonText}>🔧</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {appState.mode === 'idle' && (
            <View style={styles.buttonContainer}>
              <AudioSharingButton
                mode="host"
                isLoading={appState.isLoading}
                onPress={handleShareAudio}
              />
              <AudioSharingButton
                mode="join"
                isLoading={appState.isLoading}
                onPress={handleJoinAudio}
              />
            </View>
          )}

          {appState.mode === 'hosting' && appState.connectionStatus.sessionId && (
            <View style={styles.hostingContainer}>
              <QRCodeGenerator sessionCode={appState.connectionStatus.sessionId} />
              <AudioSharingButton
                mode="stop"
                isLoading={appState.isLoading}
                onPress={handleStopSharing}
                sessionCode={appState.connectionStatus.sessionId}
              />
            </View>
          )}

          {appState.mode === 'joining' && (
            <View style={styles.joiningContainer}>
              <Text style={styles.statusText}>{i18n.t('app.connected')}</Text>
              <AudioSharingButton
                mode="stop"
                isLoading={appState.isLoading}
                onPress={handleStopSharing}
              />
            </View>
          )}

          {appState.error && (
            <Text style={styles.errorText}>{appState.error}</Text>
          )}

          <DeviceList
            devices={appState.connectionStatus.connectedDevices}
            onDevicePress={handleDevicePress}
          />

          {appState.connectionStatus.isConnected && (
            <SyncAdjustment
              syncOffset={appState.connectionStatus.syncOffset}
              onSyncChange={handleSyncChange}
            />
          )}
        </View>
      </ScrollView>
      
      <DebugPanel 
        visible={showDebugPanel}
        onClose={() => setShowDebugPanel(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  debugButton: {
    position: 'absolute',
    right: 0,
    padding: 10,
  },
  debugButtonText: {
    fontSize: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  hostingContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  joiningContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34C759',
    marginBottom: 20,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 10,
    paddingHorizontal: 20,
  },
});
