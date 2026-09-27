import React from 'react';
import AppLayout from '../layouts/AppLayout';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Shield, Calendar } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Your account and application settings</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-700 mb-5">Profile</h2>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-700 text-2xl font-bold">
                {(user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-slate-800">{user?.user_metadata?.full_name || 'User'}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-3 text-sm">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500 w-24">Full Name</span>
              <span className="text-slate-800">{user?.user_metadata?.full_name || '—'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500 w-24">Email</span>
              <span className="text-slate-800">{user?.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500 w-24">Role</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Tester</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500 w-24">Joined</span>
              <span className="text-slate-800">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mt-4">
          <h2 className="text-base font-semibold text-slate-700 mb-2">Application Info</h2>
          <p className="text-sm text-slate-500">AI Test Manager — Phase 1-5 Implementation</p>
          <p className="text-xs text-slate-400 mt-1">Built with React + Vite + Tailwind CSS + Supabase + Express.js</p>
        </div>
      </div>
    </AppLayout>
  );
}
