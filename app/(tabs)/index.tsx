import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import {
  Plus,
  Key,
  Wallet,
  CreditCard,
  Trash2,
  Eye,
  Copy,
  X,
} from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import * as Clipboard from 'expo-clipboard';
import { CryptoUtils } from '../../utils/CryptoUtils';

interface VaultItem {
  id: string;
  title: string;
  type: 'seed' | 'wallet' | 'private_key';
  createdAt: string;
  encryptedValue: string;
}

export default function VaultScreen() {
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [decryptedValue, setDecryptedValue] = useState<string>('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadVaultItems();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVaultItems();
    }, [])
  );

  const loadVaultItems = async () => {
    try {
      const itemsJson = await SecureStore.getItemAsync('vaultItems');
      if (itemsJson) {
        setVaultItems(JSON.parse(itemsJson));
      }
    } catch (error) {
      console.error('Failed to load vault items:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'seed':
        return <Key size={24} color="#1E3A5F" />;
      case 'wallet':
        return <Wallet size={24} color="#1E3A5F" />;
      case 'private_key':
        return <CreditCard size={24} color="#1E3A5F" />;
      default:
        return <Key size={24} color="#1E3A5F" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'seed':
        return 'Seed Phrase';
      case 'wallet':
        return 'Wallet Address';
      case 'private_key':
        return 'Private Key';
      default:
        return 'Unknown';
    }
  };

  const viewItem = async (item: VaultItem) => {
    setSelectedItem(item);
    setIsModalVisible(true);
    setIsDecrypting(true);
    setDecryptedValue('');

    try {
      // Check if item has encrypted value
      if (!item.encryptedValue) {
        // Legacy item without encryption - show raw content if available
        const legacyContent = (item as any).content || 'No content available';
        setDecryptedValue(legacyContent);
        setIsDecrypting(false);
        return;
      }

      // Get master password components for verification
      const masterPasswordHash = await SecureStore.getItemAsync(
        'masterPasswordHash'
      );
      const salt = await SecureStore.getItemAsync('passwordSalt');

      if (!masterPasswordHash || !salt) {
        Alert.alert(
          'Error',
          'Master password not found. Please re-authenticate.'
        );
        setIsModalVisible(false);
        return;
      }

      // Prompt user for password to decrypt
      Alert.prompt(
        'Decrypt Item',
        'Enter your master password to view this item:',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setIsModalVisible(false);
              setIsDecrypting(false);
            },
          },
          {
            text: 'Decrypt',
            onPress: async (password) => {
              if (!password) {
                Alert.alert('Error', 'Password is required to decrypt items');
                setIsModalVisible(false);
                setIsDecrypting(false);
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
                  setIsModalVisible(false);
                  setIsDecrypting(false);
                  return;
                }

                // Decrypt the value
                const decrypted = await CryptoUtils.decrypt(
                  item.encryptedValue,
                  password
                );
                setDecryptedValue(decrypted);
                setIsDecrypting(false);
              } catch (error) {
                console.error('Failed to decrypt item:', error);
                Alert.alert(
                  'Error',
                  'Failed to decrypt item. Please try again.'
                );
                setIsModalVisible(false);
                setIsDecrypting(false);
              }
            },
          },
        ],
        'secure-text'
      );
    } catch (error) {
      console.error('Failed to prepare decryption:', error);
      Alert.alert(
        'Error',
        'Failed to prepare item decryption. Please try again.'
      );
      setIsModalVisible(false);
      setIsDecrypting(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await Clipboard.setStringAsync(decryptedValue);
      Alert.alert('Copied', 'Value copied to clipboard');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedItem(null);
    setDecryptedValue('');
    setIsDecrypting(false);
  };

  const deleteItem = (id: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedItems = vaultItems.filter((item) => item.id !== id);
            setVaultItems(updatedItems);
            try {
              await SecureStore.setItemAsync(
                'vaultItems',
                JSON.stringify(updatedItems)
              );
            } catch (error) {
              console.error('Failed to save vault items:', error);
            }
          },
        },
      ]
    );
  };

  const renderVaultItem = ({ item }: { item: VaultItem }) => (
    <TouchableOpacity style={styles.vaultItem} onPress={() => viewItem(item)}>
      <View style={styles.itemHeader}>
        <View style={styles.itemIcon}>{getIcon(item.type)}</View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemType}>{getTypeLabel(item.type)}</Text>
          <Text style={styles.itemDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => viewItem(item)}
          >
            <Eye size={20} color="#1E3A5F" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteItem(item.id)}
          >
            <Trash2 size={20} color="#E67E22" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>SecureVault</Text>
        <Text style={styles.subtitle}>Your encrypted crypto vault</Text>
      </View>

      {vaultItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Key size={64} color="#E0E6ED" />
          <Text style={styles.emptyTitle}>Your vault is empty</Text>
          <Text style={styles.emptySubtitle}>
            Start by adding your first seed phrase or wallet address
          </Text>
        </View>
      ) : (
        <FlatList
          data={vaultItems}
          renderItem={renderVaultItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-item')}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* View Item Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedItem ? selectedItem.title : ''}
            </Text>
            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <X size={24} color="#757575" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.itemDetails}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>
                {selectedItem ? getTypeLabel(selectedItem.type) : ''}
              </Text>

              <Text style={styles.detailLabel}>Created</Text>
              <Text style={styles.detailValue}>
                {selectedItem
                  ? new Date(selectedItem.createdAt).toLocaleString()
                  : ''}
              </Text>

              <Text style={styles.detailLabel}>Value</Text>
              {isDecrypting ? (
                <Text style={styles.loadingText}>Decrypting...</Text>
              ) : (
                <View style={styles.valueContainer}>
                  <ScrollView style={styles.valueScroll}>
                    <Text style={styles.valueText} selectable>
                      {decryptedValue}
                    </Text>
                  </ScrollView>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={copyToClipboard}
                    disabled={!decryptedValue}
                  >
                    <Copy size={20} color="#FFFFFF" />
                    <Text style={styles.copyButtonText}>Copy</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
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
  list: {
    flex: 1,
    paddingHorizontal: 24,
  },
  vaultItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  itemIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#F4F6F8',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#0B1F3A',
    marginBottom: 2,
  },
  itemType: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1E3A5F',
    marginBottom: 2,
  },
  itemDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#757575',
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Medium',
    color: '#0B1F3A',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#757575',
    textAlign: 'center',
    lineHeight: 24,
  },
  fab: {
    position: 'absolute',
    bottom: 50,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginRight: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E6ED',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Medium',
    color: '#0B1F3A',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  itemDetails: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#757575',
    marginTop: 16,
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#0B1F3A',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#757575',
    fontStyle: 'italic',
  },
  valueContainer: {
    marginTop: 8,
  },
  valueScroll: {
    maxHeight: 200,
    backgroundColor: '#F4F6F8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  valueText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#0B1F3A',
    lineHeight: 20,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A5F',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  copyButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});
