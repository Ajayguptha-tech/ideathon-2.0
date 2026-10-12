import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import IntroExperience from './components/IntroExperience';
import Navbar from './components/Navbar';
import SideNav from './components/SideNav';
import {
  Hero,
  Timeline,
  Guidelines,
  Evaluation,
  AbstractAndPresentationTemplates,
  Prizes,
  Announcements,
  CoreOrganizers,
  FAQ,
  Footer,
} from './components/Sections';
import TeamRegistration from './components/TeamRegistration';
import AdminDashboard from './components/AdminDashboard';
import ErrorBoundary from './components/ErrorBoundary';

const normalizePath = (p: string) => {
  return p.toLowerCase().trim().replace(/\/+$/, '') || '/';
};

export default function App() {

  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return normalizePath(window.location.pathname);
    }
    return '/';
  });

  const [intro, setIntro] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        const norm = normalizePath(window.location.pathname);
        if (norm === '/admin' || norm === '/organizer') return false;
        if (window.location.hash && window.location.hash !== '#home') return false;
      }
      return sessionStorage.getItem('intro-seen') !== '1';
    } catch {
      return true;
    }
  });

  // Track navigation (popstate and location changes)
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(normalizePath(window.location.pathname));
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const done = () => {
    try {
      sessionStorage.setItem('intro-seen', '1');
    } catch {
      /* ignore */
    }
    setIntro(false);
  };

  // If hash changes to #home and user explicitly wants to see intro or hero
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#home' && intro) {
        setIntro(false);
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [intro]);

  // If currently on admin or organizer dashboard route
  const activeNormalizedPath = normalizePath(currentPath);
  if (activeNormalizedPath === '/admin' || activeNormalizedPath === '/organizer') {
    return (
      <ErrorBoundary>
        <AdminDashboard />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {/* 3D Intro Experience with smooth cinematic exit */}
      <AnimatePresence>
        {intro && <IntroExperience key="intro" onDone={done} />}
      </AnimatePresence>

      {/* Main Website Flow */}
      {!intro && (
        <>
          <Navbar />
          <SideNav />
          <main>
            {/* 1. Animated landing page */}
            <Hero />

            {/* 2. Event schedule */}
            <Timeline />

            {/* 3. Guidelines and eligibility */}
            <Guidelines />

            {/* 4. Two-round evaluation process */}
            <Evaluation />

            {/* 5. Official Templates and Final Round Criteria */}
            <AbstractAndPresentationTemplates />

            {/* 6. Prizes and certificates */}
            <Prizes />

            {/* 7. Announcements, results and venue */}
            <Announcements />

            {/* 8. Team registration (multi-step registration system) */}
            <TeamRegistration />

            {/* 9. Core Organizers leadership */}
            <CoreOrganizers />

            {/* FAQ Accordion */}
            <FAQ />
          </main>

          {/* 10. Footer and developer credits */}
          <Footer />
        </>
      )}
    </ErrorBoundary>
  );
}
