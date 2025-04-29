import React, { useState, useEffect } from 'react';
import styles from '../styles/home.module.css'; // Create this CSS file
// Import a utility function to fetch quotes (we'll create this next)
import { fetchQuotes } from '../utils/QuoteFetcher';

const HomePage = () => {
    const [quotes, setQuotes] = useState([]); // To store fetched quotes
    const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch quotes on component mount
    useEffect(() => {
        const loadQuotes = async () => {
            setLoading(true);
            setError(null);
            try {
                const fetchedQuotes = await fetchQuotes(); // Fetch from our utility
                if (fetchedQuotes && fetchedQuotes.length > 0) {
                    setQuotes(fetchedQuotes);
                    // Start with a random quote index? Or always 0? Let's start with 0.
                    setCurrentQuoteIndex(0);
                } else {
                    // Handle case where no quotes are returned
                    setError("Could not load quotes.");
                    setQuotes([{ text: "Welcome!", author: "The Cube PR" }]); // Default message
                }
            } catch (err) {
                setError("Failed to fetch quotes.");
                console.error("Quote fetch error:", err);
                setQuotes([{ text: "Error loading quote.", author: "" }]); // Error message
            } finally {
                setLoading(false);
            }
        };
        loadQuotes();
    }, []); // Empty dependency array means run once on mount

    // Effect for rotating quotes
    useEffect(() => {
        // Only start interval if quotes are loaded and there's more than one
        if (quotes.length > 1) {
            const intervalId = setInterval(() => {
                setCurrentQuoteIndex(prevIndex => (prevIndex + 1) % quotes.length);
            }, 10000); // Change quote every 10 seconds (10000 ms)

            // Cleanup function to clear interval when component unmounts
            return () => clearInterval(intervalId);
        }
    }, [quotes]); // Rerun effect if the quotes array changes

    // Get the current quote object safely
    const currentQuote = quotes[currentQuoteIndex] || { text: '', author: '' };

    return (
        <div className={styles.homeContainer}>
            {/* Optional: Add loading indicator */}
            {/* {loading && <p className={styles.loading}>Loading Quote...</p>} */}

            {/* Overlay for the quote */}
            {!loading && ( // Don't show overlay until loaded/failed
                 <div className={styles.quoteOverlay}>
                     {error ? (
                         <p className={`${styles.quoteText} ${styles.errorText}`}>{error}</p>
                     ) : (
                         <>
                             <blockquote className={styles.quoteText}>
                                 "{currentQuote.text}"
                             </blockquote>
                             <cite className={styles.quoteAuthor}>
                                 {currentQuote.author ? `— ${currentQuote.author}` : ''}
                             </cite>
                         </>
                     )}
                 </div>
            )}
        </div>
    );
};

export default HomePage;