import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';

interface DebugPanelProps {
  visible: boolean;
  onClose: () => void;
  audioSharingService: any;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ visible, onClose, audioSharingService }) => {
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    if (visible && audioSharingService) {
      const interval = setInterval(() => {
        setDebugInfo(audioSharingService.getDebugInfo());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [visible, audioSharingService]);

  const handleCopyLogs = async () => {
    try {
      const logs = audioSharingService ? audioSharingService.exportDebugLogs() : 'No service available';
      if (Platform.OS === 'web') {
        await (navigator as any).clipboard.writeText(logs);
      } else {
        console.log('Debug logs:', logs);
      }
      Alert.alert('Success', 'Debug logs copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy logs to clipboard');
      console.error('Copy logs error:', error);
    }
  };

  const handleSaveLogs = async () => {
    try {
      const logs = audioSharingService ? audioSharingService.exportDebugLogs() : 'No service available';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `splitsound-debug-${timestamp}.json`;
      
      if (Platform.OS === 'web') {
        const blob = new Blob([logs], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Alert.alert('Success', 'Debug logs saved to downloads');
      } else {
        console.log('Debug logs for mobile:', logs);
        Alert.alert('Success', 'Debug logs printed to console');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save debug logs');
      console.error('Save logs error:', error);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.title}>🔧 Debug Panel</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={handleCopyLogs} style={styles.exportButton}>
              <Text style={styles.exportText}>📋</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSaveLogs} style={styles.exportButton}>
              <Text style={styles.exportText}>💾</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔗 Connection Status</Text>
            <Text style={styles.debugText}>Device Role: {debugInfo.isHost ? '🏠 Host' : '📱 Client'}</Text>
            <Text style={styles.debugText}>Connected: {debugInfo.isConnected ? '✅ Yes' : '❌ No'}</Text>
            <Text style={styles.debugText}>Session Code: {debugInfo.sessionId || '❌ None'}</Text>
            <Text style={styles.debugText}>Device ID: {debugInfo.deviceId || 'Unknown'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌐 WebRTC Status</Text>
            <Text style={styles.debugText}>Peer Connection: {debugInfo.peerConnectionState || '❌ None'}</Text>
            <Text style={styles.debugText}>Signaling State: {debugInfo.signalingState || '❌ None'}</Text>
            <Text style={styles.debugText}>ICE Connection: {debugInfo.iceConnectionState || '❌ None'}</Text>
            <Text style={styles.debugText}>ICE Gathering: {debugInfo.iceGatheringState || '❌ None'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎵 Media & Signaling</Text>
            <Text style={styles.debugText}>Audio Stream: {debugInfo.hasAudioStream ? '✅ Active' : '❌ None'}</Text>
            <Text style={styles.debugText}>Signaling Socket: {debugInfo.signalingConnected ? '✅ Connected' : '❌ Disconnected'}</Text>
            <Text style={styles.debugText}>WebSocket State: {debugInfo.webSocketState || 'Unknown'}</Text>
            <Text style={styles.debugText}>Sync Offset: {debugInfo.syncOffset}ms</Text>
            <Text style={styles.debugText}>Audio Tracks: {debugInfo.audioTrackCount || 0}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📱 Connected Devices ({debugInfo.currentSession?.connectedDevices?.length || 0})</Text>
            {!debugInfo.currentSession?.connectedDevices || debugInfo.currentSession.connectedDevices.length === 0 ? (
              <Text style={styles.debugText}>❌ No devices connected</Text>
            ) : (
              debugInfo.currentSession.connectedDevices.map((device: any, index: number) => (
                <Text key={index} style={styles.debugText}>
                  {device.isHost ? '🏠' : '📱'} {device.name || device.id} - {device.connected ? '✅' : '❌'}
                </Text>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📡 Signaling Messages</Text>
            <Text style={styles.debugText}>WebSocket URL: {debugInfo.webSocketUrl || '❌ None'}</Text>
            <Text style={styles.debugText}>Connection Attempts: {debugInfo.connectionAttempts || 0}</Text>
            <Text style={styles.debugText}>Last Sent: {debugInfo.lastSentMessage || '❌ None'}</Text>
            <Text style={styles.debugText}>Last Received: {debugInfo.lastReceivedMessage || '❌ None'}</Text>
            <Text style={styles.debugText}>Message Count: Sent {debugInfo.messagesSent || 0}, Received {debugInfo.messagesReceived || 0}</Text>
            <Text style={styles.debugText}>Platform: {debugInfo.platform || 'Unknown'}</Text>
            <Text style={styles.debugText}>Timestamp: {debugInfo.timestamp ? new Date(debugInfo.timestamp).toLocaleTimeString() : 'Unknown'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📜 Recent Messages ({debugInfo.signalingMessages?.length || 0})</Text>
            {debugInfo.signalingMessages && debugInfo.signalingMessages.length > 0 ? (
              debugInfo.signalingMessages.slice(-5).map((msg: any, index: number) => (
                <Text key={index} style={[styles.debugText, msg.direction === 'sent' ? styles.sentMessage : styles.receivedMessage]}>
                  {msg.direction === 'sent' ? '📤' : '📥'} {msg.message.type} - {new Date(msg.timestamp).toLocaleTimeString()}
                  {msg.method && ` (${msg.method})`}
                </Text>
              ))
            ) : (
              <Text style={styles.debugText}>❌ No messages</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠️ Errors & Warnings</Text>
            {debugInfo.errors && debugInfo.errors.length > 0 ? (
              debugInfo.errors.map((error: string, index: number) => (
                <Text key={index} style={[styles.debugText, styles.errorText]}>
                  ❌ {error}
                </Text>
              ))
            ) : (
              <Text style={styles.debugText}>✅ No errors</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Session Details</Text>
            <Text style={styles.debugText}>
              {debugInfo.currentSession ? JSON.stringify(debugInfo.currentSession, null, 2) : '❌ No active session'}
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exportButton: {
    padding: 8,
    marginRight: 8,
    backgroundColor: '#667eea',
    borderRadius: 6,
    minWidth: 36,
    alignItems: 'center',
  },
  exportText: {
    fontSize: 16,
    color: '#fff',
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
  errorText: {
    color: '#ff4444',
    fontWeight: 'bold',
  },
  sentMessage: {
    color: '#2196F3',
  },
  receivedMessage: {
    color: '#4CAF50',
  },
});

export default DebugPanel;
