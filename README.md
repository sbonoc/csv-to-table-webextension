# CSV to Table Filler - Firefox Add-on

A Firefox extension that automates filling HTML tables using CSV files, with support for custom column mapping.

## 📋 Description

This extension allows users to:

- **Load CSV files** directly from the browser
- **Map CSV columns** to fields in HTML tables on the current page
- **Automatically fill** HTML tables with CSV data
- **Save mapping configurations** for reuse in the future

Perfect for automating repetitive tasks involving completing forms or tables on websites.

## ✨ Key Features

- 🔄 Flexible mapping of CSV columns to HTML fields
- 💾 Persistence of mapping configurations
- 📊 Support for standard HTML tables
- 🎯 Intuitive interface for configuring mappings
- ♻️ Reuse of previous configurations

## 🚀 Quick Start

(Installation and usage instructions will be added soon)

## 🧪 Testing

This project follows the **Test Pyramid** and **Shift Left** principles for automated testing:

- **Unit Tests**: 70% - Fast, isolated function tests using Vitest
- **Integration Tests**: 20% - Module interaction tests
- **E2E Tests**: 10% - Complete user workflows with Playwright/Firefox

**Run tests:**
```bash
npm run test:unit        # Fast feedback (recommended during development)
npm run test:integration # Test module interactions
npm run test:e2e         # Full browser tests
npm run test:all         # Run all tests
npm run test:coverage    # Generate coverage report
```

See [TESTING.md](TESTING.md) for detailed testing strategy and best practices.

## 📁 Project Structure

```
src/
├── core/                  # Domain layer (business logic, entities)
├── application/           # Application layer (services, use cases)
├── infrastructure/        # Infrastructure layer (config, logger, storage, messaging)
├── background/           # Background script
└── content/              # Content script

popup/                    # Popup UI
tests/                    # Unit, integration, E2E tests

ARCHITECTURE.md                    # System architecture overview
ARCHITECTURE_REFACTORING.md        # Detailed refactoring guide  
REFACTORING_GUIDE.md              # Step-by-step refactoring instructions
TESTING.md                        # Testing strategy and best practices
```

## 🏗️ Architecture

This project follows a **layered architecture** with clean separation of concerns:

- **Presentation Layer** (Popup): UI components and user interaction
- **Application Layer**: Services and use cases
- **Domain Layer**: Business logic and entities
- **Infrastructure Layer**: Technical services (logging, storage, messaging, DI)

**Read**: [ARCHITECTURE.md](ARCHITECTURE.md) for detailed diagrams and data flows.

## 🔄 Code Quality & Refactoring

The codebase follows best practices for:
- Clean Architecture & SOLID Principles
- Dependency Injection
- Error Handling & Logging
- Test-Driven Development
- Gradual Refactoring

**Current State**: [ARCHITECTURE_REFACTORING.md](ARCHITECTURE_REFACTORING.md)
**Migration Path**: [REFACTORING_GUIDE.md](REFACTORING_GUIDE.md)

## 🛠️ Technologies

- Firefox WebExtensions API
- HTML5 / CSS3 / JavaScript

## 📝 License

(To be defined)

## 🤝 Contributing

(Contributing information will be added soon)
