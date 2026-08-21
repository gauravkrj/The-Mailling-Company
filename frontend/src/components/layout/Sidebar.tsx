import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Send, LayoutDashboard, Mail, Settings, Users, LogOut, ChevronLeft, ChevronRight, Menu, X, HelpCircle } from 'lucide-react';
import { User } from '@mailpersonalize/shared';

import { getUserAvatar } from '../../utils/avatar';

interface SidebarProps {
  user: User;
  onLogout: () => void;
  collapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

export default function Sidebar({ user, onLogout, collapsed: externalCollapsed, onToggleCollapse }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const collapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;

  const toggleCollapsed = () => {
    const next = !collapsed;
    if (onToggleCollapse) {
      onToggleCollapse(next);
    } else {
      setInternalCollapsed(next);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'campaigns', label: 'Campaigns', icon: Send, path: '/campaigns' },
    { id: 'contacts', label: 'Contacts', icon: Users, path: '/contacts' },
    { id: 'accounts', label: 'Sending Accounts', icon: Mail, path: '/accounts' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
    { id: 'help', label: 'SES Setup Guide', icon: HelpCircle, path: '/help/ses-setup' },
  ];

  return (
    <>
      {/* Mobile Header Trigger */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#000000] border-b border-white/20 z-40 px-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#054048] text-white flex items-center justify-center font-bold text-xs border border-white/20">
            <Send className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-extrabold text-sm text-white tracking-tight">The Mailling Company</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-white/70 hover:text-white rounded-lg cursor-pointer"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Backdrop Drawer */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        />
      )}

      {/* Persistent Left Navigation Sidebar (Genuinely True Black #000000) */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 bg-[#000000] text-white flex flex-col justify-between transition-all duration-200 ease-in-out border-r border-white/10 ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        } ${
          mobileOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top App Logo Header - Clean, Un-squished Layout for Both Expanded & Collapsed States */}
        <div className={`h-16 border-b border-white/15 flex items-center shrink-0 ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          {collapsed ? (
            <button
              onClick={toggleCollapsed}
              className="w-10 h-10 rounded-xl bg-[#054048] hover:bg-[#0A5D66] text-white flex items-center justify-center border border-white/20 shadow-sm transition-all cursor-pointer relative group"
              title="Expand sidebar"
            >
              <Send className="w-5 h-5 text-white transition-transform group-hover:scale-110" />
              <div className="absolute -bottom-1 -right-1 bg-black border border-white/30 rounded-full p-0.5 text-white">
                <ChevronRight className="w-3 h-3" />
              </div>
            </button>
          ) : (
            <>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-[#054048] text-white flex items-center justify-center shrink-0 border border-white/20 shadow-sm">
                  <Send className="w-4 h-4 text-white" />
                </div>
                <span className="font-extrabold text-white text-base tracking-tight whitespace-nowrap">
                  The Mailling Company
                </span>
              </div>

              {/* Desktop Collapse Toggle Button */}
              <button
                onClick={toggleCollapsed}
                className="hidden md:flex p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Middle Navigation Section */}
        <div className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {!collapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold text-white/50 uppercase tracking-widest">
              Navigation
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.id}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#054048] text-white shadow-sm border border-white/20'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                } ${collapsed ? 'justify-center px-0' : ''}`}
                title={item.label}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-white/70'}`} />
                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Bottom User Profile & Logout Section */}
        <div className="border-t border-white/15 p-3.5 shrink-0 bg-[#050505]">
          <div className={`flex items-center justify-between gap-2 ${collapsed ? 'flex-col items-center gap-3' : ''}`}>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <img
                src={getUserAvatar(user)}
                alt={user.name || user.email || 'User Avatar'}
                className="w-8 h-8 rounded-full border border-white/30 object-cover shrink-0 bg-[#054048]"
              />
              {!collapsed && (
                <div className="overflow-hidden text-left">
                  <div className="text-xs font-bold text-white truncate">
                    {user.name || user.email.split('@')[0]}
                  </div>
                  <div className="text-[11px] text-white/60 truncate max-w-[130px]">
                    {user.email}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onLogout}
              className="p-2 text-white/70 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {!collapsed && (
            <div className="pt-2 flex items-center justify-between text-[10px] text-white/50 border-t border-white/10 mt-2 font-medium">
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Privacy</a>
              <span>•</span>
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Terms</a>
              <span>•</span>
              <span>v1.0.0</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
