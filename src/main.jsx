import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { PayPalScriptProvider } from '@paypal/react-paypal-js';


const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
console.log("PayPal Client ID from env:", paypalClientId);
if (!paypalClientId) {
  console.error("!!! PayPal Client ID not found in environment variables (VITE_PAYPAL_CLIENT_ID) !!!");
  // Display an error message to the user or stop app initialization
  // For now, the provider might try to initialize without it, causing the 400 error.
}
const initialOptions = {
  "client-id": paypalClientId, // Use the variable here
  currency: "USD",
  intent: "capture",
};


createRoot(document.getElementById('root')).render(
  <StrictMode>
        <PayPalScriptProvider options={initialOptions}>
      <App />
    </PayPalScriptProvider>
  </StrictMode>,
)
