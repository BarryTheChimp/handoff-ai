import { Header } from '../components/organisms/Header';
import { Navigation } from '../components/organisms/Navigation';
import { ExternalLink } from 'lucide-react';

// App version - update this when releasing
const APP_VERSION = '1.0.0';
const BUILD_DATE = '2024-12';

export function SettingsPage() {
  return (
    <div className="min-h-screen bg-toucan-dark">
      <Header />
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-toucan-grey-100 mb-8">Settings</h1>

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
                <p className="text-sm text-toucan-grey-400">by Toucan Labs</p>
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

        {/* Project Settings Notice */}
        <section className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-toucan-grey-100 mb-2">Project Settings</h2>
          <p className="text-sm text-toucan-grey-400 mb-4">
            Configure project-specific settings like acceptance criteria format, glossary terms, and team preferences.
          </p>
          <a
            href="/knowledge"
            className="text-sm text-toucan-orange hover:text-toucan-orange-light"
          >
            Go to Knowledge Base →
          </a>
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
