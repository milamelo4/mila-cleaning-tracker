import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ClientProvider } from "./context/ClientContext";
import { MemberProvider } from "./context/MemberContext";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MemberProvider>
      <ClientProvider>
        <App />
      </ClientProvider>
    </MemberProvider>
  </React.StrictMode>,
);