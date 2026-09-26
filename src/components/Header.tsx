import React from 'react';
import { Globe, Lock, LogOut, ArrowLeft, Bookmark } from 'lucide-react';

interface HeaderProps {
  currentView: 'feed' | 'bookmarks' | 'archive' | 'admin' | 'admin-login';
  onViewChange: (view: 'feed' | 'bookmarks' | 'archive' | 'admin' | 'admin-login') => void;
  bookmarksCount: number;
  isAuthenticatedAdmin: boolean;
  adminEmail?: string;
  onLogoutAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  bookmarksCount,
  isAuthenticatedAdmin,
  adminEmail,
  onLogoutAdmin,
}) => {
  const isAdminView = currentView === 'admin';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onViewChange('feed')}
            className="flex items-center gap-2.5 text-left text-white focus:outline-none"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-semibold tracking-tight text-slate-100 flex items-center gap-1.5">
                Vanguard
                <span className="text-xs font-normal text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/50">
                  {isAdminView ? 'Admin Console' : 'Intel'}
                </span>
              </span>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                {isAdminView
                  ? 'Continuous Discovery & Publishing Architecture'
                  : 'Verified Opportunity Intelligence · Nigeria & Global'}
              </p>
            </div>
          </button>
        </div>

        {/* Public Client Navigation (Hidden when in Admin Console) */}
        {!isAdminView && currentView !== 'admin-login' && (
          <div className="flex items-center gap-2 sm:gap-4">
            <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => onViewChange('feed')}
                className={`px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  currentView === 'feed'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="hidden sm:inline">Opportunities </span>Feed
              </button>
              <button
                onClick={() => onViewChange('bookmarks')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  currentView === 'bookmarks'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bookmark className="h-3.5 w-3.5" />
                <span>Saved</span>
                {bookmarksCount > 0 && (
                  <span className="text-[10px] text-emerald-400 font-semibold">({bookmarksCount})</span>
                )}
              </button>
              <button
                onClick={() => onViewChange('archive')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  currentView === 'archive'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Archive
              </button>
            </nav>

            {/* Subtle Admin Entrance */}
            <button
              onClick={() => onViewChange(isAuthenticatedAdmin ? 'admin' : 'admin-login')}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 px-2 py-1 rounded transition-colors"
              title="Administrator Sign In"
            >
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          </div>
        )}

        {/* Admin Navigation (Only visible when in Admin Console) */}
        {(isAdminView || currentView === 'admin-login') && (
          <div className="flex items-center gap-3">
            {isAuthenticatedAdmin && adminEmail && (
              <span className="hidden md:inline text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                {adminEmail}
              </span>
            )}

            <button
              onClick={() => onViewChange('feed')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Public Feed</span>
            </button>

            {isAuthenticatedAdmin && onLogoutAdmin && (
              <button
                onClick={onLogoutAdmin}
                className="flex items-center gap-1.5 rounded-lg border border-rose-900/40 bg-rose-950/20 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-950/40 transition-colors"
                title="Log out of admin session"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log Out</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
