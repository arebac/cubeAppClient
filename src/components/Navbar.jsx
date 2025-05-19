// src/components/Navbar.jsx
import React, { useState, useEffect } from "react"; // Removed unused useRef
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Adjust path if needed
import Modal from "./Modal"; // Assuming Modal component path is correct
import styles from "./navbar.module.css"; // Assuming CSS module path is correct
import {
  FaHome, FaCrown, FaUserCircle, FaUserPlus,
  FaThLarge, FaRunning, FaSignOutAlt, FaTimes, FaChevronDown,
  FaChalkboardTeacher // Icon for "My Classes"
} from "react-icons/fa";

const Navbar = () => {
  const { user, logout, isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false); // Close menu on logout
    navigate("/login");   // Redirect to login page
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
      if (!mobile && isMenuOpen) { // If resizing to desktop and menu is open, close it
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    // Call on mount to set initial state, though useState initializer also does this
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [isMenuOpen]); // Re-check if isMenuOpen changes, though primary trigger is resize

  // --- Define link structures ---
  const commonLinks = [
    { path: "/home", label: "Home", icon: <FaHome /> },
    { path: "/subs", label: "Subs", icon: <FaCrown /> },
  ];

  const loggedOutLinks = [
    ...commonLinks,
    { path: "/login", label: "Login", icon: <FaUserCircle /> },
    { path: "/register", label: "Sign Up", icon: <FaUserPlus /> },
  ];

  // Dynamically build loggedInLinks based on user role
  let loggedInLinks = [];
  if (user) { // Ensure user object exists before accessing role
    loggedInLinks = [
      ...commonLinks,
      { path: "/dashboard", label: "Dashboard", icon: <FaThLarge /> },
    ];
    if (user.role === 'coach' || user.role === 'admin') {
      // Coaches and Admins go to "/my-classes"
      loggedInLinks.push({ path: "/my-classes", label: "My Classes", icon: <FaChalkboardTeacher /> });
    } else {
      // Regular users go to "/drop-in"
      loggedInLinks.push({ path: "/drop-in", label: "Drop In", icon: <FaRunning /> });
    }
  }

  // Determine which set of links to render
  const linksToRender = user ? loggedInLinks : loggedOutLinks;

  // Helper function to render NavLink components
  const renderLinks = (linkStyleClass, iconStyleClass) => (
    <>
      {linksToRender.map((link) => (
        <NavLink
          key={link.label + link.path} // Use label + path for a more unique key
          to={link.path}
          className={({ isActive }) => `${linkStyleClass} ${isActive ? styles.activeLink : ''}`}
          onClick={() => setIsMenuOpen(false)} // Close menu on link click
          end={link.path === "/"} // For exact matching on home link
        >
          {link.icon && <span className={iconStyleClass || styles.navIcon}>{link.icon}</span>}
          {link.label}
        </NavLink>
      ))}
      {user && ( // Show logout button only if user is logged in
        <button type="button" onClick={handleLogout} className={`${linkStyleClass} ${styles.logoutButton}`}>
           <span className={iconStyleClass || styles.navIcon}><FaSignOutAlt /></span>
           Logout
        </button>
      )}
    </>
  );

  // Show a minimal navbar or loading state during initial auth check if no user is yet identified
  if (isAuthLoading && !user) {
    return (
        <nav className={styles.navbar}>
            <div className={styles.logo}>
                <Link to="/">
                    {/* Ensure image path is correct for your public folder setup */}
                    <img src="/image.png" alt="The Cube Logo" />
                </Link>
            </div>
            {/* Optionally add a small loading spinner here if desired */}
        </nav>
    );
  }

  // Main navbar render
  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
         <Link to="/">
             <img src="/image.png" alt="The Cube Logo" /> {/* Ensure image path is correct */}
         </Link>
      </div>

      {/* Conditional Rendering for Mobile vs Desktop Navigation */}
      {isMobileView ? (
        // Mobile View: Hamburger button
        <button
          type="button" // Explicit button type
          className={`${styles.hamburger} ${isMenuOpen ? styles.menuIsOpen : ''}`} // Optional class for open state styling
          onClick={() => setIsMenuOpen(prev => !prev)} // Toggle menu
          aria-label="Open menu"
          aria-expanded={isMenuOpen} // Accessibility for expanded state
        >
           <img src="/image.png" alt="Menu" className={styles.hamburgerIcon} />
           <FaChevronDown className={styles.hamburgerArrow} />
        </button>
      ) : (
        // Desktop View: Inline links
        <div className={styles.navLinksDesktop}>
          {renderLinks(styles.navLink, styles.navIconDesktop)}
        </div>
      )}

      {/* Mobile Menu Modal (Rendered conditionally) */}
      {isMobileView && isMenuOpen && (
        <Modal onClose={() => setIsMenuOpen(false)}>
          <div className={styles.modalMenuContainer}>
             <button
                type="button" // Explicit button type
                className={styles.modalCloseButton}
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close menu"
             >
                <FaTimes />
             </button>
             <h2>MENU</h2>
             <nav className={styles.navLinksModal}>
                {renderLinks(styles.navLinkModal, styles.navIconModal)}
             </nav>
          </div>
        </Modal>
      )}
    </nav>
  );
};

export default Navbar;