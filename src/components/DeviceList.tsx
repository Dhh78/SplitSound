import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { AudioDevice } from '../types';
import i18n from '../utils/i18n';

interface DeviceListProps {
  devices: AudioDevice[];
  onDevicePress: (deviceId: string) => void;
}

const DeviceList: React.FC<DeviceListProps> = ({ devices, onDevicePress }) => {
  const renderDevice = ({ item }: { item: AudioDevice }) => (
    <TouchableOpacity
      style={[styles.deviceItem, item.connected ? styles.deviceConnected : styles.deviceDisconnected]}
      onPress={() => onDevicePress(item.id)}
    >
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceType}>
          {item.type === 'bluetooth' ? i18n.t('app.bluetoothDualAudio') : i18n.t('app.wifiSharing')}
        </Text>
      </View>
      <View style={[styles.statusIndicator, item.connected ? styles.statusConnected : styles.statusDisconnected]} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{i18n.t('app.connectedDevices')}</Text>
      {devices.length === 0 ? (
        <Text style={styles.noDevices}>{i18n.t('app.noDevicesConnected')}</Text>
      ) : (
        <FlatList
          data={devices}
          renderItem={renderDevice}
          keyExtractor={(item) => item.id}
          style={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  list: {
    maxHeight: 200,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    marginVertical: 5,
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
  },
  deviceConnected: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  deviceDisconnected: {
    backgroundColor: '#f8f8f8',
    borderColor: '#ddd',
    borderWidth: 1,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  deviceType: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusConnected: {
    backgroundColor: '#4CAF50',
  },
  statusDisconnected: {
    backgroundColor: '#ccc',
  },
  noDevices: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 20,
  },
});

export default DeviceList;
