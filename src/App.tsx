import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { MainAppLayout } from './layouts/MainAppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { HeatRiskPage } from './pages/HeatRiskPage';
import { CoolSpotsPage } from './pages/CoolSpotsPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page Route */}
        <Route path="/" element={<LandingPage />} />

        {/* Application Shell Routes */}
        <Route path="/app" element={<MainAppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="heat-risk" element={<HeatRiskPage />} />
          <Route path="recommendations" element={<RecommendationsPage />} />
          <Route path="coolspots" element={<CoolSpotsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
