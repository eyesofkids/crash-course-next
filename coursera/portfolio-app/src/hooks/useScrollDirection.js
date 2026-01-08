import { useState, useEffect } from "react";

const useScrollDirection = () => {
  const [scrollDirection, setScrollDirection] = useState("up");
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const updateScrollDirection = () => {
      const scrollY = window.pageYOffset;
      // Only update direction if scroll amount is significant enough
      if (Math.abs(scrollY - lastScrollY) > 10) { 
        setScrollDirection(scrollY > lastScrollY ? "down" : "up");
        setLastScrollY(scrollY > 0 ? scrollY : 0);
      }
    };

    window.addEventListener("scroll", updateScrollDirection); // Add event listener on mount

    return () => {
      window.removeEventListener("scroll", updateScrollDirection); // Clean up on unmount
    };
  }, [lastScrollY]); // Re-run effect when lastScrollY changes

  return scrollDirection;
};

export default useScrollDirection;