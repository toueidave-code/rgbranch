import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

function Header() {
  const titleRef = useRef(null);
  const hoverTween = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: -24, scale: 0.96, letterSpacing: '0.16em' },
        { opacity: 1, y: 0, scale: 1, duration: 1.1, ease: 'power3.out', letterSpacing: '0.05em' }
      );

      gsap.to(titleRef.current, {
        textShadow: '0 0 24px rgba(59, 130, 246, 0.25)',
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }, titleRef);

    return () => ctx.revert();
  }, []);

  const handleMouseEnter = () => {
    hoverTween.current = gsap.to(titleRef.current, {
      scale: 1.06,
      y: -6,
      duration: 0.35,
      ease: 'power3.out',
      textShadow: '0 0 32px rgba(59, 130, 246, 0.45)',
    });
  };

  const handleMouseLeave = () => {
    if (hoverTween.current) {
      hoverTween.current.reverse();
    }
    gsap.to(titleRef.current, {
      scale: 1,
      y: 0,
      duration: 0.35,
      ease: 'power3.out',
      textShadow: '0 0 24px rgba(59, 130, 246, 0.25)',
    });
  };

  return (
    <header className="app-header text-center mb-10 md:mb-5 border-b border-theme-border dark:border-darkTheme-border pb-3">
      <h1
        ref={titleRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="text-4xl md:text-5xl font-bold text-theme-text-primary dark:text-darkTheme-text-primary mb-3 flex items-center justify-center tracking-tight cursor-pointer"
      >
        ☔ RAIN GUTTER DEPARTMENT
      </h1>
      <p className="text-base md:text-lg text-theme-text-muted dark:text-darkTheme-text-muted uppercase tracking-wider text-xs">
        For Side Drain & Vertical Drain Confirmation Only
      </p>
      <p id="fileNameDisplay" className="text-center font-semibold text-theme-text-primary dark:text-darkTheme-text-primary mb-2"></p>
    </header>
  );
}

export default Header;
