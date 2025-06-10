import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Key, Wallet, CreditCard } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { CryptoUtils } from '../utils/CryptoUtils';

const itemTypes = [
  {
    id: 'seed',
    label: 'Seed Phrase',
    icon: Key,
    description: '12/24 word recovery phrase',
  },
  {
    id: 'wallet',
    label: 'Wallet Address',
    icon: Wallet,
    description: 'Public wallet address',
  },
  {
    id: 'private_key',
    label: 'Private Key',
    icon: CreditCard,
    description: 'Private key for wallet',
  },
];

export default function AddItemScreen() {
  const [title, setTitle] = useState('');
  const [selectedType, setSelectedType] = useState('seed');
  const [content, setContent] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsSaving(true);

    try {
      // Get master password for encryption
      const masterPasswordHash = await SecureStore.getItemAsync(
        'masterPasswordHash'
      );
      const salt = await SecureStore.getItemAsync('passwordSalt');

      if (!masterPasswordHash || !salt) {
        Alert.alert(
          'Error',
          'Master password not found. Please re-authenticate.'
        );
        setIsSaving(false);
        return;
      }

      // For encryption, we need to ask user for their password
      // This is a simplified approach - in a real app you'd want to cache this temporarily during the session
      Alert.prompt(
        'Encrypt Item',
        'Enter your master password to encrypt this item:',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setIsSaving(false),
          },
          {
            text: 'Encrypt & Save',
            onPress: async (password) => {
              if (!password) {
                Alert.alert('Error', 'Password is required to encrypt items');
                setIsSaving(false);
                return;
              }

              try {
                // Verify the password first
                const isValidPassword = await CryptoUtils.verifyPassword(
                  password,
                  masterPasswordHash,
                  salt
                );
                if (!isValidPassword) {
                  Alert.alert('Error', 'Invalid master password');
                  setIsSaving(false);
                  return;
                }

                // Encrypt the content
                const encryptedContent = await CryptoUtils.encrypt(
                  content.trim(),
                  password
                );
                const encryptedNotes = notes.trim()
                  ? await CryptoUtils.encrypt(notes.trim(), password)
                  : '';

                const newItem = {
                  id: Date.now().toString(),
                  title: title.trim(),
                  type: selectedType,
                  encryptedValue: encryptedContent,
                  encryptedNotes: encryptedNotes,
                  createdAt: new Date().toISOString(),
                };

                // Load existing items
                const existingItemsJson = await SecureStore.getItemAsync(
                  'vaultItems'
                );
                const existingItems = existingItemsJson
                  ? JSON.parse(existingItemsJson)
                  : [];

                // Add new item
                const updatedItems = [...existingItems, newItem];

                // Save back to secure storage
                await SecureStore.setItemAsync(
                  'vaultItems',
                  JSON.stringify(updatedItems)
                );

                Alert.alert(
                  'Success',
                  'Item saved and encrypted successfully',
                  [{ text: 'OK', onPress: () => router.back() }]
                );
              } catch (error) {
                console.error('Encryption error:', error);
                Alert.alert('Error', 'Failed to encrypt and save item');
                setIsSaving(false);
              }
            },
          },
        ],
        'secure-text'
      );
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save item');
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#0B1F3A" />
        </TouchableOpacity>
        <Text style={styles.title}>Add New Item</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.label}>Item Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., My Bitcoin Wallet"
            placeholderTextColor="#757575"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Item Type *</Text>
          <View style={styles.typeSelector}>
            {itemTypes.map((type) => {
              const IconComponent = type.icon;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeOption,
                    selectedType === type.id && styles.selectedTypeOption,
                  ]}
                  onPress={() => setSelectedType(type.id)}
                >
                  <IconComponent
                    size={24}
                    color={selectedType === type.id ? '#FFFFFF' : '#1E3A5F'}
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      selectedType === type.id && styles.selectedTypeLabel,
                    ]}
                  >
                    {type.label}
                  </Text>
                  <Text
                    style={[
                      styles.typeDescription,
                      selectedType === type.id &&
                        styles.selectedTypeDescription,
                    ]}
                  >
                    {type.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>
            {selectedType === 'seed'
              ? 'Seed Phrase'
              : selectedType === 'wallet'
              ? 'Wallet Address'
              : 'Private Key'}{' '}
            *
          </Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={content}
            onChangeText={setContent}
            placeholder={
              selectedType === 'seed'
                ? 'Enter your 12 or 24 word seed phrase'
                : selectedType === 'wallet'
                ? 'Enter wallet address'
                : 'Enter private key'
            }
            placeholderTextColor="#757575"
            multiline
            textAlignVertical="top"
            secureTextEntry={selectedType !== 'wallet'}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any additional notes or details"
            placeholderTextColor="#757575"
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>⚠️ Security Notice</Text>
          <Text style={styles.warningText}>
            Your data will be encrypted and stored only on this device. Make
            sure to create a backup of your vault in case you lose access to
            this device.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!title.trim() || !content.trim() || isSaving) &&
              styles.disabledButton,
          ]}
          onPress={handleSave}
          disabled={!title.trim() || !content.trim() || isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Encrypting & Saving...' : 'Save Item'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#0B1F3A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#0B1F3A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    borderWidth: 1,
    borderColor: '#E0E6ED',
    color: '#0B1F3A',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeSelector: {
    gap: 12,
  },
  typeOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E0E6ED',
  },
  selectedTypeOption: {
    backgroundColor: '#1E3A5F',
    borderColor: '#1E3A5F',
  },
  typeLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#0B1F3A',
    marginTop: 8,
    marginBottom: 4,
  },
  selectedTypeLabel: {
    color: '#FFFFFF',
  },
  typeDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#757575',
  },
  selectedTypeDescription: {
    color: '#FFFFFF',
    opacity: 0.8,
  },
  warningBox: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFE69C',
  },
  warningTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#856404',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E6ED',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#757575',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#E0E6ED',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
