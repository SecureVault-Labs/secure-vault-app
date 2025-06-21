# 🔒 SecureVault - Environment Secrets Setup Guide

This guide shows how to securely configure sensitive information for building and deploying SecureVault without exposing credentials in the codebase.

## 🎯 Quick Setup

### 1. **Local Development Setup**

```bash
# Copy the template
cp .env.example .env

# Edit with your actual values
nano .env  # or your preferred editor
```

### 2. **EAS Cloud Secrets Setup**

For secure cloud builds, use EAS Secrets instead of local files:

```bash
# Install EAS CLI if not installed
npm install -g @expo/eas-cli

# Login to your Expo account
eas login

# Set Apple Developer secrets
eas secret:create --scope project --name APPLE_ID_EMAIL --value "your-apple-id@example.com"
eas secret:create --scope project --name APPLE_TEAM_ID --value "XXXXXXXXXX"
eas secret:create --scope project --name APP_STORE_CONNECT_APP_ID --value "123456789"

# Set Android secrets (for future use)
eas secret:create --scope project --name GOOGLE_SERVICE_ACCOUNT_KEY_PATH --value "./path/to/key.json"

# Set build configuration
eas secret:create --scope project --name IOS_BUILD_NUMBER --value "1"
eas secret:create --scope project --name ANDROID_VERSION_CODE --value "1"
```

## 📋 Required Information

### **Apple Developer Portal Setup**

1. **Apple ID Email**

   - The email address associated with your Apple Developer account
   - Used for App Store Connect authentication

2. **Apple Team ID**

   - Found in: Apple Developer Portal → Membership
   - 10-character alphanumeric string
   - Example: `ABC123DEF4`

3. **App Store Connect App ID**
   - Found in: App Store Connect → Your App → App Information
   - Numeric ID for your specific app
   - Example: `1234567890`

### **How to Find Your Information**

#### **Team ID**

1. Go to [developer.apple.com](https://developer.apple.com)
2. Sign in and go to "Account"
3. Click "Membership" in the sidebar
4. Copy the "Team ID" value

#### **App Store Connect App ID**

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Select your app
3. Go to "App Information"
4. Look for "Apple ID" in the General Information section

## 🔧 Usage Examples

### **Local Builds**

```bash
# Load from .env file
source .env
npx expo run:ios --device
```

### **EAS Cloud Builds**

```bash
# Uses EAS Secrets automatically
eas build --platform ios --profile production-store
```

### **EAS Submit**

```bash
# Uses secrets for submission
eas submit --platform ios --profile production
```

## 🔐 Security Best Practices

### **DO:**

- ✅ Use EAS Secrets for cloud builds
- ✅ Keep .env files in .gitignore
- ✅ Use different credentials for dev/prod
- ✅ Rotate credentials regularly
- ✅ Use minimum required permissions

### **DON'T:**

- ❌ Commit .env files to git
- ❌ Share credentials in plain text
- ❌ Use production credentials for development
- ❌ Store credentials in code comments
- ❌ Use weak or reused passwords

## 🛠️ Troubleshooting

### **Common Issues**

1. **"Invalid Team ID" Error**

   ```bash
   # Verify your Team ID
   eas secret:list
   ```

2. **"App Store Connect Authentication Failed"**

   ```bash
   # Check your Apple ID email
   eas secret:push --scope project --name APPLE_ID_EMAIL --value "correct-email@example.com"
   ```

3. **"Missing Required Secrets"**
   ```bash
   # List all secrets to verify they exist
   eas secret:list
   ```

### **Secret Management**

```bash
# List all secrets
eas secret:list

# Update a secret
eas secret:push --scope project --name SECRET_NAME --value "new-value"

# Delete a secret
eas secret:delete --scope project --name SECRET_NAME
```

## 📚 Additional Resources

- [EAS Secrets Documentation](https://docs.expo.dev/eas/environment-variables-and-secrets/)
- [Apple Developer Portal](https://developer.apple.com)
- [App Store Connect](https://appstoreconnect.apple.com)
- [SecureVault Security Documentation](../SECURITY.md)

---

⚠️ **Security Warning**: Never commit actual credentials to version control. Always use the template files and secret management systems.
