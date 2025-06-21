# 🚀 SecureVault Deployment Guide

This guide covers the complete deployment process for SecureVault to Apple App Store and Google Play Store, with secure credential management for open source projects.

## 🔐 Security-First Approach

SecureVault follows security best practices by:

- ❌ **Never committing secrets** to version control
- ✅ **Using environment variables** for sensitive data
- ✅ **Leveraging EAS Secrets** for cloud builds
- ✅ **Providing template files** for contributors
- ✅ **Maintaining separate dev/prod credentials**

## 🎯 Quick Start

### **1. Environment Setup**

```bash
# Copy environment template
npm run setup-env

# Edit with your credentials (NEVER commit this file!)
nano .env
```

### **2. EAS Secrets Setup**

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Follow the secrets setup guide
npm run secrets:setup
```

### **3. Build & Deploy**

```bash
# iOS App Store
npm run build:ios
npm run submit:ios

# Google Play Store
npm run build:android
npm run submit:android
```

## 📱 Apple App Store Deployment

### **Prerequisites**

1. **Apple Developer Account** ($99/year)
2. **App Store Connect Access**
3. **Valid Apple ID with 2FA enabled**

### **Step 1: Apple Developer Portal Setup**

#### **Create App Identifier**

1. Go to [developer.apple.com](https://developer.apple.com)
2. Navigate to "Certificates, Identifiers & Profiles"
3. Create new App ID:
   - Bundle ID: `com.securevault.opensource`
   - Capabilities: Data Protection, Push Notifications

#### **Create Certificates**

1. Generate Certificate Signing Request (CSR) using Keychain Access
2. Create iOS Distribution Certificate
3. Download and install in Keychain

#### **Create Provisioning Profile**

1. Create "App Store" distribution profile
2. Select your App ID and Distribution Certificate
3. Download the profile

### **Step 2: App Store Connect Setup**

#### **Create App**

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Create new app:
   ```
   Platform: iOS
   Name: GetSecureVault
   Primary Language: English (U.S.)
   Bundle ID: com.securevault.opensource
   SKU: SECUREVAULT001
   ```

#### **Required Information**

- **Team ID**: Found in Developer Portal → Membership
- **App Store Connect App ID**: Found in App Information section
- **Apple ID Email**: Your Apple Developer account email

### **Step 3: Configure EAS Secrets**

```bash
# Set Apple secrets (replace with your actual values)
eas secret:create --scope project --name APPLE_ID_EMAIL --value "your-email@example.com"
eas secret:create --scope project --name APPLE_TEAM_ID --value "TEAM123456"
eas secret:create --scope project --name APP_STORE_CONNECT_APP_ID --value "1234567890"
```

### **Step 4: Build for App Store**

```bash
# Production build
npm run build:ios

# Monitor build progress
eas build:list --platform ios
```

### **Step 5: Submit to App Store**

```bash
# Automatic submission
npm run submit:ios

# Or manual submission via App Store Connect
```

### **Step 6: App Store Listing**

Complete your App Store listing with:

#### **App Information**

- **Name**: GetSecureVault
- **Subtitle**: Military-Grade Offline Crypto Vault
- **Category**: Finance
- **Age Rating**: 4+

#### **App Description**

```
GetSecureVault is a military-grade offline cryptocurrency security vault designed to keep your seed phrases, private keys, and wallet addresses completely secure and private.

🔒 MILITARY-GRADE SECURITY
• AES-256 encryption for all sensitive data
• Multi-layer authentication (Password + Biometric + 2FA)
• 100% offline operation - never connects to internet
• PBKDF2 key derivation with 10,000 iterations

🛡️ PRIVACY BY DESIGN
• Zero data collection - your data never leaves your device
• No cloud sync, no servers, no third parties
• Open-source codebase for complete transparency
• Screen capture and recording protection

🔐 ADVANCED FEATURES
• Face ID and Touch ID biometric authentication
• Time-based two-factor authentication (TOTP)
• Automatic session timeouts for additional security
• Emergency wipe functionality
• Encrypted secure storage using iOS Keychain

Perfect for cryptocurrency investors, traders, and security-conscious users who need a reliable, private, and secure way to store their most sensitive cryptographic data.

