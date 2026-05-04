import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface AppLayoutProps {
  sidebar: React.ReactNode;
  bottomNav: React.ReactNode;
  playerBar: React.ReactNode;
  children: React.ReactNode;
}

export const AppLayout = ({ 
  sidebar, 
  bottomNav, 
  playerBar, 
  children 
}: AppLayoutProps) => {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkSize = () => setIsDesktop(window.innerWidth >= 1024);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  return (
    <div className="min-h-screen bg-tech-void text-white overflow-hidden flex">
      {/* Desktop Sidebar */}
      <AnimatePresence mode="wait">
        {isDesktop && (
          <motion.aside
            key="desktop-sidebar"
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="w-72 border-r border-white/5 bg-tech-void flex-shrink-0 z-50 overflow-y-auto no-scrollbar hidden lg:flex flex-col"
          >
            {sidebar}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto no-scrollbar pb-32 lg:pb-8">
          <div className="max-w-7xl mx-auto w-full px-4 lg:px-8">
            {children}
          </div>
        </div>

        {/* Universal Player Bar */}
        <div className={cn(
          "px-4 pointer-events-none",
          isDesktop ? "fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-0" : "fixed bottom-24 left-0 w-full"
        )}>
          <div className="pointer-events-auto">
            {playerBar}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        {!isDesktop && (
          <nav className="fixed bottom-0 left-0 w-full px-4 pb-safe bg-tech-void/80 backdrop-blur-xl border-t border-white/5 z-40">
            {bottomNav}
          </nav>
        )}
      </main>
    </div>
  );
};
