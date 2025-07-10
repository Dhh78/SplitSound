# Manual de Usuario SplitSound / SplitSound User Manual

## Español

### ¿Qué es SplitSound?
SplitSound es una aplicación móvil que permite que dos personas escuchen el mismo audio desde un solo dispositivo (tablet o móvil) usando dos auriculares Bluetooth o mediante Wi-Fi.

### Requisitos del Sistema
- **iOS**: iPhone/iPad con iOS 13 o superior
- **Android**: Dispositivo Android 8 o superior
- **Conexión**: Bluetooth 5.0+ o Wi-Fi local

### Instalación
1. Descarga el archivo APK (Android) o instala desde TestFlight (iOS)
2. Permite los permisos de Bluetooth y audio cuando se soliciten
3. Abre la aplicación

### Uso Paso a Paso

#### Método 1: Audio Dual Bluetooth (Recomendado)
1. **Verifica compatibilidad**: Al abrir la app, verás si tu dispositivo soporta:
   - "Audio Sharing" (Apple)
   - "Audio Dual" (Samsung)
   - "Auracast" (Android 15+)

2. **Conecta auriculares**: 
   - Conecta el primer par de auriculares Bluetooth normalmente
   - Conecta el segundo par (el dispositivo debe permitir conexiones múltiples)

3. **Inicia compartir**:
   - Presiona el botón "Compartir Audio"
   - La app detectará automáticamente los auriculares conectados
   - Ambos auriculares reproducirán el mismo audio

#### Método 2: Wi-Fi (Respaldo)
1. **Dispositivos en la misma red**: Asegúrate de que ambos dispositivos estén conectados a la misma red Wi-Fi

2. **Dispositivo principal**:
   - Abre SplitSound
   - Presiona "Compartir Audio"
   - La app mostrará "Usando respaldo Wi-Fi"

3. **Dispositivo secundario**:
   - Abre SplitSound en el segundo dispositivo
   - Se conectará automáticamente al dispositivo principal
   - Conecta auriculares al segundo dispositivo

4. **Ajuste de sincronización**:
   - Si hay retraso entre dispositivos, usa el control deslizante "Ajuste de Sincronización"
   - Mueve entre -500ms y +500ms hasta sincronizar el audio

### Solución de Problemas

**No se detectan auriculares Bluetooth:**
- Verifica que los auriculares estén en modo de emparejamiento
- Reinicia Bluetooth en configuraciones del dispositivo
- Algunos dispositivos solo permiten un auricular Bluetooth a la vez

**El audio Wi-Fi tiene retraso:**
- Usa el control de "Ajuste de Sincronización"
- Asegúrate de tener buena señal Wi-Fi en ambos dispositivos
- Cierra otras aplicaciones que usen mucho ancho de banda

**La app no detecta capacidades del dispositivo:**
- Reinicia la aplicación
- Verifica que tengas los permisos de Bluetooth habilitados
- Algunos dispositivos más antiguos pueden no soportar audio dual

---

## English

### What is SplitSound?
SplitSound is a mobile application that allows two people to listen to the same audio from a single device (tablet or phone) using two Bluetooth headphones or via Wi-Fi.

### System Requirements
- **iOS**: iPhone/iPad with iOS 13 or higher
- **Android**: Android device 8 or higher
- **Connection**: Bluetooth 5.0+ or local Wi-Fi

### Installation
1. Download the APK file (Android) or install from TestFlight (iOS)
2. Allow Bluetooth and audio permissions when requested
3. Open the application

### Step-by-Step Usage

#### Method 1: Dual Bluetooth Audio (Recommended)
1. **Check compatibility**: When opening the app, you'll see if your device supports:
   - "Audio Sharing" (Apple)
   - "Dual Audio" (Samsung)
   - "Auracast" (Android 15+)

2. **Connect headphones**: 
   - Connect the first pair of Bluetooth headphones normally
   - Connect the second pair (device must allow multiple connections)

3. **Start sharing**:
   - Press the "Share Audio" button
   - The app will automatically detect connected headphones
   - Both headphones will play the same audio

#### Method 2: Wi-Fi (Fallback)
1. **Devices on same network**: Make sure both devices are connected to the same Wi-Fi network

2. **Primary device**:
   - Open SplitSound
   - Press "Share Audio"
   - The app will show "Using Wi-Fi fallback"

3. **Secondary device**:
   - Open SplitSound on the second device
   - It will automatically connect to the primary device
   - Connect headphones to the second device

4. **Sync adjustment**:
   - If there's delay between devices, use the "Sync Adjustment" slider
   - Move between -500ms and +500ms until audio is synchronized

### Troubleshooting

**Bluetooth headphones not detected:**
- Verify headphones are in pairing mode
- Restart Bluetooth in device settings
- Some devices only allow one Bluetooth headphone at a time

**Wi-Fi audio has delay:**
- Use the "Sync Adjustment" control
- Make sure you have good Wi-Fi signal on both devices
- Close other bandwidth-intensive applications

**App doesn't detect device capabilities:**
- Restart the application
- Verify you have Bluetooth permissions enabled
- Some older devices may not support dual audio

### Technical Support
For technical issues, please check the GitHub repository or contact support through the app store.
