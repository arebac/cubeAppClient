// src/utils/QuoteFetcher.js

// Hardcoded list of quotes (replace with API call later)
const quotesData = [
    { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
    { text: "Strive for progress, not perfection.", author: "Unknown" },
    { text: "The body achieves what the mind believes.", author: "Napoleon Hill" },
    { text: "Push yourself because no one else is going to do it for you.", author: "Unknown" },
    { text: "Sweat is just fat crying.", author: "Unknown" },
    { text: "Your only limit is you.", author: "Unknown" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt"},
    { text: "Constant kindness can accomplish much. As the sun makes ice melt, kindness causes misunderstanding, mistrust, and hostility to evaporate.", author: "Albert Schweitzer"}, // From video
    { text: "A good decision is based on knowledge and not on numbers.", author: "Plato"}, // From video
    { text: "Chaos is inherent in all compounded things. Strive on with diligence.", author: "Buddha"}, // From video
    { text: "The personal life deeply lived always expands into truths beyond itself.", author: "Anais Nin"} // From video
];

// Simulate an async API call
export const fetchQuotes = async () => {
    console.log("Fetching quotes (simulated)...");
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay

    // In the future, replace this with:
    // const response = await fetch('http://localhost:5001/api/quotes');
    // if (!response.ok) throw new Error('Network response was not ok');
    // const data = await response.json();
    // return data;

    // For now, return the hardcoded data
    return quotesData;
};