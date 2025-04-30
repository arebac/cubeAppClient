import React, { useState, useEffect } from 'react';
// Import Link for the login/register prompt
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // To check login status
import styles from '../styles/subs.module.css'; // Make sure path is correct
// --- STEP 1: Uncomment or add the import for your PayPal button ---
import PayPalButton from '../components/PayPalButton'; // Ensure path is correct

// --- Define Plan Data ---
// IMPORTANT: Fetch this from your backend in a real app.
const plansData = [
    { id: 'basic_monthly', name: "Basic", priceInCents: 999, displayPrice: "$9.99/month", features: ["1 Video/Week", "Access to Group Chat"] },
    { id: 'standard_monthly', name: "Standard", priceInCents: 1999, displayPrice: "$19.99/month", features: ["3 Videos/Week", "Priority Support"] },
    { id: 'premium_monthly', name: "Premium", priceInCents: 2999, displayPrice: "$29.99/month", features: ["5 Videos/Week", "Exclusive Content"] },
    { id: 'vip_monthly', name: "VIP", priceInCents: 4999, displayPrice: "$49.99/month", features: ["Unlimited Videos", "1-on-1 Coaching"], isFeatured: true },
];


const SubsPage = () => {
    const [selectedPlanId, setSelectedPlanId] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState('');
    const [paymentError, setPaymentError] = useState('');
    const [paymentSuccessData, setPaymentSuccessData] = useState(null);

    // Get user and loading status from context
    const { user, isAuthLoading } = useAuth();
    const navigate = useNavigate();

    // useEffect to check login status is NO LONGER needed here as page is public

    const handleSelectPlan = (planId) => {
        if (paymentStatus === 'success') return;
        setSelectedPlanId(planId);
        setPaymentStatus('');
        setPaymentError('');
        setPaymentSuccessData(null);
        console.log("Selected Plan ID:", planId);
    };

    const handlePaymentSuccess = (orderData) => {
        console.log("Payment Success Callback!", orderData);
        setPaymentStatus('success');
        setPaymentSuccessData(orderData);
        setPaymentError('');
        setSelectedPlanId(null);
        alert(`Subscription Successful! Order ID: ${orderData?.orderID}. Redirecting...`);
        setTimeout(() => navigate('/dashboard'), 1500);
    };

    const handlePaymentError = (errorMessage) => {
        console.error("Payment Error Callback!", errorMessage);
        setPaymentStatus('error');
        setPaymentError(errorMessage || "An unknown payment error occurred.");
    };

    // Find selected plan details for display purposes
    const selectedPlanDetails = plansData.find(p => p.id === selectedPlanId);

    // Don't render main content until auth status is known (prevents flicker)
    if (isAuthLoading) {
        return <div className={styles.container}><p className={styles.loadingText}>Loading...</p></div>;
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>Choose Your Subscription</h1>

            {/* Display Global Payment Status Messages */}
            {paymentStatus === 'success' && <p className={styles.successText}>Subscription Activated!</p>}
            {/* Only show general error if NOT showing checkout section, otherwise show it there */}
            {paymentStatus === 'error' && !selectedPlanId && <p className={styles.errorText}>Payment Failed: {paymentError}</p>}

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
                        {selectedPlanId === plan.id && <span className={styles.selectedIndicator}>Selected</span>}
                    </div>
                ))}
            </div>

            {/* --- MODIFIED Checkout Section --- */}
            {selectedPlanId && paymentStatus !== 'success' && (
                <div className={styles.checkoutSection}>
                    <h3>Checkout for {selectedPlanDetails?.name}</h3>

                    {/* --- STEP 2: Add Login Check Here --- */}
                    {user ? (
                        // USER IS LOGGED IN: Show PayPal Button & payment errors
                        <>
                            {paymentStatus === 'error' && <p className={styles.errorText} style={{marginBottom: '15px'}}>{paymentError}</p>}
                            <div className={styles.paypalButtonContainer}>
                                <PayPalButton
                                    planId={selectedPlanId}
                                    onPaymentSuccess={handlePaymentSuccess}
                                    onPaymentError={handlePaymentError}
                                />
                            </div>
                        </>
                    ) : (
                        // USER IS NOT LOGGED IN: Show Login/Register Prompt
                        <div className={styles.loginPrompt}>
                            <p>Please log in or register to complete your subscription.</p>
                            {/* Use Link component for navigation */}
                            <Link
                                to="/login"
                                state={{ from: '/subs', selectedPlanId: selectedPlanId, message: "Please log in to subscribe." }}
                                className={styles.loginButton}
                            >
                                Login
                            </Link>
                            <Link to="/register" className={styles.registerButton}>
                                Register
                            </Link>
                        </div>
                    )}
                    {/* --- End Login Check --- */}

                </div>
            )}
            {/* --- End Checkout Section --- */}

        </div>
    );
};

export default SubsPage;