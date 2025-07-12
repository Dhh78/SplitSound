# SplitSound Companion - Debug Log Collection Instructions

## 📱 **How to Collect Debug Logs**

### **For Both iOS and Android:**

1. **Open SplitSound Companion** on your device
2. **Tap the 🔧 Debug Button** (located in the top-right corner of the main screen)
3. **In the Debug Panel:**
   - **Copy Logs**: Tap the 📋 button to copy logs to clipboard
   - **Save Logs**: Tap the 💾 button to save logs as a JSON file
   - **View Real-time Info**: Monitor connection status, WebRTC states, and signaling messages

### **iOS Specific Instructions:**

1. **Access Debug Panel**: Tap 🔧 button in SplitSound app
2. **Copy Logs**: Tap 📋 → Logs copied to clipboard
3. **Share Logs**: 
   - Open Notes app → Paste logs → Share via email/message
   - Or use 💾 button to save file → Share from Files app
4. **Additional iOS Logs** (if needed):
   - Settings → Privacy & Security → Analytics & Improvements → Analytics Data
   - Look for crash logs starting with "SplitSound"

### **Android Specific Instructions:**

1. **Access Debug Panel**: Tap 🔧 button in SplitSound app  
2. **Copy Logs**: Tap 📋 → Logs copied to clipboard
3. **Share Logs**:
   - Open any text app → Paste logs → Share via email/message
   - Or use 💾 button to save file → Share from Downloads folder
4. **Additional Android Logs** (if needed):
   - Enable Developer Options: Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Take Bug Report → Full Report

---

## 🔧 **What Debug Information is Collected:**

### **Connection Status:**
- Device role (Host/Client)
- Connection state (Connected/Disconnected)
- Session code and Device ID
- WebRTC peer connection states

### **Signaling Information:**
- WebSocket connection status
- Signaling server URL being used
- Message exchange history (sent/received)
- Connection attempt details

### **Media & Audio:**
- Audio stream status
- Audio track count
- Microphone permissions
- Sync offset settings

### **Error Tracking:**
- WebRTC connection errors
- Signaling failures
- Permission denied errors
- Network connectivity issues

---

## 📧 **How to Send Debug Logs:**

### **Method 1: Email**
1. Collect logs using steps above
2. Email to: **[Your Support Email]**
3. Subject: "SplitSound Debug Logs - [Describe Issue]"
4. Include:
   - Device model and OS version
   - Description of the problem
   - Steps to reproduce the issue
   - Debug logs (paste or attach file)

### **Method 2: Direct Message**
1. Copy logs to clipboard using 📋 button
2. Send via your preferred messaging app
3. Include device info and problem description

---

## 🚨 **Common Issues & Quick Fixes:**

### **"No devices connected" Issue:**
1. **Check Wi-Fi**: Ensure both devices are on the same network
2. **Check Debug Panel**: Look for "Signaling Socket: ❌ Disconnected"
3. **Restart App**: Close and reopen SplitSound on both devices
4. **Check Logs**: Look for WebSocket connection errors

### **"Permission Denied" Issues:**
1. **Microphone**: Settings → SplitSound → Allow Microphone
2. **Network**: Check if app can access internet
3. **Restart**: Close app completely and reopen

### **Connection Drops:**
1. **Check Debug Panel**: Monitor WebRTC connection state
2. **Network Stability**: Ensure stable Wi-Fi connection
3. **Background Apps**: Close other apps using microphone/network

---

## 📊 **Debug Panel Sections Explained:**

- **🔗 Connection Status**: Basic connection info and session details
- **🌐 WebRTC Status**: Peer connection and ICE states  
- **🎵 Media & Signaling**: Audio stream and WebSocket status
- **📱 Connected Devices**: List of devices in current session
- **📡 Signaling Messages**: WebSocket URL and message history
- **📜 Recent Messages**: Last 5 signaling messages exchanged
- **⚠️ Errors & Warnings**: Any connection or permission errors
- **📊 Session Details**: Complete session data in JSON format

---

## 💡 **Tips for Better Debugging:**

1. **Keep Debug Panel Open** while testing connections
2. **Take Screenshots** of error states for visual reference
3. **Test on Same Wi-Fi** to eliminate network variables
4. **Clear App Cache** if issues persist (Android: Settings → Apps → SplitSound → Storage → Clear Cache)
5. **Restart Router** if multiple devices can't connect to each other

---

**Need Help?** Include debug logs when reporting issues for faster troubleshooting!
