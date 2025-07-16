# Application SDLC & Development Workflow

This document outlines the standard Software Development Life Cycle (SDLC) and the required workflow for adding new features or components to this application. Following these steps ensures consistency, maintainability, and a clear separation of concerns in our codebase.

## Development Workflow

All new feature development must follow the steps below in the specified order. This structured approach ensures that backend logic, frontend routing, and UI are built upon a solid foundation.

### 1. Create the Service

* **File Location:** `server/services/`
* **Purpose:** This is the core of the business logic. The service layer is responsible for interacting with the database, performing calculations, and handling all data manipulation. It should not contain any code related to handling HTTP requests or responses.

### 2. Create the Controller

* **File Location:** `server/controllers/`
* **Purpose:** The controller acts as the bridge between the HTTP layer and the service layer. It is responsible for receiving incoming requests, validating request bodies/params, calling the appropriate service methods, and formatting the final HTTP response to send back to the client.

### 3. Define the Route

* **File Location:** `server/routes/`
* **Purpose:** The route file maps specific API endpoints (e.g., `/api/users/:id`) to their corresponding controller methods. This layer defines the public-facing API structure of the application.

### 4. Create the Webpage Component

* **File Location:** `client/src/views/<ModuleName>/`
* **Purpose:** This is the main React component for the new page or feature. It acts as a container for other UI components and orchestrates the overall page layout and state. Replace `<ModuleName>` with the name of your feature.

### 5. Implement Component Logic (Custom Hook)

* **File Location:** `client/src/views/<ModuleName>/`
* **Purpose:** All frontend business logic, state management (`useState`, `useEffect`), and API calls should be encapsulated within a custom hook (e.g., `useMyFeatureLogic.ts`). This keeps the JSX in the webpage component clean and focused on presentation.

### 6. Style the Component (CSS)

* **File Location:** `client/src/views/<ModuleName>/`
* **Purpose:** Create the necessary CSS rules to style the new webpage and its child components. Ensure styles are scoped or follow a consistent naming convention (like BEM) to avoid conflicts.

### 7. Create the API Slice

* **File Location:** `client/src/features/`
* **Purpose:** Using a tool like Redux Toolkit Query, create an API slice to define the endpoints for interacting with the backend. This provides a structured way to handle data fetching, caching, and state management for server data.

### 8. Add to `index.jsx`

* **File Location:** `client/src/index.jsx`
* **Purpose:** If the new feature requires any global providers, context, or configuration that needs to wrap the entire application, add it here. This step is not always necessary.

### 9. Add to `App.jsx` (Routing)

* **File Location:** `client/src/App.jsx`
* **Purpose:** The final step is to integrate the new page into the application's routing system (e.g., React Router). Add a new `<Route>` that maps a client-side path to your newly created webpage component.

## Guiding Principles

* **Code Comments:** Add clear, concise comments to explain complex logic in services and controllers.
* **Testing:** Each layer should be testable. Aim to create unit tests for services and integration tests for controllers/routes.
* **Pull Requests:** All new features must be submitted via a pull request. The PR description should clearly outline the changes and reference the associated work item or ticket.