import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Bot, LayoutDashboard, FileText, FlaskConical, TestTube, Upload,
  BarChart3, Settings, LogOut, ChevronLeft, ChevronRight, Menu, X,
  ClipboardList, Copy, Users, Activity, Bell, Bug
} from 'lucide-react';
import api from '../services/api';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/requirements', icon: FileText, label: 'Requirements' },
  { path: '/requirement-documents', icon: ClipboardList, label: 'Req Documents' },
  { path: '/test-cases', icon: FlaskConical, label: 'Test Cases' },
  { path: '/execution', icon: TestTube, label: 'Test Execution' },
  { path: '/defects', icon: Bug, label: 'Defects' },
  { path: '/duplicates', icon: Copy, label: 'Duplicates' },
  { path: '/imports', icon: Upload, label: 'Imports' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/reports', icon: FileText, label: 'Reports' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

const adminNavItems = [
  { path: '/admin/users', icon: Users, label: 'Users' },
  { path: '/admin/audit-logs', icon: ClipboardList, label: 'Audit Logs' },
  { path: '/admin/system-health', icon: Activity, label: 'System Health' },
];

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [role, setRole] = useState('tester');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      api.get('/profiles/me').then(res => setRole(res.data.data.role)).catch(() => {});
      api.get('/notifications').then(res => setNotifications(res.data.data || [])).catch(() => {});
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {}
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-200 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-sm font-bold text-slate-800 leading-tight">AI Test Manager</h1>
            <p className="text-xs text-slate-500">QA Management</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}

        {role === 'admin' && (
          <>
            {!collapsed && <div className="px-3 pt-4 pb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Admin</div>}
            {collapsed && <div className="w-full border-t border-slate-200 my-2"></div>}
            {adminNavItems.map(({ path, icon: Icon, label }) => (
              <NavLink
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  } ${collapsed ? 'justify-center' : ''}`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-slate-200 p-3">
        {!collapsed && (
          <div className="px-2 py-2 mb-2">
            <p className="text-xs font-medium text-slate-800 truncate">{user?.user_metadata?.full_name || user?.email}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && 'Logout'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'} flex-shrink-0 relative`}>
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 z-10"
        >
          {collapsed ? <ChevronRight className="w-3 h-3 text-slate-500" /> : <ChevronLeft className="w-3 h-3 text-slate-500" />}
        </button>
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full bg-white">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Nav */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1 rounded-md hover:bg-slate-100">
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1 lg:flex-none" />
          <div className="flex items-center gap-4 relative">
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-1.5 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute top-full right-10 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <h3 className="font-semibold text-slate-800 text-sm">Notifications</h3>
                  {unreadCount > 0 && <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:underline">Mark all read</button>}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">No notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`p-3 border-b border-slate-100 last:border-0 ${!n.is_read ? 'bg-blue-50/50' : ''}`}>
                        <p className={`text-sm ${!n.is_read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-700 text-xs font-bold">
                {(user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
