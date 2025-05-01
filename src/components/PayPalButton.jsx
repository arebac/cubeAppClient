// src/components/PayPalButton.jsx
import React, { useEffect, useState } from "react";
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js"; // Import components/hooks

const PayPalButton = ({
  planId,
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel,
}) => {
  // Hook to check SDK loading status and get options
  const [{ options, isPending, isRejected, isResolved }, dispatch] =
    usePayPalScriptReducer();
  const [error, setError] = useState(null); // Local error state

  // Optional: You can reload the script with different options if needed
  // useEffect(() => {
  //     dispatch({
  //         type: "resetOptions",
  //         value: { ...options, currency: "USD" }, // Example: ensure currency is set
  //     });
  // }, [currency]); // Dependency if currency changes

  const createOrder = async (data, actions) => {
    setError(null); // Clear previous errors
    console.log("PayPal createOrder: Triggered.");
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("No auth token");
    }

    try {
      const res = await fetch(
        "http://localhost:5001/api/payment/create-paypal-order",
        {
          // Use full URL for test
          method: "POST", // Be explicit
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ planId: planId }),
        }
      );
      const orderData = await res.json();
      if (!res.ok)
        throw new Error(orderData.message || `Backend Error: ${res.status}`);
      console.log("PayPal createOrder: Received orderID", orderData.orderID);
      return orderData.orderID;
    } catch (err) {
      console.error("PayPal createOrder: API call failed -", err);
      setError(err.message || "Could not initiate checkout.");
      throw err; // Re-throw for PayPal SDK to handle
    }
  };

  const onApprove = async (data, actions) => {
    setError(null);
    console.log("PayPal onApprove: Payment approved.", data);
    const token = localStorage.getItem("token");
    if (!token) {
      onPaymentError("Authentication error.");
      return;
    }

    try {
      // Call backend to capture order
      const res = await fetch("http://localhost:5001/api/payment/capture-paypal-order", {
        method: "POST",
        headers: {
            // --- ADD THIS HEADER ---
            'Content-Type': 'application/json',
            // --- END ADDITION ---
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderID: data.orderID }),
      });

      // Check status BEFORE parsing JSON, especially for non-JSON error pages
      if (!res.ok) {
          let errorMsg = `Capture failed: ${res.status}`;
           try {
               // Try to get specific error from backend JSON response
               const errorData = await res.json();
               errorMsg = errorData.message || errorData.details || errorMsg;
           } catch (e) {
                // If response wasn't JSON (like HTML error page), use status text
                errorMsg = `Capture failed: ${res.status} ${res.statusText}`;
           }
          throw new Error(errorMsg);
      }

      // Only parse JSON if response is OK
      const captureData = await res.json();

      console.log(
        "PayPal onApprove: Capture successful via backend.",
        captureData
      );
      // Pass relevant data from backend response to parent
      onPaymentSuccess(captureData.orderData || { message: "Success", status: captureData.status || 'COMPLETED' });

    } catch (err) {
      console.error("PayPal onApprove: API call/Capture error -", err);
      setError(err.message || "Failed to process payment after approval.");
      onPaymentError(err.message || "Payment processing failed.");
    }
  };

  const onError = (err) => {
    console.error("PayPal Button onError handler:", err);
    const message = "An error occurred during the PayPal checkout process.";
    setError(message);
    onPaymentError(message);
  };

  const onCancel = (data) => {
    console.log("PayPal onCancel: Checkout cancelled.", data);
    setError("Payment cancelled.");
    onPaymentCancel?.();
  };

  return (
    <div>
      {/* Show pending state from the SDK hook */}
      {isPending && <p>Loading PayPal...</p>}
      {/* Show local errors */}
      {error && (
        <p style={{ color: "red", fontSize: "0.9em", marginTop: "10px" }}>
          {error}
        </p>
      )}

      {/* Render the PayPalButtons component if SDK is ready */}
      {!isPending && !isRejected && (
        <PayPalButtons
          style={{ layout: "vertical", color: "gold" }} // Customize style
          createOrder={createOrder}
          onApprove={onApprove}
          onError={onError}
          onCancel={onCancel}
          // Force re-render if planId changes IMPORTANT!
          key={planId}
          // Disable button if no planId selected
          disabled={!planId}
        />
      )}
      {/* Show error if SDK script failed to load */}
      {isRejected && (
        <p style={{ color: "red" }}>Error loading PayPal checkout.</p>
      )}
    </div>
  );
};

export default PayPalButton;
