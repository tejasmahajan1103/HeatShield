import React from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  ShieldAlert,
  MapPin,
  ThermometerSun,
  ArrowRight,
  Trees,
  Droplets,
  HeartPulse,
  Info,
  Clock,
  Sun,
  Activity
} from 'lucide-react';
import { SAMPLE_COOLSPOTS } from '../data/sampleCoolSpots';

export const LandingPage: React.FC = () => {
  const previewSpots = SAMPLE_COOLSPOTS.slice(0, 3);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-slate-800 flex flex-col font-sans selection:bg-orange-100 selection:text-orange-900">
      {/* 1. Header & Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 p-0.5 flex items-center justify-center shadow-md shadow-orange-500/15 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold text-slate-900 tracking-tight font-mono">HeatShield</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  CoolSpot AI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">Know the heat. Find the cool. Stay safer.</p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <button
              onClick={() => scrollToSection('overview')}
              className="hover:text-orange-600 transition cursor-pointer"
            >
              Overview
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-orange-600 transition cursor-pointer"
            >
              How it works
            </button>
            <Link to="/app/coolspots" className="hover:text-teal-600 transition">
              CoolSpots
            </Link>
            <button
              onClick={() => scrollToSection('about')}
              className="hover:text-orange-600 transition cursor-pointer"
            >
              About
            </button>
          </nav>

          {/* Header Action Button */}
          <div className="flex items-center gap-3">
            <Link
              to="/app/heat-risk"
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition shadow-md shadow-orange-500/20 flex items-center gap-2"
            >
              <ThermometerSun className="w-4 h-4" />
              <span>Check heat risk</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section id="overview" className="relative pt-12 pb-20 overflow-hidden bg-gradient-to-b from-stone-50 via-amber-50/30 to-stone-50 border-b border-stone-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/80 border border-orange-200 text-orange-800 text-xs font-bold shadow-xs">
                <Flame className="w-4 h-4 text-orange-600" />
                <span>Bharat Builds Tour — Environmental Safety Hacks</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
                Know the heat. <br />
                <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-teal-600 bg-clip-text text-transparent">
                  Find the cool.
                </span>{' '}
                Stay safer.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                Assess personal heat-exposure risks for planned outdoor activities and locate nearby verified cooling sanctuaries (CoolSpot) before thermal stress causes illness.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Link
                  to="/app/heat-risk"
                  className="px-7 py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-base transition shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2.5 group"
                >
                  <ThermometerSun className="w-5 h-5" />
                  <span>Check my heat risk</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  to="/app/coolspots"
                  className="px-7 py-4 rounded-2xl bg-white hover:bg-stone-100 border border-stone-300 text-slate-800 font-bold text-base transition shadow-sm flex items-center justify-center gap-2.5"
                >
                  <MapPin className="w-5 h-5 text-teal-600" />
                  <span>Explore CoolSpots</span>
                </Link>
              </div>
            </div>

            {/* Right Hero Visual Preview Card */}
            <div className="lg:col-span-5">
              <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xl space-y-5 relative">
                {/* Header Badge */}
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Environmental Telemetry</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                    Illustrative Demo Data
                  </span>
                </div>

                {/* Simulated Weather Overview */}
                <div className="flex items-center justify-between bg-stone-50 p-4 rounded-2xl border border-stone-200/70">
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">Bengaluru Metro Zone</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Apparent Temp ~41.2°C</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-orange-600 font-mono">37.8°C</span>
                    <p className="text-[11px] font-medium text-amber-700">High Solar Stress</p>
                  </div>
                </div>

                {/* Simulated Risk Assessment Badge */}
                <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-orange-700">
                      <ShieldAlert className="w-4 h-4" />
                      Preliminary Risk Score
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-500 text-white font-mono">
                      76 / 100 (High Risk)
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-snug">
                    High metabolic effort during direct solar exposure. Take shaded rest pauses every 20 minutes.
                  </p>
                </div>

                {/* Small unobtrusive note */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Illustrative sample telemetry for preview purposes.</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. Feature Cards Section ("About" / "Understand your risk") */}
      <section id="about" className="py-20 bg-white border-b border-stone-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full">
              Core Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-3">
              Comprehensive Heat Safety Intelligence
            </h2>
            <p className="text-slate-600 text-base mt-2">
              Designed to protect outdoor workers, athletes, commuters, and vulnerable citizens during extreme heat waves.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: Understand your risk */}
            <div className="bg-stone-50/80 border border-stone-200 rounded-3xl p-7 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-600 flex items-center justify-center">
                  <ThermometerSun className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Understand your risk</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Calculate a transparent preliminary heat-exposure risk score combining ambient temperature, relative humidity, UV radiation, activity load, duration, and shade.
                </p>
              </div>

              <div className="pt-6">
                <Link
                  to="/app/heat-risk"
                  className="text-sm font-bold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1.5 transition"
                >
                  <span>Calculate Heat Risk</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Card 2: Find nearby cooling */}
            <div className="bg-stone-50/80 border border-stone-200 rounded-3xl p-7 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-600 flex items-center justify-center">
                  <Trees className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Find nearby cooling</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Locate shaded park canopies, air-conditioned public halls, chilled water refill points, and official municipal cooling havens with distance routing.
                </p>
              </div>

              <div className="pt-6">
                <Link
                  to="/app/coolspots"
                  className="text-sm font-bold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1.5 transition"
                >
                  <span>Explore CoolSpots</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Card 3: Choose a safer plan */}
            <div className="bg-stone-50/80 border border-stone-200 rounded-3xl p-7 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Choose a safer plan</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Receive personalized hydration protocols, mandatory rest interval guidance, heat exhaustion warning sign matrix, and suggested lower-risk alternative time windows.
                </p>
              </div>

              <div className="pt-6">
                <Link
                  to="/app/recommendations"
                  className="text-sm font-bold text-amber-600 hover:text-amber-700 inline-flex items-center gap-1.5 transition"
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
      <section id="how-it-works" className="py-20 bg-sky-50/80 border-b border-sky-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-800 bg-sky-100 border border-sky-200 px-3 py-1 rounded-full">
              Simple 4-Step Process
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-3">
              How HeatShield Works
            </h2>
            <p className="text-slate-600 text-base mt-2">
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
                color: 'text-amber-600 bg-amber-100'
              },
              {
                step: '02',
                title: 'Enter your activity',
                desc: 'Specify your planned outdoor activity (walking, cycling, running, work), duration, start time, and shade coverage.',
                icon: Activity,
                color: 'text-orange-600 bg-orange-100'
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
                color: 'text-teal-600 bg-teal-100'
              }
            ].map((st, idx) => {
              const Icon = st.icon;
              return (
                <div key={idx} className="bg-white border border-sky-100 rounded-3xl p-6 shadow-xs relative flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-black font-mono text-sky-900">{st.step}</span>
                      <div className={`p-2.5 rounded-xl ${st.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                    <h4 className="font-bold text-slate-900 text-lg">{st.title}</h4>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">{st.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. CoolSpot Preview Section */}
      <section className="py-20 bg-white border-b border-stone-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
                CoolSpot Sanctuaries
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-3">
                Nearby Cooling Locations
              </h2>
              <p className="text-slate-600 text-base mt-2">
                Sample verified shaded parks, air-conditioned public spaces, and water points.
              </p>
            </div>

            <Link
              to="/app/coolspots"
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition shadow-md shadow-teal-600/15 flex items-center gap-2 shrink-0 self-start md:self-auto"
            >
              <span>Explore All CoolSpots</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {previewSpots.map((spot) => (
              <div key={spot.id} className="bg-stone-50 border border-stone-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100 text-teal-800 border border-teal-200">
                      {spot.categoryLabel}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                      Sample Location
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-lg">{spot.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{spot.address} ({spot.distanceKm} km away)</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">{spot.description}</p>

                  <div className="mt-4 pt-3 border-t border-stone-200 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-white border border-stone-200 text-slate-700 flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">{spot.shadeVerified ? 'Shade Verified' : 'Shade Unverified'}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-stone-200 text-slate-700 flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{spot.waterVerified ? 'Water Verified' : 'Water Unverified'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-stone-200">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {spot.operatingHours}
                  </span>
                  <Link
                    to="/app/coolspots"
                    className="text-teal-700 hover:text-teal-800 font-bold flex items-center gap-1"
                  >
                    <span>Details</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="bg-slate-900 text-slate-300 py-14 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-slate-800">
            {/* Column 1: Brand */}
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500 p-0.5 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-extrabold text-white font-mono tracking-tight">HeatShield</span>
              </div>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Know the heat. Find the cool. Stay safer. Environmental heat-exposure risk assessment and cooling sanctuary discovery.
              </p>
            </div>

            {/* Column 2: Quick Links */}
            <div className="md:col-span-3 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Navigation</h4>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li>
                  <button onClick={() => scrollToSection('overview')} className="hover:text-white transition cursor-pointer">
                    Overview
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition cursor-pointer">
                    How it works
                  </button>
                </li>
                <li>
                  <Link to="/app/coolspots" className="hover:text-white transition">
                    CoolSpots
                  </Link>
                </li>
                <li>
                  <button onClick={() => scrollToSection('about')} className="hover:text-white transition cursor-pointer">
                    About
                  </button>
                </li>
                <li>
                  <Link to="/app/settings" className="hover:text-white transition">
                    Settings & Privacy
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Safety Actions */}
            <div className="md:col-span-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Safety Features</h4>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li>
                  <Link to="/app/heat-risk" className="hover:text-orange-400 transition flex items-center gap-1.5">
                    <ThermometerSun className="w-3.5 h-3.5 text-orange-500" />
                    <span>Check heat risk</span>
                  </Link>
                </li>
                <li>
                  <Link to="/app/coolspots" className="hover:text-teal-400 transition flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-500" />
                    <span>Explore CoolSpots</span>
                  </Link>
                </li>
                <li>
                  <Link to="/app/recommendations" className="hover:text-amber-400 transition flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-amber-500" />
                    <span>Personalized recommendations</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Disclaimer & Copyright */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] leading-relaxed max-w-3xl">
              <strong className="text-slate-300">Disclaimer: </strong>
              HeatShield provides preliminary environmental guidance, not medical advice. Sample locations and conditions are illustrative unless verified.
            </div>

            <div className="text-slate-500 text-[11px] whitespace-nowrap">
              © 2026 HeatShield. All rights reserved.
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
};
