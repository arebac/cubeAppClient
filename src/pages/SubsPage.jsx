import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/subs.module.css'; // Ensure path is correct
import PayPalButton from '../components/PayPalButton'; // Ensure path is correct

// --- Define Plan Data ---
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

    const { user, isAuthLoading, fetchAndUpdateUser } = useAuth();
    const navigate = useNavigate();

    const handleSelectPlan = (planId) => {
        if (paymentStatus === 'success') return;
        setSelectedPlanId(planId);
        setPaymentStatus('');
        setPaymentError('');
        setPaymentSuccessData(null);
        console.log("Selected Plan ID:", planId);
    };

    const handlePaymentSuccess = async (orderData) => {
        console.log("Payment Success Callback received in SubsPage!", orderData);
        setPaymentStatus('success');
        setPaymentSuccessData(orderData);
        setPaymentError('');

        try {
            if (typeof fetchAndUpdateUser === 'function') {
                await fetchAndUpdateUser();
                console.log("User context updated after subscription success.");
            } else {
                console.warn("fetchAndUpdateUser function not found in AuthContext.");
            }
        } catch (error) {
            console.error("Error updating user context after payment:", error);
        }

        navigate('/subscription-success', {
            replace: true,
            state: {
                planName: orderData?.subscription?.plan || orderData?.plan || plansData.find(p => p.id === selectedPlanId)?.name || 'Your Plan',
                expiresAt: orderData?.subscription?.expires || orderData?.expires,
                orderId: orderData?.orderID
            }
        });
    };

    const handlePaymentError = (errorMessage) => {
        console.error("Payment Error Callback received in SubsPage!", errorMessage);
        setPaymentStatus('error');
        const message = typeof errorMessage === 'string' ? errorMessage : "An unknown payment error occurred.";
        setPaymentError(message);
    };

    // --- ADDED: Handler for the new Cancel button ---
    const handleCancelCheckout = () => {
        console.log("User cancelled checkout selection.");
        setSelectedPlanId(null); // De-select the plan
        setPaymentStatus('');    // Reset payment status
        setPaymentError('');     // Clear any errors
    };
    // --- END ADDED HANDLER ---

    const selectedPlanDetails = plansData.find(p => p.id === selectedPlanId);

    if (isAuthLoading) {
        return <div style={{ textAlign: 'center', padding: '50px', color: 'white' }}>Loading...</div>;
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>Choose Your Subscription</h1>

            {paymentStatus === 'error' && !selectedPlanId && <p className={styles.errorText}>Payment Failed: {paymentError}</p>}

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
                        {selectedPlanId === plan.id && (
                            <span className={styles.selectedIndicator}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="18px" height="18px" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4Z" clipRule="evenodd" />
                                </svg>
                                Selected
                            </span>
                         )}
                        <h2>{plan.name}</h2>
                        <p className={styles.price}>{plan.displayPrice}</p>
                        <ul className={styles.featuresList}>
                            {plan.features.map((feature, index) => (
                                <li key={index}>
                                    <span className={styles.checkmark}>✔</span> {feature}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* --- MODIFIED Checkout Section --- */}
            {selectedPlanId && paymentStatus !== 'success' && (
                <div className={styles.checkoutSection}>
                    <h3>Checkout for {selectedPlanDetails?.name}</h3>

                    {user ? (
                        // USER IS LOGGED IN
                        <>
                            {paymentStatus === 'error' && <p className={styles.errorText} style={{ marginBottom: '15px' }}>{paymentError}</p>}

                            <div className={styles.paypalButtonContainer}>
                                <PayPalButton
                                    planId={selectedPlanId}
                                    onPaymentSuccess={handlePaymentSuccess}
                                    onPaymentError={handlePaymentError}
                                    // Optional: Pass cancel handler if needed by PayPalButton itself
                                    // onPaymentCancel={() => console.log('PayPal modal closed')}
                                />
                            </div>

                            {/* --- ADDED CANCEL BUTTON --- */}
                            <div className={styles.cancelButtonContainer}>
                                <button
                                    onClick={handleCancelCheckout}
                                    className={`${styles.btn} ${styles.btnCancel}`} // Use btn class + specific cancel class
                                >
                                    Cancel / Change Plan
                                </button>
                            </div>
                            {/* --- END ADDED CANCEL BUTTON --- */}
                        </>
                    ) : (
                        // USER IS NOT LOGGED IN
                        <div className={styles.loginPrompt}>
                            <p>Please log in or register to complete your subscription.</p>
                            <Link to="/login" state={{ from: '/subs', selectedPlanId: selectedPlanId, message: "Please log in to subscribe." }} className={styles.loginButton}>
                                Login
                            </Link>
                            <Link to="/register" className={styles.registerButton}>
                                Register
                            </Link>
                            {/* --- ADDED CANCEL BUTTON (also for non-logged in users) --- */}
                             <div className={styles.cancelButtonContainer} style={{marginTop: '15px'}}>
                                <button
                                    onClick={handleCancelCheckout}
                                    className={`${styles.btn} ${styles.btnCancel}`}
                                >
                                    Cancel / Change Plan
                                </button>
                            </div>
                            {/* --- END ADDED CANCEL BUTTON --- */}
                        </div>
                    )}
                </div>
            )}
            {/* --- End Checkout Section --- */}
        </div>
    );
};

export default SubsPage;