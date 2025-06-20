import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Shield,
  Fingerprint,
  Clock,
  Trash2,
  Key,
  LogOut,
} from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

export default function SettingsScreen() {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(5);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadSettings();
    checkBiometricAvailability();
  }, []);

  const loadSettings = async () => {
    try {
      const biometric = await SecureStore.getItemAsync('biometricEnabled');
      const timeout = await SecureStore.getItemAsync('sessionTimeout');

      setBiometricEnabled(biometric === 'true');
      setSessionTimeout(timeout ? parseInt(timeout) : 5);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const checkBiometricAvailability = async () => {
    if (Platform.OS !== 'web') {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
    }
  };

  const toggleBiometric = async (value: boolean) => {
    try {
      await SecureStore.setItemAsync('biometricEnabled', value.toString());
      setBiometricEnabled(value);
    } catch (error) {
      Alert.alert('Error', 'Failed to update biometric settings');
    }
  };

  const updateSessionTimeout = async (newTimeout: number) => {
    try {
      await SecureStore.setItemAsync('sessionTimeout', newTimeout.toString());
      setSessionTimeout(newTimeout);
      Alert.alert('Updated', 'Session timeout updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update session timeout');
    }
  };

  const showSessionTimeoutPicker = () => {
    Alert.alert('Session Timeout', 'Choose your preferred timeout duration:', [
      { text: '30 seconds', onPress: () => updateSessionTimeout(0.5) },
      { text: '1 minute', onPress: () => updateSessionTimeout(1) },
      { text: '5 minutes', onPress: () => updateSessionTimeout(5) },
      { text: '15 minutes', onPress: () => updateSessionTimeout(15) },
      { text: '30 minutes', onPress: () => updateSessionTimeout(30) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const changePassword = () => {
    Alert.alert(
      'Change Master Password',
      'This feature will allow you to update your master password.',
      [{ text: 'OK' }]
    );
  };

  const clearVault = () => {
    Alert.alert(
      'Clear Vault',
      'This will permanently delete all stored items. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync('vaultItems');
              Alert.alert('Success', 'Vault cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear vault');
            }
          },
        },
      ]
    );
  };

  const exportBackup = () => {
    Alert.alert(
      'Export Backup',
      'Create an encrypted backup of your vault for safekeeping.',
      [{ text: 'OK' }]
    );
  };

  const resetApp = () => {
    Alert.alert(
      'Reset App',
      'This will delete all data and reset the app to its initial state. You will lose all stored items.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync('masterPassword');
              await SecureStore.deleteItemAsync('biometricEnabled');
              await SecureStore.deleteItemAsync('setupComplete');
              await SecureStore.deleteItemAsync('vaultItems');
              try {
                router.dismissAll();
              } catch (error) {
                // Ignore dismissAll errors when there's no stack to dismiss
              }
              router.replace('/splash');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset app');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your security preferences</Text>
      </View>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>

            {biometricAvailable && (
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Fingerprint size={24} color="#1E3A5F" />
                  <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>
                      Biometric Authentication
                    </Text>
                    <Text style={styles.settingSubtitle}>
                      Use fingerprint or Face ID
                    </Text>
                  </View>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={toggleBiometric}
                  trackColor={{ false: '#E0E6ED', true: '#2ECC71' }}
                  thumbColor={biometricEnabled ? '#FFFFFF' : '#FFFFFF'}
                />
              </View>
            )}

            <TouchableOpacity
              style={styles.settingItem}
              onPress={changePassword}
            >
              <View style={styles.settingLeft}>
                <Key size={24} color="#1E3A5F" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>
                    Change Master Password
                  </Text>
                  <Text style={styles.settingSubtitle}>
                    Update your vault password
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={showSessionTimeoutPicker}
            >
              <View style={styles.settingLeft}>
                <Clock size={24} color="#1E3A5F" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Session Timeout</Text>
                  <Text style={styles.settingSubtitle}>
                    {sessionTimeout} minutes
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data Management</Text>

            <TouchableOpacity style={styles.settingItem} onPress={exportBackup}>
              <View style={styles.settingLeft}>
                <Shield size={24} color="#1E3A5F" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Export Backup</Text>
                  <Text style={styles.settingSubtitle}>
                    Create encrypted backup
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem} onPress={clearVault}>
              <View style={styles.settingLeft}>
                <Trash2 size={24} color="#E67E22" />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: '#E67E22' }]}>
                    Clear Vault
                  </Text>
                  <Text style={styles.settingSubtitle}>
                    Delete all stored items
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Danger Zone</Text>

            <TouchableOpacity style={styles.settingItem} onPress={resetApp}>
              <View style={styles.settingLeft}>
                <LogOut size={24} color="#E74C3C" />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: '#E74C3C' }]}>
                    Reset App
                  </Text>
                  <Text style={styles.settingSubtitle}>
                    Delete all data and settings
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#0B1F3A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#757575',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    color: '#0B1F3A',
    marginBottom: 16,
  },
  settingItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#0B1F3A',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#757575',
  },
});
