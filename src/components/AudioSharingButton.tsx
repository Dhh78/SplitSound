import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import i18n from '../utils/i18n';

interface AudioSharingButtonProps {
  isSharing: boolean;
  isLoading: boolean;
  onPress: () => void;
}

const AudioSharingButton: React.FC<AudioSharingButtonProps> = ({
  isSharing,
  isLoading,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, isSharing ? styles.buttonActive : styles.buttonInactive]}
      onPress={onPress}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.buttonText}>
          {isSharing ? i18n.t('app.stopSharing') : i18n.t('app.shareAudio')}
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
  },
  buttonActive: {
    backgroundColor: '#ff4444',
  },
  buttonInactive: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default AudioSharingButton;
