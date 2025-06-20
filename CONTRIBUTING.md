# Contributing to SecureVault

First off, thank you for considering contributing to SecureVault! 🎉

**This project is fully open-source and welcomes contributions from the community!**

We believe that security through transparency and collective code review makes SecureVault stronger. Whether you're a security researcher, mobile developer, or cryptocurrency enthusiast, your contributions are valuable.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md), which is based on the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you are expected to uphold this code. Please report unacceptable behavior to matheus@getsecurevault.com.

### Our Pledge

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone, regardless of age, body size, visible or invisible disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, caste, color, religion, or sexual identity and orientation.

We pledge to act and interact in ways that contribute to an open, welcoming, diverse, inclusive, and healthy community.

## Ways to Contribute

### 🔐 Security Audits

Review cryptographic implementations and security architecture. See our [Security Policy](SECURITY.md) for reporting vulnerabilities.

### 👨‍💻 Code Contributions

- **Bug fixes**: Fix issues and improve reliability
- **Feature development**: Implement new security features
- **Performance improvements**: Optimize existing functionality
- **Code quality**: Refactor and improve code structure

### 🧪 Testing

- **Add test cases**: Expand our comprehensive test suite (60+ tests)
- **Edge case coverage**: Find and test unusual scenarios
- **UI testing**: Improve Maestro-based end-to-end testing
- **Security testing**: Validate security features

### 📚 Documentation

- **Setup guides**: Improve installation and development instructions
- **Security explanations**: Clarify cryptographic implementations
- **API documentation**: Document internal APIs and utilities
- **Tutorials**: Create user and developer guides

### 🐛 Bug Reports

Report bugs using GitHub Issues with detailed reproduction steps.

### 💡 Feature Requests

Suggest new features through GitHub Issues or Discussions.

### 🎨 UI/UX Improvements

Enhance user experience while maintaining security standards.

## Development Setup

### Prerequisites

- Node.js 18+ with npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (macOS) or Android Emulator
- Git for version control

### Getting Started

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/secure-vault-app.git
cd secure-vault-app

# 3. Add upstream remote
git remote add upstream https://github.com/SecureVault-Labs/secure-vault-app.git

# 4. Install dependencies
npm install

# 5. Start development server
npm run dev

# 6. Run on specific platform
npm run ios     # iOS simulator
npm run android # Android emulator
```

### Testing Setup

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Install Maestro for UI testing (macOS/Linux)
curl -Ls "https://get.maestro.mobile.dev" | bash

# Run UI tests
maestro test maestro/flows/
```

## Contribution Guidelines

### 🔒 Security First

- **Never compromise security** for convenience or performance
- **Review security implications** of all changes
- **Test security features** thoroughly
- **Follow secure coding practices** (see Security Guidelines below)

### 📝 Code Standards

#### TypeScript

- Use **strict TypeScript** with proper type definitions
- **No `any` types** without explicit justification
- **Prefer interfaces** over type aliases for objects
- **Document complex types** with comments

#### React Native / Expo

- Use **functional components** with hooks
- Follow **React Native best practices**
- **Handle platform differences** appropriately
- **Test on both iOS and Android**

#### Code Style

- Use **Prettier** for formatting (automatic)
- Follow **ESLint rules** (run `npm run lint`)
- **Consistent naming**: camelCase for variables, PascalCase for components
- **Clear function names** that describe purpose

#### File Organization

```
utils/           # Core security utilities
app/             # Expo Router screens
__tests__/       # Comprehensive test suite
hooks/           # Custom React hooks
maestro/         # UI testing with Maestro
assets/          # Static assets
```

### 🧪 Testing Requirements

#### Unit Tests (Required)

- **All new utilities** must have unit tests
- **Security functions** require comprehensive test coverage
- **Edge cases** must be tested
- **Minimum 80% coverage** for modified files

#### Integration Tests

- **Authentication flows** must be tested end-to-end
- **Cross-component** interactions need validation
- **Error scenarios** should be covered

#### UI Tests

- **Critical user flows** need Maestro tests
- **Security features** require UI validation
- **Both platforms** should be tested

### 🔄 Development Workflow

#### Branch Strategy

```bash
# Create feature branch from main
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add your feature description"

# Push to your fork
git push origin feature/your-feature-name

# Create Pull Request on GitHub
```

