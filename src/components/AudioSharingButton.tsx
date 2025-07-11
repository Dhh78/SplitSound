import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import i18n from '../utils/i18n';

interface AudioSharingButtonProps {
  mode: 'host' | 'join' | 'stop';
  isLoading: boolean;
  onPress: () => void;
  sessionCode?: string;
}

const AudioSharingButton: React.FC<AudioSharingButtonProps> = ({
  mode,
  isLoading,
  onPress,
  sessionCode,
}) => {
  const getButtonText = () => {
    switch (mode) {
      case 'host':
        return i18n.t('app.shareAudio');
      case 'join':
        return i18n.t('app.joinAudio');
      case 'stop':
        return i18n.t('app.stopSharing');
      default:
        return i18n.t('app.shareAudio');
    }
  };

  const getButtonStyle = () => {
    switch (mode) {
      case 'stop':
        return styles.buttonStop;
      case 'join':
        return styles.buttonJoin;
      default:
        return styles.buttonHost;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, getButtonStyle()]}
      onPress={onPress}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.buttonText}>
          {getButtonText()}
          {sessionCode && mode === 'stop' && (
            <Text style={styles.sessionCode}>{'\n'}Code: {sessionCode}</Text>
          )}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 280,
    minHeight: 64,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonHost: {
    backgroundColor: '#667eea',
  },
  buttonJoin: {
    backgroundColor: '#10b981',
  },
  buttonStop: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  sessionCode: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
    opacity: 0.9,
  },
});

export default AudioSharingButton;
