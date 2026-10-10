import React from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  ShieldAlert,
  MapPin,
  ThermometerSun,
  ArrowRight,
  Trees,
  HeartPulse,
  Activity
} from 'lucide-react';
import { Footer } from '../components/Footer';
import { BackgroundDecoration } from '../components/BackgroundDecoration';
import heroBg from '../assets/landing-hero.jpg';

export const LandingPage: React.FC = () => {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <BackgroundDecoration>
      {/* 1. Header & Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 select-none">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 p-0.5 flex items-center justify-center shadow-md shadow-orange-500/15">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
            </div>
            <div>
              <span className="text-xl font-extrabold text-[#0F172A] tracking-tight font-mono">HeatShield</span>
              <p className="text-[11px] text-[#64748B] font-medium hidden sm:block">Know the heat. Find the cool. Stay safer.</p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#64748B]">
            <button
              onClick={() => scrollToSection('overview')}
              className="hover:text-[#FF5A1F] transition cursor-pointer"
            >
              Overview
            </button>

            <button
              onClick={() => scrollToSection('heat-safety-features')}
              className="hover:text-[#FF5A1F] transition cursor-pointer"
            >
              Heat Safety Features
            </button>

            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-[#FF5A1F] transition cursor-pointer"
            >
              How it works
            </button>
          </nav>

          {/* Header Action Button */}
          <div className="flex items-center gap-3">
            <Link
              to="/app"
              className="px-5 py-2.5 rounded-xl bg-[#FF5A1F] hover:bg-[#e04a12] text-white font-bold text-sm transition shadow-md shadow-orange-500/20 flex items-center gap-2"
            >
              <ThermometerSun className="w-4 h-4" />
              <span>Explore</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section with Landscape Artwork Overlay */}
      <section id="overview" className="relative pt-16 pb-24 overflow-hidden border-b border-stone-200/80">
        {/* Background Artwork Banner */}
        <div className="absolute inset-0 z-0 opacity-25 mix-blend-multiply pointer-events-none">
          <img 
            src={heroBg} 
            alt="Eco-friendly city park background" 
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#FFFDF7]/90 via-[#FFF8EE]/70 to-[#FFFDF7]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/80 border border-orange-200 text-orange-900 text-xs font-bold shadow-xs">
            <Flame className="w-4 h-4 text-[#FF5A1F]" />
            <span>Bharat Builds Tour — Environmental Safety Hacks</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#0F172A] tracking-tight leading-[1.15]">
            Know the heat.{' '}
            <span className="bg-gradient-to-r from-[#FF5A1F] via-[#FFA000] to-[#0E9F6E] bg-clip-text text-transparent">
              Find the cool.
            </span>{' '}
            Stay safer.
          </h1>

          <p className="text-base sm:text-lg text-[#64748B] leading-relaxed max-w-2xl mx-auto font-medium">
            Assess personal heat-exposure risks for planned outdoor activities and locate nearby verified cooling sanctuaries (CoolSpot) before thermal stress causes illness.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/app/heat-risk"
              className="px-7 py-4 rounded-2xl bg-[#FF5A1F] hover:bg-[#e04a12] text-white font-extrabold text-base transition shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2.5 group w-full sm:w-auto"
            >
              <ThermometerSun className="w-5 h-5" />
              <span>Check my heat risk</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/app/coolspots"
              className="px-7 py-4 rounded-2xl bg-white/90 backdrop-blur-sm hover:bg-white border border-stone-300 text-[#0F172A] font-bold text-base transition shadow-sm flex items-center justify-center gap-2.5 w-full sm:w-auto"
            >
              <MapPin className="w-5 h-5 text-[#0E9F6E]" />
              <span>Explore CoolSpots</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Feature Cards Section */}
      <section id="heat-safety-features" className="scroll-mt-20 py-20 border-b border-stone-200/70 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF5A1F] bg-orange-50 border border-orange-200 px-3 py-1 rounded-full">
              Heat Safety Features
            </span>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight mt-3">
              Comprehensive Heat Safety Intelligence
            </h2>
            <p className="text-[#64748B] text-base mt-2">
              Designed to protect outdoor workers, athletes, commuters, and vulnerable citizens during extreme heat waves.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: Understand your risk */}
            <div className="bg-white/90 backdrop-blur-md border border-stone-200/90 rounded-3xl p-7 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-[#FF5A1F] flex items-center justify-center">
                  <ThermometerSun className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#0F172A]">Understand your risk</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">
                  Calculate a transparent preliminary heat-exposure risk score combining ambient temperature, relative humidity, UV radiation, activity load, duration, and shade.
                </p>
              </div>

              <div className="pt-6">
                <Link
                  to="/app/heat-risk"
                  className="text-sm font-bold text-[#FF5A1F] hover:text-[#e04a12] inline-flex items-center gap-1.5 transition"
                >
                  <span>Calculate Heat Risk</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Card 2: Find nearby cooling */}
            <div className="bg-white/90 backdrop-blur-md border border-stone-200/90 rounded-3xl p-7 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-[#0E9F6E] flex items-center justify-center">
                  <Trees className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#0F172A]">Find nearby cooling</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">
                  Locate shaded park canopies, air-conditioned public halls, chilled water refill points, and official municipal cooling havens with distance routing.
                </p>
              </div>

              <div className="pt-6">
                <Link
                  to="/app/coolspots"
                  className="text-sm font-bold text-[#0E9F6E] hover:text-[#0b8259] inline-flex items-center gap-1.5 transition"
                >
                  <span>Explore CoolSpots</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Card 3: Choose a safer plan */}
            <div className="bg-white/90 backdrop-blur-md border border-stone-200/90 rounded-3xl p-7 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[#FFA000] flex items-center justify-center">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#0F172A]">Choose a safer plan</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">
                  Receive personalized hydration protocols, mandatory rest interval guidance, heat exhaustion warning sign matrix, and suggested lower-risk alternative time windows.
                </p>
              </div>

              <div className="pt-6">
                <Link
                  to="/app/recommendations"
                  className="text-sm font-bold text-[#FFA000] hover:text-[#d98800] inline-flex items-center gap-1.5 transition"
                >
                  <span>View Safety Protocols</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gradient-to-br from-[#E6F6FC]/70 to-[#E1FBF2]/60 border-b border-teal-100/80 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0284C7] bg-sky-100 border border-sky-200 px-3 py-1 rounded-full">
              Simple 4-Step Process
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight mt-3">
              How HeatShield Works
            </h2>
            <p className="text-[#64748B] text-base mt-2">
              A transparent workflow designed for instant heat safety awareness and cooling spot discovery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {[
              {
                step: '01',
                title: 'Check conditions',
                desc: 'Review live ambient temperature, relative humidity, wet-bulb proxy, and UV radiation index.',
                icon: ThermometerSun,
                color: 'text-[#FFA000] bg-amber-100'
              },
              {
                step: '02',
                title: 'Enter your activity',
                desc: 'Specify your planned outdoor activity (walking, cycling, running, work), duration, start time, and shade coverage.',
                icon: Activity,
                color: 'text-[#FF5A1F] bg-orange-100'
              },
              {
                step: '03',
                title: 'Review risk factors',
                desc: 'Inspect the transparent deterministic heat stress calculation and key factors influencing your score.',
                icon: ShieldAlert,
                color: 'text-rose-600 bg-rose-100'
              },
              {
                step: '04',
                title: 'Explore CoolSpots',
                desc: 'Locate nearby verified shaded parks, indoor air-conditioned spaces, and water refill points.',
                icon: MapPin,
                color: 'text-[#0E9F6E] bg-teal-100'
              }
            ].map((st, idx) => {
              const Icon = st.icon;
              return (
                <div key={idx} className="bg-white/95 border border-sky-100/80 rounded-3xl p-6 shadow-xs relative flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-black font-mono text-[#0284C7]">{st.step}</span>
                      <div className={`p-2.5 rounded-xl ${st.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                    <h4 className="font-bold text-[#0F172A] text-lg">{st.title}</h4>
                    <p className="text-xs text-[#64748B] mt-2 leading-relaxed">{st.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Footer */}
      <Footer />
    </BackgroundDecoration>
  );
};
