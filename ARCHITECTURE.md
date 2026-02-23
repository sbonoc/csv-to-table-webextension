# Architecture Overview

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     FIREFOX BROWSER                             │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      POPUP CONTEXT                               │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                 UI Components Layer                        │  │
│  │  ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐    │  │
│  │  │ CSVUploader │ │ MappingUI    │ │ TableSelector    │    │  │
│  │  └─────────────┘ └──────────────┘ └──────────────────┘    │  │
│  └────────────────────┬─────────────────────────────────────┘  │
│                       │                                         │
│  ┌────────────────────▼─────────────────────────────────────┐  │
│  │           PopupController (Presenter)                    │  │
│  │  - Handles user interactions                             │  │
│  │  - Coordinates between UI and services                   │  │
│  │  - Manages popup state                                   │  │
│  └────────────────────┬─────────────────────────────────────┘  │
└────────────────────────┼──────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
    ┌────────────────────────────────────────────────┐
    │     APPLICATION SERVICES LAYER                 │
    │  ┌─────────────┐ ┌──────────────┐             │
    │  │ CSVService  │ │ MappingService             │
    │  │             │ │                            │
    │  │ - Parse     │ │ - Create mapping           │
    │  │ - Validate  │ │ - Validate mapping        │
    │  │ - Load file │ │ - Store mapping           │
    │  └─────────────┘ └──────────────┘             │
    └───────────┬──────────────────────────────────┘
                │
    ┌───────────▼──────────────────────────────────┐
    │     DOMAIN LAYER (Business Logic)            │
    │  ┌──────────┐ ┌──────────┐ ┌─────────────┐   │
    │  │ CsvData  │ │ Mapping  │ │ TableInfo   │   │
    │  │ - Validate       - Validate             │
    │  │ - Get row        - Apply to row        │   │
    │  └──────────┘ └──────────┘ └─────────────┘   │
    └───────────┬──────────────────────────────────┘
                │
    ┌───────────▼──────────────────────────────────┐
    │   INFRASTRUCTURE LAYER                       │
    │                                              │
    │  ┌────────────────────────────────────┐     │
    │  │ CONFIGURATION & DI                 │     │
    │  │  - Config module                  │     │
    │  │  - Container (DI)                 │     │
    │  └────────────────────────────────────┘     │
    │                                              │
    │  ┌────────────────────────────────────┐     │
    │  │ LOGGING & ERRORS                   │     │
    │  │  - Logger                         │     │
    │  │  - Error classes                  │     │
    │  │  - Error handling                 │     │
    │  └────────────────────────────────────┘     │
    │                                              │
    │  ┌────────────────────────────────────┐     │
    │  │ MESSAGING & COMMUNICATION          │     │
    │  │  - MessageBus (Events)            │     │
    │  │  - Message validation             │     │
    │  │  - Handler registration           │     │
    │  └────────────────────────────────────┘     │
    │                                              │
    │  ┌────────────────────────────────────┐     │
    │  │ DATA ACCESS (Repository)           │     │
    │  │  - StorageRepository              │     │
    │  │  - History management             │     │
    │  │  - Settings persistence           │     │
    │  └────────────────────────────────────┘     │
    └───────────┬──────────────────────────────────┘
                │
                ▼
    ┌──────────────────────────────────────────────┐
    │  EXTERNAL INTERFACES                         │
    │  - browser.storage.local                    │
    │  - browser.tabs.executeScript               │
    │  - browser.runtime.onMessage                │
    └──────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────┐
│                  BACKGROUND SCRIPT CONTEXT                        │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │          BackgroundService                               │  │
│  │  - Message routing                                       │  │
│  │  - Lifecycle management                                  │  │
│  └────────────────────┬───────────────────────────────────┘  │
└────────────────────────┼──────────────────────────────────────┘
                         │
                         ▼
                    MessageBus
                         │
    ┌────────────────────┼────────────────┐
    │                    │                │
    ▼                    ▼                ▼
  Storage             Logger          Error Handler


┌──────────────────────────────────────────────────────────────────┐
│                 CONTENT SCRIPT CONTEXT                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │           PageAnalyzer                                   │  │
│  │  - Detect tables                                        │  │
│  │  - Extract form fields                                 │  │
│  │  - Build DOM selectors                                │  │
│  └────────────────────┬───────────────────────────────────┘  │
│                       │                                        │
│  ┌────────────────────▼───────────────────────────────────┐  │
│  │          TableFiller                                  │  │
│  │  - Fill form fields                                  │  │
│  │  - Trigger events                                    │  │
│  │  - Validate fills                                    │  │
│  └────────────────────┬───────────────────────────────────┘  │
└────────────────────────┼──────────────────────────────────────┘
                         │
                         ▼
                  Target Web Page
                   (DOM, Forms)
```

## Data Flow: CSV to Table Filling

```
User Action: Upload CSV
    │
    ▼
┌─────────────────────────────────┐
│    PopupController              │
│    handleCSVUpload(file)        │
└────────────────┬────────────────┘
                 │
                 ▼
    ┌─────────────────────────┐
    │  CSVService.load(file)  │
    │  - Read file            │
    │  - Parse CSV            │
    │  - Validate data        │
    └────────────┬────────────┘
                 │
                 ▼ (CsvData entity)
    ┌─────────────────────────────────┐
    │   PopupController               │
    │   renderMappingUI(csvData)      │
    └────────────┬────────────────────┘
                 │
