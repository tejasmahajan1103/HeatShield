import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Flame,
  Settings,
  History,
  Menu,
  X,
  Cloud,
  ThermometerSun,
  MapPin,
  HeartPulse,
  Home
} from 'lucide-react';
import { BackgroundDecoration } from '../components/BackgroundDecoration';
import { Footer } from '../components/Footer';
import { AwsArchitectureModal } from '../components/AwsArchitectureModal';

export const MainAppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [awsModalOpen, setAwsModalOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/app', label: 'Dashboard', icon: Home },
    { path: '/app/heat-risk', label: 'Heat Risk', icon: ThermometerSun },
    { path: '/app/recommendations', label: 'Recommendations', icon: HeartPulse },
    { path: '/app/coolspots', label: 'CoolSpots', icon: MapPin },
    { path: '/app/risk-history', label: 'Risk History', icon: History },
    { path: '/app/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <BackgroundDecoration>
      {/* Main App Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Branding */}
          <div className="flex items-center gap-2.5 shrink-0 select-none">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 p-0.5 flex items-center justify-center shadow-md shadow-orange-500/20">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                <Flame className="w-5 h-5 text-[#FF5A1F]" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
              <span className="text-xl font-black tracking-tight text-[#0F172A] font-mono">
                HeatShield
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-[#0E9F6E] border border-teal-200 whitespace-nowrap">
                Comprehensive Heat Safety Intelligence
              </span>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-1 bg-stone-100/90 p-1 rounded-xl border border-stone-200/80">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/app'}
                  className={({ isActive }) =>
                    `px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-[#FF5A1F] text-white shadow-md shadow-orange-500/20 font-bold'
                        : 'text-[#64748B] hover:text-[#0F172A] hover:bg-stone-200/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Action Header Items */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setAwsModalOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200/80 border border-stone-200 text-[#0F172A] text-xs font-semibold transition"
              title="Inspect AWS Cloud Deployment Architecture"
            >
              <Cloud className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span>AWS Architecture</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-stone-100 text-[#0F172A] hover:bg-stone-200 border border-stone-200"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white/95 border-b border-stone-200 px-4 pt-2 pb-4 space-y-1 animate-slide-down shadow-lg">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '/app'
                  ? location.pathname === '/app' || location.pathname === '/app/'
                  : location.pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
                    isActive
                      ? 'bg-[#FF5A1F] text-white font-bold'
                      : 'text-[#64748B] hover:bg-stone-100'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </NavLink>
              );
            })}

            <div className="pt-2 border-t border-stone-200 mt-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAwsModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 text-[#0F172A] text-xs font-semibold border border-stone-200"
              >
                <Cloud className="w-4 h-4 text-[#FF5A1F]" />
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
      <Footer />

      {/* AWS Architecture Modal */}
      <AwsArchitectureModal isOpen={awsModalOpen} onClose={() => setAwsModalOpen(false)} />
    </BackgroundDecoration>
  );
};
