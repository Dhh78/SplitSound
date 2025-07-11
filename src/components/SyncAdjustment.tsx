import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
// import Slider from '@react-native-community/slider'; // Temporarily removed for build testing
import i18n from '../utils/i18n';

interface SyncAdjustmentProps {
  syncOffset: number;
  onSyncChange: (offset: number) => void;
}

const SyncAdjustment: React.FC<SyncAdjustmentProps> = ({ syncOffset, onSyncChange }) => {
  const [currentOffset, setCurrentOffset] = useState(syncOffset);

  const handleValueChange = (value: number) => {
    setCurrentOffset(value);
    onSyncChange(value);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{i18n.t('app.syncAdjustment')}</Text>
      <View style={styles.sliderContainer}>
        <Text style={styles.label}>-500ms</Text>
        {/* <Slider
          style={styles.slider}
          minimumValue={-500}
          maximumValue={500}
          value={currentOffset}
          onValueChange={handleValueChange}
          step={10}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#ddd"
        /> */}
        <Text style={styles.label}>Slider temporarily disabled for build testing</Text>
        <Text style={styles.label}>+500ms</Text>
      </View>
      <Text style={styles.currentValue}>
        {currentOffset > 0 ? '+' : ''}{currentOffset}ms
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
    color: '#1e293b',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '90%',
    marginBottom: 16,
  },
  slider: {
    flex: 1,
    marginHorizontal: 16,
  },
  label: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  currentValue: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#667eea',
  },
});

export default SyncAdjustment;
