import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ClientProvider } from "./context/ClientContext";
import { MemberProvider } from "./context/MemberContext";
import { CleaningProvider } from "./context/CleaningContext";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MemberProvider>
      <ClientProvider>
        <CleaningProvider>
          <App />
        </CleaningProvider>
      </ClientProvider>
    </MemberProvider>
  </React.StrictMode>,
);