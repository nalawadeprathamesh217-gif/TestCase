import React, { useEffect, useState } from 'react';
import AppLayout from '../layouts/AppLayout';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Shield, Calendar, Bot, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';

export default function Settings() {
  const { user, profile } = useAuth();
  const [aiConfig, setAiConfig] = useState(null);

  useEffect(() => {
    // profile.role might not be available immediately, but assuming 'admin' can access
    const fetchAiConfig = async () => {
      try {
        const res = await api.get('/admin/ai-config');
        setAiConfig(res.data.data);
      } catch (err) {
        console.error('Failed to load AI config', err);
      }
    };
    
    // Only fetch if admin
    fetchAiConfig();
  }, []);

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
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{profile?.role || 'Tester'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500 w-24">Joined</span>
              <span className="text-slate-800">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</span>
            </div>
          </div>
        </div>

        {aiConfig && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mt-4">
            <div className="flex items-center gap-2 mb-4">
              <Bot className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-semibold text-slate-700">AI Configuration</h2>
            </div>
            <div className="space-y-4 border-t border-slate-100 pt-4 text-sm">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium uppercase mb-2">Primary Provider</p>
                  <p className="font-semibold text-slate-800">{aiConfig.primaryProvider === 'gemini' ? 'Gemini' : aiConfig.primaryProvider}</p>
                  <p className="text-xs text-slate-500 mt-1">Model: {aiConfig.primaryModel}</p>
                  <div className="mt-2 flex items-center gap-1">
                    {aiConfig.primaryConfigured ? (
                      <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle className="w-3 h-3" /> Configured</span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500 text-xs font-medium"><XCircle className="w-3 h-3" /> Not Configured</span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium uppercase mb-2">Fallback AI</p>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-slate-800 font-medium">Enabled:</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${aiConfig.fallbackEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                      {aiConfig.fallbackEnabled ? 'On' : 'Off'}
                    </span>
                  </div>
                  {aiConfig.fallbackEnabled && (
                    <>
                      <p className="font-semibold text-slate-800 mt-2">{aiConfig.fallbackProvider}</p>
                      <p className="text-xs text-slate-500 mt-1">Model: {aiConfig.fallbackModel}</p>
                      <div className="mt-2 flex items-center gap-1">
                        {aiConfig.fallbackConfigured ? (
                          <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle className="w-3 h-3" /> Configured</span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-500 text-xs font-medium"><XCircle className="w-3 h-3" /> Not Configured</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mt-4">
          <h2 className="text-base font-semibold text-slate-700 mb-2">Application Info</h2>
          <p className="text-sm text-slate-800 font-medium">AI Test Manager</p>
          <p className="text-sm text-slate-500 mt-1">AI-powered Requirement &amp; Test Case Management</p>
          <p className="text-xs text-slate-400 mt-2">Built with React + Vite + Tailwind CSS + Supabase + Express.js</p>
        </div>
      </div>
    </AppLayout>
  );
}