#### Commit Messages

Follow conventional commits format:

```
feat: add new security feature
fix: resolve session timeout bug
docs: update security documentation
test: add comprehensive auth tests
refactor: improve crypto utility structure
security: fix potential vulnerability
```

#### Pull Request Process

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes with tests
4. **Ensure** all tests pass (`npm test`)
5. **Run** linting (`npm run lint`)
6. **Update** documentation if needed
7. **Submit** pull request with clear description

#### Pull Request Requirements

- [ ] **Description**: Clear explanation of changes
- [ ] **Tests**: Unit tests for new functionality
- [ ] **Documentation**: Updated docs if needed
- [ ] **Security Review**: Consider security implications
- [ ] **Backwards Compatibility**: No breaking changes without discussion
- [ ] **Performance**: No significant performance regression

### 🛡️ Security Guidelines

#### Cryptographic Code

- **Use established libraries** (Expo Crypto, etc.)
- **Never implement custom crypto** without expert review
- **Validate all inputs** to cryptographic functions
- **Clear sensitive data** from memory after use
- **Use secure random generation** for all random values

#### Authentication & Session Management

- **Validate all authentication states**
- **Implement proper session timeouts**
- **Clear authentication data** on logout
- **Test all authentication flows** thoroughly

#### Data Handling

- **Encrypt sensitive data** before storage
- **Validate all user inputs**
- **Sanitize data** before display
- **Never log sensitive information**

#### Network Security

- **Maintain offline-only operation**
- **Validate network isolation** in tests
- **Handle network detection** properly
- **Test offline capabilities**

### 📋 Code Review Process

#### For Contributors

- **Small, focused PRs** are easier to review
- **Self-review** your code before submitting
- **Respond promptly** to review feedback
- **Be open** to suggestions and improvements

#### Review Criteria

- **Security implications** of changes
- **Code quality** and maintainability
- **Test coverage** and quality
- **Documentation** accuracy
- **Performance impact**
- **Backwards compatibility**

### 🐛 Bug Reports

#### Before Reporting

- **Search existing issues** to avoid duplicates
- **Test on latest version** to confirm bug exists
- **Gather debugging information**

#### Bug Report Template

```markdown
**Bug Description**
Clear description of the bug

**To Reproduce**

1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
What should happen

**Screenshots**
If applicable, add screenshots

**Environment**

- OS: [e.g. iOS 16, Android 13]
- Device: [e.g. iPhone 14, Pixel 7]
- App Version: [e.g. 1.0.0]

**Additional Context**
Any other context about the problem
```

### 💡 Feature Requests

#### Feature Request Template

```markdown
**Feature Description**
Clear description of the proposed feature

**Problem Solved**
What problem does this solve?

**Proposed Solution**
How should this feature work?

**Alternatives Considered**
Other solutions you've considered

**Security Implications**
How might this affect security?

**Additional Context**
Screenshots, mockups, or examples
```

### 🏆 Recognition

We value all contributions and recognize contributors in several ways:

- **README acknowledgments** for significant contributions
- **Security Hall of Fame** for security researchers
- **Commit attribution** with co-author tags
- **Social media recognition** for major features
- **Conference speaking opportunities** (when applicable)

### 📞 Getting Help

#### Community Support

- **GitHub Discussions**: General questions and ideas
- **GitHub Issues**: Bug reports and feature requests
- **Email**: matheus@getsecurevault.com for security issues

#### Development Questions

- **Technical questions**: Use GitHub Discussions
- **Security questions**: Email matheus@getsecurevault.com
- **Code review**: Submit PR and tag maintainers

### 📚 Additional Resources

#### Documentation

- [Security Policy](SECURITY.md)
- [Threat Model](THREAT_MODEL.md)
- [Testing Guide](TESTING_EXECUTION_PLAN.md)

#### External Resources

- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)

---

## 🤝 Our Commitment

As maintainers, we commit to:

- **Welcoming** all contributors regardless of experience level
- **Providing** timely and constructive feedback
- **Maintaining** high security standards
- **Being transparent** about project direction
- **Fostering** a respectful and inclusive community

**Thank you for contributing to SecureVault! Together, we're building the most secure offline cryptocurrency vault possible.** 🚀

---

_For questions about this guide, contact matheus@getsecurevault.com_
