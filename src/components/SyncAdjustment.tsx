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
    marginTop: 30,
    width: '100%',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slider: {
    flex: 1,
    marginHorizontal: 10,
  },
  label: {
    fontSize: 12,
    color: '#666',
  },
  currentValue: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 10,
    color: '#007AFF',
  },
});

export default SyncAdjustment;
