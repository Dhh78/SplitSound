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
    marginVertical: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    color: '#1e293b',
  },
  qrContainer: {
    width: 240,
    height: 240,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrPlaceholder: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '600',
  },
  qrNote: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
  },
  sessionCode: {
    fontSize: 28,
    fontWeight: '800',
    color: '#667eea',
    textAlign: 'center',
    letterSpacing: 3,
    marginTop: 16,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  instructions: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 24,
    lineHeight: 24,
  },
});

export default QRCodeGenerator;
