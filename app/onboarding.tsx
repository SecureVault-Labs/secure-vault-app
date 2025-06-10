import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Shield, Lock, Wifi } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';

const onboardingData = [
  {
    icon: Shield,
    title: 'Military-Grade Security',
    description:
      'Your crypto seed phrases are encrypted with AES-256 encryption and stored only on your device.',
  },
  {
    icon: Wifi,
    title: '100% Offline Storage',
    description:
      'No internet required. Your sensitive data never leaves your device, ensuring maximum privacy.',
  },
  {
    icon: Lock,
    title: 'Biometric Protection',
    description:
      'Access your vault with fingerprint, Face ID, or your secure master password.',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();

  const handleNext = async () => {
    if (currentIndex < onboardingData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      await SecureStore.setItemAsync('hasCompletedOnboarding', 'true');
      router.replace('/setup');
    }
  };

  const handleSkip = async () => {
    await SecureStore.setItemAsync('hasCompletedOnboarding', 'true');
    router.replace('/setup');
  };

  const currentItem = onboardingData[currentIndex];
  const IconComponent = currentItem.icon;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <IconComponent size={120} color="#1E3A5F" strokeWidth={1.5} />
        </View>

        <Text style={styles.title}>{currentItem.title}</Text>
        <Text style={styles.description}>{currentItem.description}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {onboardingData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {currentIndex === onboardingData.length - 1
              ? 'Get Started'
              : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 1,
  },
  skipText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#757575',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 200,
    height: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#0B1F3A',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#757575',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#1E3A5F',
  },
  inactiveDot: {
    backgroundColor: '#E0E6ED',
  },
  nextButton: {
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
