import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/subs.module.css'; // Ensure path is correct
import PayPalButton from '../components/PayPalButton'; // Ensure path is correct

const SubsPage = () => {
    // State for fetched plan data
    const [plansData, setPlansData] = useState([]);
    const [isLoadingPlans, setIsLoadingPlans] = useState(true);
    const [planError, setPlanError] = useState(null);

    // State for user interaction and payment flow
    const [selectedPlanId, setSelectedPlanId] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState('');
    const [paymentError, setPaymentError] = useState('');
    const [paymentSuccessData, setPaymentSuccessData] = useState(null);

    // Get data and functions from AuthContext and Router
    const { user, isAuthLoading, fetchAndUpdateUser } = useAuth();
    const navigate = useNavigate();

    // Fetch Plans Data from Backend
    useEffect(() => {
        const fetchPlans = async () => {
            setIsLoadingPlans(true);
            setPlanError(null);
            try {
                const apiUrl = 'http://localhost:5001/api/plans'; // Using absolute URL
                console.log(`Fetching plans from: ${apiUrl}`);
                const response = await fetch(apiUrl);

                if (!response.ok) {
                    throw new Error(`Failed to fetch plans: ${response.status} ${response.statusText}`);
                }
                const data = await response.json();
                console.log("Successfully fetched plans:", data);
                setPlansData(data);

            } catch (error) {
                console.error("Error fetching plans:", error);
                setPlanError(error.message);
                setPlansData([]);
            } finally {
                setIsLoadingPlans(false);
            }
        };

        fetchPlans();
    }, []); // Empty dependency array ensures this runs only once

    // Event Handlers
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

    const handleCancelCheckout = () => {
        console.log("User cancelled checkout selection.");
        setSelectedPlanId(null);
        setPaymentStatus(''); // Reset status
        setPaymentError('');
    };

    // Derived State
    const selectedPlanDetails = plansData.find(p => p.id === selectedPlanId);

    // Loading / Error States
    if (isAuthLoading || isLoadingPlans) {
        return <div style={{ textAlign: 'center', padding: '50px', color: 'white', fontSize: '1.2em' }}>Loading...</div>;
    }
    if (planError) {
        return <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>Error loading plans: {planError}. Please try refreshing the page.</div>;
    }
     if (!isLoadingPlans && !planError && plansData.length === 0) {
         return <div style={{ textAlign: 'center', padding: '50px', color: 'orange' }}>No subscription plans are available at this moment. Please check back later.</div>;
     }

    // Main Render
    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>Choose Your Subscription</h1>

            {/* General Error Display */}
            {paymentStatus === 'error' && !selectedPlanId && <p className={styles.errorText}>Payment Failed: {paymentError}</p>}

            {/* Plan Cards */}
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

            {/* Checkout Section */}
            {selectedPlanId && paymentStatus !== 'success' && (
                <div className={styles.checkoutSection}>
                    <h3>Checkout for {selectedPlanDetails?.name || 'Selected Plan'}</h3>
                    {user ? (
                        <>
                            {paymentStatus === 'error' && <p className={styles.errorText} style={{ marginBottom: '15px' }}>{paymentError}</p>}
                             <p className={styles.cancelInstructions}>
                                Complete payment in the PayPal window. To cancel the PayPal process, close its window (X button or Esc key).
                            </p>
                            <div className={styles.paypalButtonContainer}>
                                <PayPalButton
                                    planId={selectedPlanId}
                                    onPaymentSuccess={handlePaymentSuccess}
                                    onPaymentError={handlePaymentError}
                                />
                            </div>
                            <div className={styles.cancelButtonContainer}>
                                <button
                                    onClick={handleCancelCheckout}
                                    className={`${styles.btn} ${styles.btnCancel}`}
                                >
                                    Cancel / Change Plan
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className={styles.loginPrompt}>
                            <p>Please log in or register to complete your subscription.</p>
                            <Link to="/login" state={{ from: '/subs', selectedPlanId: selectedPlanId, message: "Please log in to subscribe." }} className={styles.loginButton}>
                                Login
                            </Link>
                            <Link to="/register" state={{ from: '/subs', selectedPlanId: selectedPlanId }} className={styles.registerButton}>
                                Register
                            </Link>
                             <div className={styles.cancelButtonContainer} style={{marginTop: '15px'}}>
                                <button
                                    onClick={handleCancelCheckout}
                                    className={`${styles.btn} ${styles.btnCancel}`}
                                >
                                    Cancel / Change Plan
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SubsPage;