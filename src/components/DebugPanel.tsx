import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import AudioSharingService from '../services/AudioSharingService';

interface DebugPanelProps {
  visible: boolean;
  onClose: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ visible, onClose }) => {
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    if (visible) {
      const interval = setInterval(() => {
        setDebugInfo(AudioSharingService.getDebugInfo());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.title}>🔧 Debug Panel</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Connection Status</Text>
            <Text style={styles.debugText}>Host: {debugInfo.isHost ? '✅' : '❌'}</Text>
            <Text style={styles.debugText}>Connected: {debugInfo.isConnected ? '✅' : '❌'}</Text>
            <Text style={styles.debugText}>Session ID: {debugInfo.sessionId || 'None'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>WebRTC Status</Text>
            <Text style={styles.debugText}>Peer Connection: {debugInfo.peerConnectionState || 'None'}</Text>
            <Text style={styles.debugText}>Signaling State: {debugInfo.signalingState || 'None'}</Text>
            <Text style={styles.debugText}>ICE Connection: {debugInfo.iceConnectionState || 'None'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Media and Signaling</Text>
            <Text style={styles.debugText}>Audio Stream: {debugInfo.hasAudioStream ? '✅' : '❌'}</Text>
            <Text style={styles.debugText}>Signaling Connected: {debugInfo.signalingConnected ? '✅' : '❌'}</Text>
            <Text style={styles.debugText}>Sync Offset: {debugInfo.syncOffset}ms</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Connected Devices ({debugInfo.connectedDevices?.length || 0})</Text>
            {debugInfo.connectedDevices?.map((device: any, index: number) => (
              <Text key={index} style={styles.debugText}>
                {device.name} ({device.isHost ? 'Host' : 'Client'}) - {device.connected ? '✅' : '❌'}
              </Text>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Session Details</Text>
            <Text style={styles.debugText}>
              {JSON.stringify(debugInfo.currentSession, null, 2)}
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 1000,
  },
  panel: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 60,
    borderRadius: 10,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  closeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#666',
    marginBottom: 5,
  },
});

export default DebugPanel;
