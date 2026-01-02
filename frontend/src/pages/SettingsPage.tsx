import { useState, useEffect, useRef } from 'react';
import { Header } from '../components/organisms/Header';
import { Navigation } from '../components/organisms/Navigation';
import { ExternalLink, Upload, Trash2, Check, Save, Palette } from 'lucide-react';
import { Spinner } from '../components/atoms/Spinner';
import { useToastStore } from '../stores/toastStore';

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// App version - update this when releasing
const APP_VERSION = '1.0.0';
const BUILD_DATE = '2024-12';

interface BrandingSettings {
  companyName: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  darkMode: boolean;
}

interface ExportSettings {
  defaultFormat: 'csv' | 'json' | 'markdown';
  includeMetadata: boolean;
  flattenHierarchy: boolean;
}

const COLOR_PRESETS = [
  { name: 'Toucan Orange', primary: '#FF6B35', accent: '#1A1A2E' },
  { name: 'Ocean Blue', primary: '#3B82F6', accent: '#1E293B' },
  { name: 'Emerald', primary: '#10B981', accent: '#1A1A2E' },
  { name: 'Purple', primary: '#8B5CF6', accent: '#1E1B2E' },
  { name: 'Rose', primary: '#F43F5E', accent: '#1A1A2E' },
];

export function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branding, setBranding] = useState<BrandingSettings>({
    companyName: 'Handoff AI',
    logoUrl: null,
    primaryColor: '#FF6B35',
    accentColor: '#1A1A2E',
    darkMode: true,
  });
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    defaultFormat: 'json',
    includeMetadata: true,
    flattenHierarchy: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`${API_BASE}/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.data.branding) {
            setBranding(data.data.branding);
          }
          if (data.data.export) {
            setExportSettings(data.data.export);
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');

      // Save branding
      await fetch(`${API_BASE}/settings/branding`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(branding),
      });

      // Save export settings
      await fetch(`${API_BASE}/settings/export`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(exportSettings),
      });

      addToast({ title: 'Settings saved successfully', type: 'success' });
    } catch (error) {
      addToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/settings/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setBranding((prev) => ({ ...prev, logoUrl: data.data.logoUrl }));
        addToast('Logo uploaded successfully', 'success');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      addToast('Failed to upload logo', 'error');
    }
  };

  const handleDeleteLogo = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_BASE}/settings/logo`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      setBranding((prev) => ({ ...prev, logoUrl: null }));
      addToast('Logo removed', 'success');
    } catch (error) {
      addToast('Failed to remove logo', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-toucan-dark flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-toucan-dark">
      <Header />
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-toucan-grey-100">Settings</h1>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-toucan-orange text-white rounded-md hover:bg-toucan-orange-light disabled:opacity-50"
          >
            {saving ? <Spinner size="sm" /> : <Save size={16} />}
            Save Changes
          </button>
        </div>

        {/* Branding Section */}
        <section className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-toucan-grey-100 mb-4 flex items-center gap-2">
            <Palette size={20} />
            Branding
          </h2>

          <div className="space-y-6">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-toucan-grey-300 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={branding.companyName}
                onChange={(e) => setBranding((prev) => ({ ...prev, companyName: e.target.value }))}
                className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-toucan-grey-100 focus:outline-none focus:ring-2 focus:ring-toucan-orange"
              />
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-toucan-grey-300 mb-2">
                Company Logo
              </label>
              <div className="flex items-center gap-4">
                {branding.logoUrl ? (
                  <div className="relative">
                    <img
                      src={branding.logoUrl}
                      alt="Company logo"
                      className="w-16 h-16 object-contain bg-toucan-dark rounded-lg border border-toucan-dark-border"
                    />
                    <button
                      onClick={handleDeleteLogo}
                      className="absolute -top-2 -right-2 p-1 bg-toucan-error rounded-full text-white hover:bg-red-600"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-toucan-dark rounded-lg border border-dashed border-toucan-dark-border flex items-center justify-center">
                    <Upload size={20} className="text-toucan-grey-500" />
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-sm bg-toucan-dark border border-toucan-dark-border rounded-md text-toucan-grey-200 hover:bg-toucan-dark-border"
                  >
                    {branding.logoUrl ? 'Change Logo' : 'Upload Logo'}
                  </button>
                  <p className="text-xs text-toucan-grey-500 mt-1">PNG, JPEG, SVG, or WebP. Max 2MB.</p>
                </div>
              </div>
            </div>

            {/* Color Presets */}
            <div>
              <label className="block text-sm font-medium text-toucan-grey-300 mb-2">
                Color Theme
              </label>
              <div className="flex flex-wrap gap-3">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() =>
                      setBranding((prev) => ({
                        ...prev,
                        primaryColor: preset.primary,
                        accentColor: preset.accent,
                      }))
                    }
                    className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-all ${
                      branding.primaryColor === preset.primary
                        ? 'border-toucan-orange bg-toucan-orange/20'
                        : 'border-toucan-dark-border hover:border-toucan-grey-600'
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <span className="text-sm text-toucan-grey-200">{preset.name}</span>
                    {branding.primaryColor === preset.primary && (
                      <Check size={14} className="text-toucan-orange" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-toucan-grey-300 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={branding.primaryColor}
                    onChange={(e) =>
                      setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))
                    }
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={branding.primaryColor}
                    onChange={(e) =>
                      setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))
                    }
                    className="flex-1 bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-toucan-grey-100 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-toucan-grey-300 mb-2">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={branding.accentColor}
                    onChange={(e) =>
                      setBranding((prev) => ({ ...prev, accentColor: e.target.value }))
                    }
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={branding.accentColor}
                    onChange={(e) =>
                      setBranding((prev) => ({ ...prev, accentColor: e.target.value }))
                    }
                    className="flex-1 bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-toucan-grey-100 text-sm font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Export Settings */}
        <section className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-toucan-grey-100 mb-4">Export Defaults</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-toucan-grey-300 mb-2">
                Default Format
              </label>
              <div className="flex gap-3">
                {(['json', 'csv', 'markdown'] as const).map((format) => (
                  <button
                    key={format}
                    onClick={() => setExportSettings((prev) => ({ ...prev, defaultFormat: format }))}
                    className={`px-4 py-2 rounded-md border text-sm uppercase ${
                      exportSettings.defaultFormat === format
                        ? 'border-toucan-orange bg-toucan-orange/20 text-toucan-orange'
                        : 'border-toucan-dark-border text-toucan-grey-400 hover:border-toucan-grey-600'
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="includeMetadata"
                checked={exportSettings.includeMetadata}
                onChange={(e) =>
                  setExportSettings((prev) => ({ ...prev, includeMetadata: e.target.checked }))
                }
                className="w-4 h-4 rounded border-toucan-dark-border bg-toucan-dark focus:ring-toucan-orange"
              />
              <label htmlFor="includeMetadata" className="text-sm text-toucan-grey-200">
                Include metadata (timestamps, IDs, etc.)
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="flattenHierarchy"
                checked={exportSettings.flattenHierarchy}
                onChange={(e) =>
                  setExportSettings((prev) => ({ ...prev, flattenHierarchy: e.target.checked }))
                }
                className="w-4 h-4 rounded border-toucan-dark-border bg-toucan-dark focus:ring-toucan-orange"
              />
              <label htmlFor="flattenHierarchy" className="text-sm text-toucan-grey-200">
                Flatten hierarchy (export all items at same level)
              </label>
            </div>
          </div>
        </section>

        {/* App Info Section */}
        <section className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-toucan-grey-100 mb-4">About Handoff AI</h2>

          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-toucan-orange rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">H</span>
              </div>
              <div>
                <p className="text-toucan-grey-100 font-medium">Handoff AI</p>
                <p className="text-sm text-toucan-grey-400">by Gary Neville</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-toucan-grey-400">Version:</span>
              <span className="ml-2 text-toucan-grey-100">{APP_VERSION}</span>
            </div>
            <div>
              <span className="text-toucan-grey-400">Build:</span>
              <span className="ml-2 text-toucan-grey-100">{BUILD_DATE}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-toucan-dark-border">
            <a
              href="https://toucanlabs.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-toucan-orange hover:text-toucan-orange-light"
            >
              Visit Toucan Labs
              <ExternalLink size={14} />
            </a>
          </div>
        </section>

        {/* Keyboard Shortcuts */}
        <section className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-toucan-grey-100 mb-4">Keyboard Shortcuts</h2>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-toucan-grey-400">Upload spec</span>
              <kbd className="px-2 py-1 bg-toucan-dark rounded text-toucan-grey-200">Ctrl+U</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-toucan-grey-400">Save changes</span>
              <kbd className="px-2 py-1 bg-toucan-dark rounded text-toucan-grey-200">Ctrl+S</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-toucan-grey-400">Search</span>
              <kbd className="px-2 py-1 bg-toucan-dark rounded text-toucan-grey-200">Ctrl+K</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-toucan-grey-400">Toggle navigation</span>
              <kbd className="px-2 py-1 bg-toucan-dark rounded text-toucan-grey-200">Ctrl+B</kbd>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
