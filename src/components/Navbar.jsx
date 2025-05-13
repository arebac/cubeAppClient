// src/components/Navbar.jsx
import React, { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Modal from "./Modal";
import styles from "../components/navbar.module.css";
// Import icons you want to use, e.g., from react-icons/fa or other libraries
import { FaHome, FaCrown, FaUserCircle, FaUserPlus, FaThLarge, FaRunning, FaSignOutAlt, FaTimes,FaChevronDown} from "react-icons/fa";

const Navbar = () => {
  const { user, logout, isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    navigate("/login");
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
      if (!mobile) setIsMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Define links WITH icons ---
  const commonLinks = [
    { path: "/home", label: "Home", icon: <FaHome /> },
    { path: "/subs", label: "Subs", icon: <FaCrown /> },
  ];
  const loggedOutLinks = [
    ...commonLinks,
    { path: "/login", label: "Login", icon: <FaUserCircle /> },
    { path: "/register", label: "Sign Up", icon: <FaUserPlus /> },
  ];
  const loggedInLinks = [
    ...commonLinks,
    { path: "/dashboard", label: "Dashboard", icon: <FaThLarge /> },
    { path: "/drop-in", label: "Drop In", icon: <FaRunning /> }, // Example icon
  ];
  const linksToRender = user ? loggedInLinks : loggedOutLinks;

  // Helper to render links - now includes icon
  const renderLinks = (linkStyleClass, iconStyleClass) => (
    <>
      {linksToRender.map((link) => (
        <NavLink
          key={link.path}
          to={link.path}
          className={({ isActive }) => `${linkStyleClass} ${isActive ? styles.activeLink : ''}`}
          onClick={() => setIsMenuOpen(false)}
          end={link.path === "/"}
        >
          {/* Add icon next to label */}
          {link.icon && <span className={iconStyleClass || styles.navIcon}>{link.icon}</span>}
          {link.label}
        </NavLink>
      ))}
      {user && (
        <button onClick={handleLogout} className={`${linkStyleClass} ${styles.logoutButton}`}>
           {/* Add icon to logout */}
           <span className={iconStyleClass || styles.navIcon}><FaSignOutAlt /></span>
           Logout
        </button>
      )}
    </>
  );

  if (isAuthLoading) {
    // Simplified loading state for navbar
    return <nav className={styles.navbar}><div className={styles.logo}><Link to="/"><img src="/logo_no_background.5b9fd4286b9cbfd212fd.png" alt="The Cube Logo" /></Link></div></nav>;
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
         <Link to="/">
             <img src="public/image.png" alt="The Cube Logo" />
         </Link>
      </div>

      {/* Conditional Rendering: Desktop Links vs Mobile Hamburger */}
      {isMobileView ? (
        // --- MODIFIED Mobile View: Hamburger Button with Logo ---
        <button className={styles.hamburger} onClick={() => setIsMenuOpen(true)} aria-label="Open menu">
           {/* Use your logo image as the button trigger */}
           <img src="public/image.png" alt="Menu" className={styles.hamburgerIcon} />
           {/* Optional: Keep the down arrow if desired */}
           <FaChevronDown className={styles.hamburgerArrow} />
        </button>
      ) : (
        // --- Desktop View: Links ---
        <div className={styles.navLinksDesktop}>
          {/* Pass the icon style class if needed */}
          {renderLinks(styles.navLink, styles.navIconDesktop)}
        </div>
      )}

      {/* Render Modal conditionally */}
      {isMobileView && isMenuOpen && (
        <Modal onClose={() => setIsMenuOpen(false)}>
          {/* Content specifically for the mobile menu modal */}
          <div className={styles.modalMenuContainer}>
             {/* Close button positioned inside the modal */}
             <button className={styles.modalCloseButton} onClick={() => setIsMenuOpen(false)} aria-label="Close menu">
                <FaTimes /> {/* Use react-icons X */}
             </button>
             <h2>MENU</h2>
             {/* Container for the links inside the modal */}
             <nav className={styles.navLinksModal}>
                {/* Pass the modal icon style class */}
                {renderLinks(styles.navLinkModal, styles.navIconModal)}
             </nav>
          </div>
        </Modal>
      )}
    </nav>
  );
};

export default Navbar;