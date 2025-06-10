import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <AlertTriangle size={64} color="#E67E22" />
        <Text style={styles.title}>Page Not Found</Text>
        <Text style={styles.text}>This screen doesn't exist in SecureVault.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to Vault</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F4F6F8',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#0B1F3A',
    marginTop: 24,
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#757575',
    textAlign: 'center',
    marginBottom: 32,
  },
  link: {
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  linkText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});