User Configures Mapping
    │
    ▼
┌──────────────────────────────┐
│  PopupController             │
│  handleMappingSave()         │
└────────────┬─────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ MessageBus.emit({            │
    │   type: 'SAVE_MAPPING'       │
    │   mapping: {...}             │
    │ })                           │
    └────────────┬─────────────────┘
                 │
                 ▼
    ┌──────────────────────────────┐
    │  BackgroundService           │
    │  (Message handler)           │
    └────────────┬─────────────────┘
                 │
                 ▼
    ┌──────────────────────────────┐
    │  StorageRepository.save()    │
    │  (Persist to browser.storage)│
    └──────────────────────────────┘

User Action: Fill Table
    │
    ▼
┌──────────────────────────────┐
│  PopupController             │
│  handleFillTable()           │
└────────────┬─────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ MessageBus.emit({            │
    │   type: 'FILL_TABLE'         │
    │   tableIndex: ...            │
    │   rowIndex: ...              │
    │ })                           │
    └────────────┬─────────────────┘
                 │
                 ▼
    ┌──────────────────────────────┐
    │  BackgroundService           │
    │  (Routes to ContentScript)   │
    └────────────┬─────────────────┘
                 │
                 ▼
    ┌──────────────────────────────┐
    │  ContentScript               │
    │  (In page context)           │
    └────────────┬─────────────────┘
                 │
                 ▼
    ┌──────────────────────────────┐
    │  TableFiller.fill()          │
    │  - Find fields by selector   │
    │  - Set values                │
    │  - Trigger events            │
    └────────────┬─────────────────┘
                 │
                 ▼
            Result sent back
                 │
                 ▼
    ┌──────────────────────────────┐
    │  PopupController             │
    │  showResult(success)         │
    └──────────────────────────────┘
```

## Dependency Graph

```
PopupController
  ├─ CSVService
  │   ├─ CsvParser (pure function)
  │   └─ Logger
  ├─ MappingService
  │   ├─ MappingValidator
  │   └─ Logger
  ├─ StorageRepository
  │   └─ Logger
  └─ MessageBus
      └─ Logger

BackgroundService
  ├─ MessageBus
  │   └─ Logger
  ├─ StorageRepository
  │   └─ Logger
  └─ ContentScriptManager

PageAnalyzer
  ├─ TableDetector
  └─ Logger

TableFiller
  ├─ TableEntities
  └─ Logger

All services depend on:
  - Logger (injected)
  - CONFIG (imported)
  - Custom Errors (imported)
```

## Module Responsibilities

### Presentation Layer (Popup)
- **Responsibility**: UI rendering and user interaction
- **Components**: CSVUploader, MappingUI, TableSelector
- **Controller**: PopupController coordinates components and services

### Application Layer
- **Responsibility**: Use cases and application logic
- **Services**: CSVService, MappingService, TableFillService
- **Orchestrate**: Domain entities and infrastructure

### Domain Layer
- **Responsibility**: Business logic and validation
- **Entities**: CsvData, Mapping, TableInfo
- **Pure**: No external dependencies

### Infrastructure Layer
- **Responsibility**: Technical concerns
- **Modules**:
  - **Config**: Constants and environment configuration
  - **Logger**: Structured logging
  - **Errors**: Error hierarchy and handling
  - **Storage**: Browser storage abstraction
  - **MessageBus**: Event-driven communication
  - **Container**: Dependency injection

## Testing Strategy by Layer

```
Layer               Test Type           Count   Tools
─────────────────────────────────────────────────────────
Presentation        Component Tests     10-15   Vitest + happy-dom
                    UI Behavior         5-8     
                    
Application         Service Tests       15-20   Vitest
                    Use Case Tests      5-10    
                    
Domain              Unit Tests          30+     Vitest
                    Entity Tests        10-15   
                    
Infrastructure      Unit Tests          40+     Vitest
                    Integration         5-10    Vitest
                    
E2E                Complete Flow         5-10   Playwright
```

## Benefits of This Architecture

✅ **Separation of Concerns**: Each layer has clear responsibility
✅ **Testability**: Services can be tested in isolation
✅ **Reusability**: Services can be used from popup, background, content script
✅ **Maintainability**: Clear code organization
✅ **Scalability**: Easy to add new features
✅ **Error Handling**: Centralized and consistent
✅ **Logging**: Visibility into all operations
✅ **Security**: Validation at domain boundary
✅ **Performance**: Easy to optimize specific layers
✅ **Documentation**: Architecture is self-documenting

## Migration from Current State

### Phase 1: Infrastructure (✅ COMPLETED)
- Config module
- Logger
- Error handling
- Storage abstraction
- MessageBus
- Container

### Phase 2: Domain Refactor
- Extract CsvData entity
- Extract Mapping entity
- Add validators

### Phase 3: Application Services
- Create CSVService
- Create MappingService
- Create FillFormUseCase

### Phase 4: UI Refactor
- Create PopupController
- Create components
- Replace inline code

### Phase 5: Script Refactoring
- BackgroundService
- ContentScriptManager
- PageAnalyzer
- TableFiller

Each phase maintains backward compatibility until fully migrated.
