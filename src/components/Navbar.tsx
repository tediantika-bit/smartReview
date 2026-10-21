import React from 'react';
import { QrCode, Radio, LayoutDashboard, ShieldCheck, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';

export type NavTab = 'qr' | 'nfc' | 'dashboard' | 'audit' | 'settings';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange }) => {
  const { admin, logout } = useAuth();

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; isPrimary?: boolean }[] = [
    { id: 'qr', label: 'Aktivasi QR', icon: QrCode, isPrimary: true },
    { id: 'nfc', label: 'NFC Writer', icon: Radio, isPrimary: true },
    { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'audit', label: 'Log Audit', icon: ShieldCheck },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <>
      {/* Top Desktop Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">SmartReview</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Portal Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">Aktivasi QR Code & NFC Writer Google Review</p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Desktop Utilities */}
          <div className="flex items-center gap-2">
            <PWAInstallButton variant="nav" />
            {admin && (
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 text-xs">
                <span className="text-slate-600 font-medium truncate max-w-[150px]">{admin.email}</span>
                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Locked Fixed to Bottom Viewport) */}
      <nav
        aria-label="Navigasi Menu Bawah"
        className="fixed-bottom-bar md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 safe-area-pb shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
        }}
      >
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition active:scale-95 ${
                  isActive
                    ? 'text-blue-600 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <div
                  className={`p-1 rounded-xl transition ${
                    isActive ? 'bg-blue-100 text-blue-600' : 'bg-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 truncate max-w-[64px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
