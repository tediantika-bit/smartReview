import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, NavTab } from './components/Navbar';
import { LoginView } from './views/LoginView';
import { QRActivationView } from './views/QRActivationView';
import { NFCWriterView } from './views/NFCWriterView';
import { DashboardView } from './views/DashboardView';
import { AuditLogView } from './views/AuditLogView';
import { SettingsView } from './views/SettingsView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { QrCode } from 'lucide-react';

const MainApp: React.FC = () => {
  const { admin, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('qr');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg animate-pulse mb-3">
          <QrCode className="w-6 h-6" />
        </div>
        <p className="text-xs font-semibold text-slate-500">Memuat SmartReview...</p>
      </div>
    );
  }

  if (!admin) {
    return (
      <>
        <LoginView />
        <OfflineIndicator />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 font-sans flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top and Bottom Navigation */}
      <Navbar currentTab={currentTab} onTabChange={setCurrentTab} />

      {/* Main View Area with Bottom Navigation Clearance */}
      <main className="flex-1 pb-20 md:pb-6">
        {currentTab === 'qr' && <QRActivationView />}
        {currentTab === 'nfc' && <NFCWriterView />}
        {currentTab === 'dashboard' && <DashboardView onNavigate={setCurrentTab} />}
        {currentTab === 'audit' && <AuditLogView />}
        {currentTab === 'settings' && <SettingsView />}
      </main>

      {/* Global Offline Network Status Indicator */}
      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
