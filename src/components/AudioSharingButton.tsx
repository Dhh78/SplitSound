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
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    minHeight: 50,
    marginVertical: 10,
  },
  buttonHost: {
    backgroundColor: '#007AFF',
  },
  buttonJoin: {
    backgroundColor: '#34C759',
  },
  buttonStop: {
    backgroundColor: '#ff4444',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  sessionCode: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
  },
});

export default AudioSharingButton;
