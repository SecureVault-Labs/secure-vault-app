import { View, Text, StyleSheet } from 'react-native';
import { Shield } from 'lucide-react-native';

export default function SplashScreen() {
  // Splash screen now only displays content
  // Navigation is handled by the main app index.tsx

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Shield size={80} color="#FFFFFF" strokeWidth={1.5} />
        <Text style={styles.appName}>GetSecureVault</Text>
        <Text style={styles.tagline}>Offline Crypto Security</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1F3A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 24,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 8,
  },
});
