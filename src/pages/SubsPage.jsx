import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Check login status
import styles from '../styles/subs.module.css'; // Create this CSS file
// import PayPalButton from '../components/PayPalButton'; // Import your PayPal component

// --- Define Plan Data ---
// IMPORTANT: Fetch this from your backend in a real app.
// Store prices in cents for calculations, use displayPrice for UI.
const plansData = [
    {
        id: 'basic_monthly',
        name: "Basic",
        priceInCents: 999,
        displayPrice: "$9.99/month",
        features: ["1 Video/Week", "Access to Group Chat"]
    },
    {
        id: 'standard_monthly',
        name: "Standard",
        priceInCents: 1999,
        displayPrice: "$19.99/month",
        features: ["3 Videos/Week", "Priority Support"]
    },
    {
        id: 'premium_monthly',
        name: "Premium",
        priceInCents: 2999,
        displayPrice: "$29.99/month",
        features: ["5 Videos/Week", "Exclusive Content"]
    },
    {
        id: 'vip_monthly',
        name: "VIP",
        priceInCents: 4999,
        displayPrice: "$49.99/month",
        features: ["Unlimited Videos", "1-on-1 Coaching"],
        isFeatured: true // Flag for special styling (dark background)
    },
];


const SubsPage = () => {
    const [selectedPlanId, setSelectedPlanId] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState(''); // '', 'processing', 'success', 'error'
    const [paymentError, setPaymentError] = useState('');
    const [paymentSuccessData, setPaymentSuccessData] = useState(null);

    const { user, isAuthLoading } = useAuth();
    const navigate = useNavigate();

    // Redirect non-logged-in users, as they usually can't subscribe


    const handleSelectPlan = (planId) => {
        // Prevent re-selecting if payment is already successful
        if (paymentStatus === 'success') return;

        setSelectedPlanId(planId);
        setPaymentStatus(''); // Reset payment status
        setPaymentError('');
        setPaymentSuccessData(null);
        console.log("Selected Plan ID:", planId);
    };

    // Called by PayPalButton on successful capture
    const handlePaymentSuccess = (orderData) => {
        console.log("Payment Success Callback!", orderData);
        setPaymentStatus('success');
        setPaymentSuccessData(orderData);
        setPaymentError('');
        setSelectedPlanId(null); // Clear selection after success
        // Optionally trigger user data refresh in AuthContext
        alert(`Subscription Successful! Order ID: ${orderData?.orderID}. Redirecting...`);
        setTimeout(() => navigate('/dashboard'), 1500); // Redirect after short delay
    };

    // Called by PayPalButton on error
    const handlePaymentError = (errorMessage) => {
        console.error("Payment Error Callback!", errorMessage);
        setPaymentStatus('error');
        setPaymentError(errorMessage || "An unknown payment error occurred.");
        // Keep plan selected so user can retry
    };

    // Find selected plan details for display purposes
    const selectedPlanDetails = plansData.find(p => p.id === selectedPlanId);

    // Don't render content until auth check is complete
    if (isAuthLoading) {
        return <div className={styles.container}><p className={styles.loadingText}>Loading...</p></div>;
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>Choose Your Subscription</h1>

            {/* Display Payment Status Messages */}
            {paymentStatus === 'success' && <p className={styles.successText}>Subscription Activated!</p>}
            {paymentStatus === 'error' && <p className={styles.errorText}>Payment Failed: {paymentError}</p>}

            {/* Plan Cards Container */}
            <div className={styles.plansContainer}>
                {plansData.map((plan) => (
                    <div
                        key={plan.id}
                        className={`
                            ${styles.planCard}
                            ${selectedPlanId === plan.id ? styles.selected : ''}
                            ${plan.isFeatured ? styles.featured : ''}
                            ${paymentStatus === 'success' ? styles.disabledCard : ''}
                        `}
                        // Only allow selection if payment hasn't succeeded
                        onClick={() => paymentStatus !== 'success' && handleSelectPlan(plan.id)}
                    >
                        <h2>{plan.name}</h2>
                        <p className={styles.price}>{plan.displayPrice}</p>
                        <ul className={styles.featuresList}>
                            {plan.features.map((feature, index) => (
                                <li key={index}>
                                    <span className={styles.checkmark}>✔</span> {feature}
                                </li>
                            ))}
                        </ul>
                        {/* Optional: Indicator */}
                        {selectedPlanId === plan.id && <span className={styles.selectedIndicator}>Selected</span>}
                    </div>
                ))}
            </div>

            {/* PayPal Button Section */}
            {selectedPlanId && paymentStatus !== 'success' && (
                <div className={styles.checkoutSection}>
                    <h3>Checkout for {selectedPlanDetails?.name}</h3>
                    {/* Display errors specific to PayPal process */}
                    {paymentStatus === 'error' && <p className={styles.errorText} style={{marginBottom: '15px'}}>{paymentError}</p>}
                    <div className={styles.paypalButtonContainer}>
                        <PayPalButton
                            planId={selectedPlanId}
                            // Pass price details IF your backend needs them validated again here
                            // Typically, backend gets price from planId lookup based on create-paypal-order request
                            // priceInCents={selectedPlanDetails?.priceInCents}
                            onPaymentSuccess={handlePaymentSuccess}
                            onPaymentError={handlePaymentError}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubsPage;