# SplitSound

Una aplicación móvil que permite a dos personas escuchar el mismo audio desde un solo dispositivo usando auriculares Bluetooth duales o Wi-Fi.

A mobile application that allows two people to listen to the same audio from a single device using dual Bluetooth headphones or Wi-Fi.

## Características / Features

### Español
- **Detección automática**: Detecta automáticamente si el dispositivo soporta:
  - Audio Sharing (Apple iOS 13+)
  - Dual Audio (Samsung Android 8+)
  - Bluetooth LE Audio / Auracast (Android 15+)
- **Respaldo Wi-Fi**: Si el dispositivo no soporta audio Bluetooth dual, usa Wi-Fi local para transmitir audio
- **Interfaz simple**: Botón "Compartir Audio", estado de conexión, ajuste de sincronización
- **Multiplataforma**: Funciona en Android y iOS
- **Bilingüe**: Soporta español e inglés con detección automática del idioma del sistema

### English
- **Automatic detection**: Automatically detects if the device supports:
  - Audio Sharing (Apple iOS 13+)
  - Dual Audio (Samsung Android 8+)
  - Bluetooth LE Audio / Auracast (Android 15+)
- **Wi-Fi fallback**: If the device doesn't support dual Bluetooth audio, uses local Wi-Fi to transmit audio
- **Simple interface**: "Share Audio" button, connection status, sync adjustment
- **Cross-platform**: Works on Android and iOS
- **Bilingual**: Supports Spanish and English with automatic system language detection

## Instalación / Installation

### Desarrollo / Development
```bash
npm install
npm start
```

### Web (para pruebas / for testing)
```bash
npm run web
```

### Android
```bash
npx expo build:android
```

### iOS
```bash
npx expo build:ios
```

## Uso / Usage

### Español
1. Abre la aplicación SplitSound
2. La app detectará automáticamente las capacidades de tu dispositivo
3. Presiona "Compartir Audio" para comenzar
4. Si tu dispositivo soporta audio dual Bluetooth, conecta dos auriculares
5. Si no, usa el modo Wi-Fi para conectar otro dispositivo con la misma app
6. Ajusta la sincronización si hay retraso en el modo Wi-Fi

### English
1. Open the SplitSound app
2. The app will automatically detect your device's capabilities
3. Press "Share Audio" to start
4. If your device supports dual Bluetooth audio, connect two headphones
5. If not, use Wi-Fi mode to connect another device with the same app
6. Adjust sync if there's delay in Wi-Fi mode

## Tecnologías / Technologies

- React Native
- Expo
- TypeScript
- i18n-js (internationalization)
- React Native BLE PLX (Bluetooth)
- Expo Device (device detection)

## Estructura del Proyecto / Project Structure

```
src/
├── components/          # UI components
│   ├── AudioSharingButton.tsx
│   ├── DeviceList.tsx
│   └── SyncAdjustment.tsx
├── services/           # Business logic
│   └── AudioSharingService.ts
├── types/              # TypeScript definitions
│   └── index.ts
├── utils/              # Utilities
│   └── i18n.ts
└── locales/            # Translations
    ├── en.json
    └── es.json
```

## Compatibilidad / Compatibility

### Dispositivos soportados / Supported devices
- **iOS**: iPhone/iPad con iOS 13+ (Audio Sharing)
- **Android**: Samsung Galaxy con Android 8+ (Dual Audio)
- **Android**: Dispositivos con Android 15+ (Bluetooth LE Audio/Auracast)
- **Respaldo**: Cualquier dispositivo con Wi-Fi (Wi-Fi fallback mode)

## Licencia / License

MIT License
