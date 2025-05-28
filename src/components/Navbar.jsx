// src/components/Navbar.jsx
import React, { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Adjust path if needed
import Modal from "./Modal"; // Assuming Modal component path is correct
import styles from "./navbar.module.css"; // Assuming CSS module path is correct
import {
  FaHome, FaCrown, FaUserCircle, FaUserPlus,
  FaThLarge, FaRunning, FaSignOutAlt, FaTimes, FaChevronDown,
  FaChalkboardTeacher, // Icon for Coach Schedule / My Classes
  FaChartBar // Icon for Admin Metrics
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
    handleResize(); // Call on mount
    return () => window.removeEventListener('resize', handleResize);
  }, [isMenuOpen]);

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

    // Role-specific links
    if (user.role === 'coach') {
      loggedInLinks.push({ path: "/coach-schedule", label: "My Schedule", icon: <FaChalkboardTeacher /> });
    } else if (user.role === 'admin') {
      // Admin gets "Coach Schedules" (to view coach schedules) AND "Admin Metrics"
      loggedInLinks.push({ path: "/my-classes", label: "Coach Schedules", icon: <FaChalkboardTeacher /> });
      loggedInLinks.push({ path: "/admin/metrics", label: "Admin Metrics", icon: <FaChartBar /> });
    } else { // Regular 'user'
      loggedInLinks.push({ path: "/drop-in", label: "Drop In", icon: <FaRunning /> });
    }
  }

  const linksToRender = user ? loggedInLinks : loggedOutLinks;

  const renderLinks = (linkStyleClass, iconStyleClass) => (
    <>
      {linksToRender.map((link) => (
        <NavLink
          key={`${link.label}-${link.path}`} // More robust key
          to={link.path}
          className={({ isActive }) => `${linkStyleClass} ${isActive ? styles.activeLink : ''}`}
          onClick={() => setIsMenuOpen(false)}
          end={link.path === "/"}
        >
          {link.icon && <span className={iconStyleClass || styles.navIcon}>{link.icon}</span>}
          {link.label}
        </NavLink>
      ))}
      {user && (
        <button type="button" onClick={handleLogout} className={`${linkStyleClass} ${styles.logoutButton}`}>
           <span className={iconStyleClass || styles.navIcon}><FaSignOutAlt /></span>
           Logout
        </button>
      )}
    </>
  );

  if (isAuthLoading && !user) {
    return (
        <nav className={styles.navbar}>
            <div className={styles.logo}>
                <Link to="/">
                    <img src="/image.png" alt="The Cube Logo" />
                </Link>
            </div>
        </nav>
    );
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
         <Link to="/">
             <img src="/image.png" alt="The Cube Logo" />
         </Link>
      </div>

      {isMobileView ? (
        <button
          type="button"
          className={`${styles.hamburger} ${isMenuOpen ? styles.menuIsOpen : ''}`}
          onClick={() => setIsMenuOpen(prev => !prev)}
          aria-label="Open menu"
          aria-expanded={isMenuOpen}
        >
           <img src="/image.png" alt="Menu" className={styles.hamburgerIcon} /> {/* Confirm this image path */}
           <FaChevronDown className={styles.hamburgerArrow} />
        </button>
      ) : (
        <div className={styles.navLinksDesktop}>
          {renderLinks(styles.navLink, styles.navIconDesktop)}
        </div>
      )}

      {isMobileView && isMenuOpen && (
        <Modal onClose={() => setIsMenuOpen(false)}>
          <div className={styles.modalMenuContainer}>
             <button
                type="button"
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