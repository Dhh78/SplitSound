import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { CompanionDevice } from '../types';
import i18n from '../utils/i18n';

interface DeviceListProps {
  devices: CompanionDevice[];
  onDevicePress: (deviceId: string) => void;
}

const DeviceList: React.FC<DeviceListProps> = ({ devices, onDevicePress }) => {
  const renderDevice = ({ item }: { item: CompanionDevice }) => (
    <TouchableOpacity
      style={[styles.deviceItem, item.connected ? styles.deviceConnected : styles.deviceDisconnected]}
      onPress={() => onDevicePress(item.id)}
    >
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceType}>
          {item.isHost ? i18n.t('app.host') : i18n.t('app.client')} - {i18n.t('app.companionDevice')}
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
    marginTop: 32,
    width: '100%',
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
    marginBottom: 20,
    textAlign: 'center',
    color: '#1e293b',
  },
  list: {
    maxHeight: 240,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    marginVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
  },
  deviceConnected: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
    borderWidth: 2,
  },
  deviceDisconnected: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 2,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  deviceType: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  statusIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  statusConnected: {
    backgroundColor: '#10b981',
  },
  statusDisconnected: {
    backgroundColor: '#cbd5e1',
  },
  noDevices: {
    textAlign: 'center',
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 24,
    fontSize: 16,
  },
});

export default DeviceList;
