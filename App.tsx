import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Alert, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AudioSharingButton from './src/components/AudioSharingButton';
import DeviceList from './src/components/DeviceList';
import SyncAdjustment from './src/components/SyncAdjustment';
import QRCodeGenerator from './src/components/QRCodeGenerator';
import QRCodeScanner from './src/components/QRCodeScanner';
import DebugPanel from './src/components/DebugPanel';
import AudioSharingServiceClass from './src/services/AudioSharingService';
import { AppState, ConnectionStatus } from './src/types';
import i18n from './src/utils/i18n';

export default function App() {
  const [audioSharingService] = useState(() => new AudioSharingServiceClass());
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
    const status = audioSharingService.getConnectionStatus();
    setAppState(prev => ({
      ...prev,
      connectionStatus: status,
    }));
  };

  const handleShareAudio = async () => {
    setAppState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await audioSharingService.startHosting();
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
      const result = await audioSharingService.joinSession(sessionCode);
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
      await audioSharingService.stopSession();
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
    audioSharingService.setSyncOffset(offset);
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
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoIcon}>🎵</Text>
            </View>
            <Text style={styles.title}>SplitSound</Text>
            <Text style={styles.subtitle}>Companion</Text>
          </View>
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
        audioSharingService={audioSharingService}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoIcon: {
    fontSize: 28,
    color: '#ffffff',
  },
  debugButton: {
    position: 'absolute',
    right: 0,
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  debugButtonText: {
    fontSize: 18,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#667eea',
    marginTop: -4,
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  hostingContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  joiningContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
});
