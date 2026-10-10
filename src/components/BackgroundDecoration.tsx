import React from 'react';
import { useLocation } from 'react-router-dom';

import landingHero from '../assets/landing-hero.jpg';
import dashboardEnv from '../assets/dashboard-environment.jpg';
import heatRiskLandscape from '../assets/heat-risk-landscape.jpg';
import coolspotsSanctuary from '../assets/coolspots-sanctuary.jpg';
import settingsNature from '../assets/settings-nature.jpg';
import botanicalLeft from '../assets/botanical_left.jpg';

interface BackgroundDecorationProps {
  children: React.ReactNode;
  bgImage?: string;
  artworkOpacity?: number;
}

export const BackgroundDecoration: React.FC<BackgroundDecorationProps> = ({ 
  children, 
  bgImage,
  artworkOpacity = 0.22 
}) => {
  const location = useLocation();

  const getRouteBgImage = (path: string): string | null => {
    if (bgImage) return bgImage;
    if (path === '/') return landingHero;
    if (path === '/app' || path === '/app/') return dashboardEnv;
    if (path.startsWith('/app/heat-risk')) return heatRiskLandscape;
    if (path.startsWith('/app/recommendations')) return null;
    if (path.startsWith('/app/coolspots')) return coolspotsSanctuary;
    if (path.startsWith('/app/settings')) return settingsNature;
    return landingHero;
  };

  const activeBg = getRouteBgImage(location.pathname);

  return (
    <div className="relative min-h-screen bg-[#FFFDF7] overflow-x-hidden text-[#0F172A]">
      {/* 1. Page-Specific Background Artwork & Layered Gradients */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        {/* Dedicated Route Artwork Overlay */}
        {activeBg && (
          <div 
            className="absolute top-0 left-0 right-0 h-[520px] transition-opacity duration-500 ease-in-out mix-blend-multiply pointer-events-none"
            style={{ opacity: artworkOpacity }}
          >
            <img 
              src={activeBg} 
              alt="Page environmental background" 
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFFDF7]/60 to-[#FFFDF7]" />
          </div>
        )}

        {/* Ambient Radial Lighting Gradients */}
        <div className="absolute -top-32 -left-32 w-96 sm:w-[550px] h-96 sm:h-[550px] rounded-full bg-gradient-to-br from-amber-200/50 via-orange-100/35 to-transparent blur-3xl" />
        <div className="absolute top-10 -right-32 w-96 sm:w-[650px] h-96 sm:h-[650px] rounded-full bg-gradient-to-bl from-sky-200/40 via-teal-100/30 to-transparent blur-3xl" />
        <div className="absolute top-[35%] left-[15%] w-[700px] h-[700px] rounded-full bg-gradient-to-r from-emerald-100/25 via-teal-100/30 to-transparent blur-3xl" />
        
        {/* Botanical Edge Leaf Overlay - Left Side (18% opacity) */}
        <div className="hidden lg:block absolute top-12 -left-4 w-64 h-[900px] opacity-[0.18] mix-blend-multiply pointer-events-none shrink-0">
          <img 
            src={botanicalLeft} 
            alt="" 
            className="w-full h-full object-contain object-left-top"
          />
        </div>

        {/* Botanical Edge Leaf Overlay - Right Side (18% opacity, mirrored) */}
        <div className="hidden lg:block absolute top-20 -right-4 w-64 h-[900px] opacity-[0.18] mix-blend-multiply pointer-events-none shrink-0 transform scale-x-[-1]">
          <img 
            src={botanicalLeft} 
            alt="" 
            className="w-full h-full object-contain object-left-top"
          />
        </div>
      </div>

      {/* 2. Main Content Layer */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  );
};
