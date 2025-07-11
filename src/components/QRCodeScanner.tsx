import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, TextInput } from 'react-native';
import i18n from '../utils/i18n';

interface QRCodeScannerProps {
  onScanSuccess: (sessionCode: string) => void;
  onCancel: () => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScanSuccess, onCancel }) => {
  const [sessionCode, setSessionCode] = useState('');

  const handleJoinSession = () => {
    if (sessionCode.trim().length >= 6) {
      onScanSuccess(sessionCode.trim().toUpperCase());
    } else {
      Alert.alert(
        i18n.t('app.permissionRequired'),
        'Please enter a valid session code (6 characters)',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{i18n.t('app.joinAudio')}</Text>
      <Text style={styles.instructions}>
        Enter the session code to join audio sharing
      </Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={sessionCode}
          onChangeText={setSessionCode}
          placeholder="Enter session code"
          placeholderTextColor="#999"
          autoCapitalize="characters"
          maxLength={6}
        />
      </View>
      <TouchableOpacity style={styles.button} onPress={handleJoinSession}>
        <Text style={styles.buttonText}>{i18n.t('app.joinAudio')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>{i18n.t('app.cancel')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 32,
    color: '#1e293b',
    textAlign: 'center',
  },
  inputContainer: {
    width: '90%',
    marginBottom: 32,
  },
  input: {
    borderWidth: 3,
    borderColor: '#667eea',
    borderRadius: 20,
    padding: 20,
    fontSize: 24,
    textAlign: 'center',
    backgroundColor: '#ffffff',
    fontWeight: '700',
    letterSpacing: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  instructions: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 24,
    lineHeight: 26,
  },
  button: {
    backgroundColor: '#667eea',
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 30,
    marginTop: 16,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cancelButton: {
    marginTop: 20,
    paddingHorizontal: 48,
    paddingVertical: 18,
  },
  cancelButtonText: {
    color: '#667eea',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default QRCodeScanner;
