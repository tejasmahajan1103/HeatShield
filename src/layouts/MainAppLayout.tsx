import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Flame,
  Shield,
  MapPin,
  History,
  Settings,
  Menu,
  X,
  Cloud,
  ThermometerSun,
  HeartPulse,
  Home
} from 'lucide-react';
import { DemoNoticeBanner } from '../components/DemoNoticeBanner';
import { AwsArchitectureModal } from '../components/AwsArchitectureModal';

export const MainAppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [awsModalOpen, setAwsModalOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/app', label: 'Dashboard', icon: Home },
    { path: '/app/heat-risk', label: 'Heat Risk', icon: ThermometerSun },
    { path: '/app/coolspots', label: 'CoolSpots', icon: MapPin },
    { path: '/app/recommendations', label: 'Recommendations', icon: HeartPulse },
    { path: '/app/history', label: 'History', icon: History },
    { path: '/app/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Demo Disclosure Banner */}
      <DemoNoticeBanner />

      {/* Main App Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 p-0.5 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-400 group-hover:text-amber-300 transition-colors" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-slate-100 font-mono">HeatShield</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/30">
                  CoolSpot AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">Know the heat. Find the cool.</p>
            </div>
          </NavLink>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                      isActive
                        ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20 font-bold'
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Action Header Items */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAwsModalOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold transition"
              title="Inspect AWS Cloud Deployment Architecture"
            >
              <Cloud className="w-3.5 h-3.5 text-orange-400" />
              <span>AWS Architecture</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1 animate-slide-down">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? 'bg-orange-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            <div className="pt-2 border-t border-slate-800 mt-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAwsModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700"
              >
                <Cloud className="w-4 h-4 text-orange-400" />
                <span>Inspect AWS Architecture</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Route Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* App Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-orange-400" />
            <span className="font-semibold text-slate-300">HeatShield — Environmental Safety & Cooling Intelligence</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Bharat Builds Tour — Environmental Hacks</span>
            <span>•</span>
            <span>Frontend Foundation Prototype</span>
          </div>
        </div>
      </footer>

      {/* AWS Architecture Modal */}
      <AwsArchitectureModal isOpen={awsModalOpen} onClose={() => setAwsModalOpen(false)} />
    </div>
  );
};
