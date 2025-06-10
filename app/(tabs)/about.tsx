import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shield, Github, ExternalLink, Heart } from 'lucide-react-native';

export default function AboutScreen() {
  const insets = useSafeAreaInsets();

  const openGithub = () => {
    Linking.openURL('https://github.com/securevault/app');
  };

  const openWebsite = () => {
    Linking.openURL('https://securevault.app');
  };

  return (
    <View style={{ ...styles.container, paddingTop: insets.top }}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Shield size={64} color="#1E3A5F" strokeWidth={1.5} />
          </View>
          <Text style={styles.appName}>SecureVault</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
          <Text style={styles.tagline}>
            Open-source offline crypto security
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About SecureVault</Text>
          <Text style={styles.description}>
            SecureVault is a completely offline cryptocurrency vault designed to
            keep your most sensitive crypto information secure. Your seed
            phrases, private keys, and wallet addresses are encrypted with
            military-grade AES-256 encryption and stored only on your device.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Features</Text>
          <View style={styles.featureList}>
            <View style={styles.feature}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>
                100% offline storage - no internet required
              </Text>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>
                AES-256 encryption for all stored data
              </Text>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>
                Biometric authentication support
              </Text>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>Screen capture prevention</Text>
            </View>
            <View style={styles.feature}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>
                Open-source and auditable code
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Policy</Text>
          <Text style={styles.description}>
            SecureVault collects no personal data. All information is stored
            locally on your device and never transmitted over the internet. We
            cannot access your data, and neither can anyone else.
          </Text>
        </View>

        <View style={styles.buttonSection}>
          <TouchableOpacity style={styles.linkButton} onPress={openGithub}>
            <Github size={20} color="#1E3A5F" />
            <Text style={styles.linkText}>View on GitHub</Text>
            <ExternalLink size={16} color="#757575" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={openWebsite}>
            <Shield size={20} color="#1E3A5F" />
            <Text style={styles.linkText}>Official Website</Text>
            <ExternalLink size={16} color="#757575" />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <View style={styles.madeWith}>
            <Text style={styles.madeWithText}>Made with</Text>
            <Heart size={16} color="#E74C3C" />
            <Text style={styles.madeWithText}>for the crypto community</Text>
          </View>
          <Text style={styles.copyright}>
            © 2024 SecureVault. Open source software.
          </Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
  },
  logoContainer: {
    width: 120,
    height: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  appName: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#0B1F3A',
    marginBottom: 4,
  },
  version: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1E3A5F',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#757575',
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Medium',
    color: '#0B1F3A',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#757575',
    lineHeight: 24,
  },
  featureList: {
    marginTop: 8,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featureBullet: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#2ECC71',
    marginRight: 12,
    width: 16,
  },
  featureText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#757575',
    lineHeight: 24,
    flex: 1,
  },
  buttonSection: {
    marginBottom: 32,
  },
  linkButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
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
  linkText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#0B1F3A',
    marginLeft: 12,
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  madeWith: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  madeWithText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#757575',
    marginHorizontal: 4,
  },
  copyright: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#757575',
    textAlign: 'center',
  },
});
