
import React, { useState, useRef, useEffect } from 'react';

export const useUIState = () => {
  const [showHeader, setShowHeader] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const sidebarRef = useRef(null);
  const sidebarTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const showSidebar = () => {
    if (sidebarTimeoutRef.current) {
      clearTimeout(sidebarTimeoutRef.current);
      sidebarTimeoutRef.current = null;
    }
    setSidebarVisible(true);
  };

  const hideSidebar = (e) => {
    if (isConfirmationOpen) return;
    
    // Don't hide if mouse leaves from the left edge of the screen
    if (e && e.clientX <= 1) {
      return;
    }
    
    sidebarTimeoutRef.current = setTimeout(() => {
      setSidebarVisible(false);
    }, 100); // Further reduced for instant feel
  };

  const cancelHideSidebar = () => {
    if (sidebarTimeoutRef.current) {
      clearTimeout(sidebarTimeoutRef.current);
      sidebarTimeoutRef.current = null;
    }
  };

  // Handle left edge hover detection with buffer zone
  useEffect(() => {
    const handleMouseMove = (e) => {
      // Create a 30px buffer zone from the left edge
      if (e.clientX <= 30 && !sidebarVisible) {
        showSidebar();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [sidebarVisible]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (sidebarTimeoutRef.current) {
        clearTimeout(sidebarTimeoutRef.current);
      }
    };
  }, []);

  return {
    showHeader,
    setShowHeader,
    sidebarVisible,
    setSidebarVisible,
    isConfirmationOpen,
    setIsConfirmationOpen,
    messagesEndRef,
    inputRef,
    sidebarRef,
    scrollToBottom,
    showSidebar,
    hideSidebar,
    cancelHideSidebar
  };
};
