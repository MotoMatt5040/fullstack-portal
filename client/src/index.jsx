import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

import { store, persistor } from './app/store';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

console.log("index.jsx")
console.log('VITE_DEV_API_URL:', import.meta.env.VITE_DEV_API_URL);
console.log('VITE_DOMAIN_NAME:', import.meta.env.VITE_DOMAIN_NAME);
console.log('VITE_ENV:', import.meta.env.VITE_ENV);
console.log('');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter>
          <Routes>
            <Route path="/*" element={<App />} />
          </Routes>
        </BrowserRouter>
      </PersistGate>
    </Provider>
  // </React.StrictMode>
);