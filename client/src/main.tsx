import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ClientProvider } from "./context/ClientProvider";
import { MemberProvider } from "./context/MemberProvider";
import { CleaningProvider } from "./context/CleaningProvider";
import { PaymentProvider } from "./context/PaymentProvider";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MemberProvider>
      <ClientProvider>
        <CleaningProvider>
          <PaymentProvider>
            <App />
          </PaymentProvider>
        </CleaningProvider>
      </ClientProvider>
    </MemberProvider>
  </React.StrictMode>,
);