Your keys, your crypto, your security - completely offline, completely private.
```

#### **Privacy Policy**

Since SecureVault is offline-only:

- **Data Collection**: None
- **Third-party SDKs**: List any analytics (if used)
- **Data Processing**: All local, encrypted storage only

#### **Screenshots Required**

- **6.7" Display** (iPhone 15 Pro Max): 3-10 screenshots
- **6.5" Display** (iPhone 11 Pro Max): 3-10 screenshots
- **5.5" Display** (iPhone 8 Plus): Optional

## 🤖 Google Play Store Deployment

### **Prerequisites**

1. **Google Play Console Account** ($25 one-time fee)
2. **Google Service Account** for API access
3. **Android Keystore** for app signing

### **Step 1: Google Play Console Setup**

#### **Create App**

1. Go to [play.google.com/console](https://play.google.com/console)
2. Create new app:
   ```
   App name: SecureVault
   Default language: English (United States)
   App or game: App
   Free or paid: Free
   ```

#### **Generate Service Account Key**

1. Go to Google Cloud Console
2. Create new service account
3. Download JSON key file
4. Grant "Service Account User" role

### **Step 2: Configure Android Secrets**

```bash
# Upload service account key securely
eas secret:create --scope project --name GOOGLE_SERVICE_ACCOUNT_KEY_PATH --type file --value ./path/to/service-account-key.json

# Set Android configuration
eas secret:create --scope project --name ANDROID_VERSION_CODE --value "1"
```

### **Step 3: Build for Google Play**

```bash
# Production Android build
npm run build:android

# Monitor build
eas build:list --platform android
```

### **Step 4: Submit to Google Play**

```bash
# Automatic submission
npm run submit:android
```

## 🔧 Environment Variables Reference

### **Required Secrets**

| Variable                          | Description                 | Where to Find                       |
| --------------------------------- | --------------------------- | ----------------------------------- |
| `APPLE_ID_EMAIL`                  | Apple Developer email       | Your Apple ID                       |
| `APPLE_TEAM_ID`                   | Apple Developer Team ID     | Developer Portal → Membership       |
| `APP_STORE_CONNECT_APP_ID`        | App Store Connect App ID    | App Store Connect → App Information |
| `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` | Google Service Account JSON | Google Cloud Console                |

### **Build Configuration**

| Variable               | Description          | Default     |
| ---------------------- | -------------------- | ----------- |
| `IOS_BUILD_NUMBER`     | iOS build number     | 1           |
| `ANDROID_VERSION_CODE` | Android version code | 1           |
| `EXPO_PUBLIC_APP_ENV`  | App environment      | development |

### **Security Variables**

| Variable                        | Description          | Default |
| ------------------------------- | -------------------- | ------- |
| `EXPO_PUBLIC_ALLOW_NETWORK_DEV` | Allow network in dev | true    |

## 🛠️ Troubleshooting

### **Common Build Issues**

#### **"Invalid Team ID" Error**

```bash
# Verify Team ID is correct
eas secret:list
# Update if needed
eas secret:push --scope project --name APPLE_TEAM_ID --value "CORRECT_ID"
```

#### **"App Store Connect Authentication Failed"**

```bash
# Check Apple ID email
eas secret:push --scope project --name APPLE_ID_EMAIL --value "correct-email@example.com"
```

#### **"Missing Provisioning Profile"**

- Ensure you've created distribution provisioning profile
- Profile must include your app's Bundle ID
- Must be "App Store" distribution type

### **Common Submission Issues**

#### **"Binary Not Optimized"**

- Ensure you're using production build profile
- Check that build configuration is "Release"

#### **"Missing Privacy Policy"**

- Add privacy policy URL in App Store Connect
- For offline apps, explain local data storage only

#### **"Invalid Screenshots"**

- Use exact device dimensions
- PNG format, high quality
- No status bar content visible

## 📊 Deployment Checklist

### **Pre-Submission**

- [ ] All secrets configured in EAS
- [ ] App tested on physical devices
- [ ] Screenshots captured
- [ ] App Store listing complete
- [ ] Privacy policy reviewed
- [ ] Age rating appropriate

### **iOS Submission**

- [ ] Apple Developer account active
- [ ] App identifier created
- [ ] Distribution certificate valid
- [ ] Provisioning profile created
- [ ] Build uploaded successfully
- [ ] App Store listing complete
- [ ] Submit for review

### **Android Submission**

- [ ] Google Play Console account setup
- [ ] Service account key configured
- [ ] App bundle uploaded
- [ ] Store listing complete
- [ ] Release to production

## 🔐 Security Notes

### **Credential Management**

- **Never commit** `.env` files
- **Rotate credentials** regularly
- **Use minimal permissions** for service accounts
- **Monitor access logs** for unusual activity

### **Open Source Considerations**

- All sensitive data in environment variables
- Template files show required structure
- Documentation includes security warnings
- Contributors can't accidentally commit secrets

## 📞 Support

For deployment issues:

- **General**: Check [Expo documentation](https://docs.expo.dev)
- **Apple**: [App Store Connect help](https://help.apple.com/app-store-connect)
- **Google**: [Play Console help](https://support.google.com/googleplay/android-developer)
- **SecureVault**: [GitHub Issues](https://github.com/SecureVault-Labs/secure-vault-app/issues)

---

⚠️ **Security Reminder**: This deployment guide prioritizes security for an open source cryptocurrency security application. Always verify that no sensitive information is committed to version control.
