import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import i18n from '../utils/i18n';

interface QRCodeGeneratorProps {
  sessionCode: string;
  size?: number;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ sessionCode, size = 200 }) => {
  const qrData = JSON.stringify({
    type: 'splitsound-companion',
    sessionCode: sessionCode,
    timestamp: Date.now()
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{i18n.t('app.generateQRCode')}</Text>
      <View style={styles.qrContainer}>
        <Text style={styles.qrPlaceholder}>QR Code</Text>
        <Text style={styles.qrNote}>QR code generation temporarily disabled for build testing</Text>
      </View>
      <Text style={styles.sessionCode}>
        {i18n.t('app.sessionCode')}: {sessionCode}
      </Text>
      <Text style={styles.instructions}>
        {i18n.t('app.shareInstructions')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    color: '#333',
  },
  qrContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholder: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  qrNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
  sessionCode: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 15,
    color: '#007AFF',
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
  },
});

export default QRCodeGenerator;
