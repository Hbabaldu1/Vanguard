import React, { useState, useEffect, useCallback } from 'react';
import { Opportunity, ReviewQueueItem, Source, SchedulerHealth, SystemQualitySettings, AuditEvent } from './types/opportunity';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { OpportunityCard } from './components/OpportunityCard';
import { OpportunityDetailModal } from './components/OpportunityDetailModal';
import { AdminLogin } from './components/AdminLogin';
import { AdminMetrics } from './components/AdminMetrics';
import { AdminReviewQueue } from './components/AdminReviewQueue';
import { AdminSources } from './components/AdminSources';
import { AdminSettings } from './components/AdminSettings';
import { AdminDestinations } from './components/AdminDestinations';
import { AdminAuditLogs } from './components/AdminAuditLogs';
import { AdminTestRunner } from './components/AdminTestRunner';
import {
  Globe,
  Radio,
  Bookmark,
  ShieldCheck,
  Sparkles,
  Lock,
  Search,
  CheckCircle2,
} from 'lucide-react';

export default function App() {
  // Navigation & View States with URL hash synchronization
  const [currentView, setCurrentView] = useState<'feed' | 'bookmarks' | 'archive' | 'admin' | 'admin-login'>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      const token = localStorage.getItem('vanguard_admin_token');
      if (hash === '#admin' || path === '/admin') {
        return token ? 'admin' : 'admin-login';
      }
      if (hash === '#admin-login' || path === '/admin-login') {
        return 'admin-login';
      }
      if (hash === '#bookmarks' || path === '/bookmarks') {
        return 'bookmarks';
      }
      if (hash === '#archive' || path === '/archive') {
        return 'archive';
      }
    }
    return 'feed';
  });
  const [adminTab, setAdminTab] = useState<'metrics' | 'review' | 'sources' | 'settings' | 'destinations' | 'audit' | 'tests'>('metrics');

  // Authentication State
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem('vanguard_admin_token');
  });
  const [adminUser, setAdminUser] = useState<{ email: string; role: string; name: string } | null>(null);

  // Opportunities & Filters
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [sortBy, setSortBy] = useState('score');

  // Loading States
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Admin Data States
  const [adminMetrics, setAdminMetrics] = useState<any | null>(null);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [qualitySettings, setQualitySettings] = useState<SystemQualitySettings | null>(null);
  const [schedulerHealth, setSchedulerHealth] = useState<SchedulerHealth | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper for authenticated admin fetch
  const adminFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (adminToken) {
      headers.set('Authorization', `Bearer ${adminToken}`);
    }
    return fetch(url, { ...options, headers });
  }, [adminToken]);

  // Check auth session
  useEffect(() => {
    async function verifyAuth() {
      if (!adminToken) return;
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        const data = await res.json();
        if (data.authenticated) {
          setAdminUser(data.user);
        } else {
          // Token expired or invalid
          localStorage.removeItem('vanguard_admin_token');
          setAdminToken(null);
          setAdminUser(null);
          if (currentView === 'admin') {
            setCurrentView('admin-login');
          }
        }
      } catch (err) {
        console.error('Auth verification error:', err);
      }
    }
    verifyAuth();
  }, [adminToken, currentView]);

  // Handle Admin Login Success
  const handleLoginSuccess = (token: string, user: { email: string; role: string; name: string }) => {
    localStorage.setItem('vanguard_admin_token', token);
    setAdminToken(token);
    setAdminUser(user);
    setCurrentView('admin');
    showToast(`Welcome back, ${user.name}`);
  };

  // Handle Admin Logout
  const handleLogout = async () => {
    if (adminToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      } catch {
        // ignore
      }
    }
    localStorage.removeItem('vanguard_admin_token');
    setAdminToken(null);
    setAdminUser(null);
    setCurrentView('feed');
    showToast('Administrator logged out successfully.');
  };

  // View switch interceptor with hash synchronization
  const handleViewChange = (view: 'feed' | 'bookmarks' | 'archive' | 'admin' | 'admin-login') => {
    if (view === 'admin' && !adminToken) {
      setCurrentView('admin-login');
      window.location.hash = 'admin-login';
    } else {
      setCurrentView(view);
      window.location.hash = view === 'feed' ? '' : view;
    }
  };

  // Sync state if user clicks browser back/forward buttons
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (hash === 'admin') {
        setCurrentView(adminToken ? 'admin' : 'admin-login');
      } else if (hash === 'admin-login') {
        setCurrentView('admin-login');
      } else if (hash === 'bookmarks') {
        setCurrentView('bookmarks');
      } else if (hash === 'archive') {
        setCurrentView('archive');
      } else if (hash === 'feed' || !hash) {
        setCurrentView('feed');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [adminToken]);

  // Fetch Opportunities Feed
  const fetchOpportunities = useCallback(async () => {
    setIsLoadingFeed(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (selectedRegion !== 'all') params.set('region', selectedRegion);
      params.set('sort', sortBy);
      params.set('status', currentView === 'archive' ? 'archived' : 'published');

      const res = await fetch(`/api/opportunities?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load opportunities');
      const data = await res.json();
      setOpportunities(data.items || []);
      setTotalCount(data.total || 0);
    } catch (err: any) {
      console.error('Error loading opportunities:', err);
    } finally {
      setIsLoadingFeed(false);
    }
  }, [searchQuery, selectedCategory, selectedRegion, sortBy, currentView]);

  // Fetch Bookmarks
  const fetchBookmarks = useCallback(async () => {
    try {
      const res = await fetch('/api/bookmarks');
      if (res.ok) {
        const data = await res.json();
        const ids = new Set<string>((data.items || []).map((o: Opportunity) => o.id));
        setBookmarkedIds(ids);
        if (currentView === 'bookmarks') {
          setOpportunities(data.items || []);
          setTotalCount((data.items || []).length);
        }
      }
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
    }
  }, [currentView]);

  // Toggle Bookmark
  const handleToggleBookmark = async (id: string) => {
    try {
      const res = await fetch('/api/bookmarks/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId: id }),
      });
      const data = await res.json();
      setBookmarkedIds(prev => {
        const next = new Set(prev);
        if (data.bookmarked) {
          next.add(id);
          showToast('Opportunity saved to your bookmarks.');
        } else {
          next.delete(id);
          showToast('Removed from saved bookmarks.');
        }
        return next;
      });

      if (currentView === 'bookmarks') {
        fetchBookmarks();
      }
    } catch (err) {
      console.error('Bookmark error:', err);
    }
  };

  // Fetch Admin Data (Only called when in admin view & authenticated)
  const fetchAdminData = useCallback(async () => {
    if (!adminToken) return;

    try {
      const results = await Promise.allSettled([
        adminFetch('/api/admin/metrics'),
        adminFetch('/api/admin/review-queue'),
        adminFetch('/api/admin/sources'),
        adminFetch('/api/admin/destinations'),
        adminFetch('/api/admin/audit-logs'),
        adminFetch('/api/admin/settings'),
      ]);

      const [metricsRes, reviewRes, sourcesRes, destRes, auditRes, settingsRes] = results;

      // Check if any returned 401 Unauthorized
      for (const res of results) {
        if (res.status === 'fulfilled' && res.value.status === 401) {
          handleLogout();
          return;
        }
      }

      if (metricsRes.status === 'fulfilled' && metricsRes.value.ok) {
        const mData = await metricsRes.value.json();
        setAdminMetrics(mData);
        if (mData.schedulerState) {
          setSchedulerHealth(mData.schedulerState);
        }
      }

      if (reviewRes.status === 'fulfilled' && reviewRes.value.ok) {
        const rData = await reviewRes.value.json();
        setReviewQueue(rData.items || []);
      }

      if (sourcesRes.status === 'fulfilled' && sourcesRes.value.ok) {
        const sData = await sourcesRes.value.json();
        setSources(sData.sources || []);
      }

      if (destRes.status === 'fulfilled' && destRes.value.ok) {
        const dData = await destRes.value.json();
        setDestinations(dData.destinations || []);
      }

      if (auditRes.status === 'fulfilled' && auditRes.value.ok) {
        const aData = await auditRes.value.json();
        setAuditLogs(aData.logs || []);
      }

      if (settingsRes.status === 'fulfilled' && settingsRes.value.ok) {
        const stData = await settingsRes.value.json();
        setQualitySettings(stData.settings);
        setSchedulerHealth(stData.scheduler);
      }
    } catch (err) {
      console.error('Admin fetch error:', err);
    }
  }, [adminToken, adminFetch, handleLogout]);

  // Manual Discovery Trigger
  const handleTriggerDiscovery = async () => {
    setIsDiscovering(true);
    try {
      const res = await adminFetch('/api/admin/discovery/run', { method: 'POST' });
      const data = await res.json();
      showToast(`Scan complete: ${data.stats?.itemsFound || 0} items checked, ${data.stats?.itemsPublished || 0} published.`);
      await Promise.all([fetchOpportunities(), fetchAdminData()]);
    } catch (err: any) {
      showToast(`Discovery error: ${err.message}`);
    } finally {
      setIsDiscovering(false);
    }
  };

  // Admin Review Approve / Reject
  const handleApproveQueueItem = async (queueId: string) => {
    try {
      const res = await adminFetch(`/api/admin/review-queue/${queueId}/approve`, { method: 'POST' });
      if (res.ok) {
        showToast('Opportunity approved and published immediately.');
        await Promise.all([fetchAdminData(), fetchOpportunities()]);
      }
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleRejectQueueItem = async (queueId: string, reason: string) => {
    try {
      const res = await adminFetch(`/api/admin/review-queue/${queueId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        showToast('Opportunity rejected from publication.');
        await fetchAdminData();
      }
    } catch (err: any) {
      alert(`Rejection error: ${err.message}`);
    }
  };

  // Admin Source Handlers
  const handleToggleSourceEnabled = async (sourceId: string, enabled: boolean) => {
    try {
      await adminFetch(`/api/admin/sources/${sourceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      await fetchAdminData();
      showToast(`Source feed ${enabled ? 'enabled' : 'disabled'}.`);
    } catch (err: any) {
      alert(`Error toggling source: ${err.message}`);
    }
  };

  const handleAddSource = async (sourceData: Partial<Source>) => {
    try {
      const res = await adminFetch('/api/admin/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sourceData),
      });
      if (res.ok) {
        showToast('New opportunity source configured.');
        await fetchAdminData();
      }
    } catch (err: any) {
      alert(`Error adding source: ${err.message}`);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    try {
      await adminFetch(`/api/admin/sources/${sourceId}`, { method: 'DELETE' });
      showToast('Source removed.');
      await fetchAdminData();
    } catch (err: any) {
      alert(`Error deleting source: ${err.message}`);
    }
  };

  const handleTestSource = async (sourceId: string) => {
    const res = await adminFetch(`/api/admin/sources/${sourceId}/test`, { method: 'POST' });
    return await res.json();
  };

  // Admin Settings Handler
  const handleUpdateSettings = async (newSettings: Partial<SystemQualitySettings>) => {
    const res = await adminFetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });
    if (res.ok) {
      await fetchAdminData();
    }
  };

  // Admin Destination Handlers
  const handleToggleDestinationActive = async (id: string, is_active: boolean) => {
    await adminFetch(`/api/admin/destinations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active }),
    });
    await fetchAdminData();
    showToast(`Channel ${is_active ? 'activated' : 'deactivated'}.`);
  };

  const handleUpdateDestinationConfig = async (id: string, config: any) => {
    await adminFetch(`/api/admin/destinations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    });
    await fetchAdminData();
    showToast('Destination credentials updated.');
  };

  // Initial Load
  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  useEffect(() => {
    if (currentView === 'feed' || currentView === 'archive') {
      fetchOpportunities();
    } else if (currentView === 'bookmarks') {
      fetchBookmarks();
    } else if (currentView === 'admin' && adminToken) {
      fetchAdminData();
    }
  }, [currentView, fetchOpportunities, fetchBookmarks, fetchAdminData, adminToken]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-emerald-500/40 bg-slate-900/95 px-4 py-2.5 text-xs font-semibold text-emerald-300 shadow-xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global Header (Admin controls completely hidden from public view) */}
      <Header
        currentView={currentView}
        onViewChange={handleViewChange}
        bookmarksCount={bookmarkedIds.size}
        isAuthenticatedAdmin={Boolean(adminToken && adminUser)}
        adminEmail={adminUser?.email}
        onLogoutAdmin={handleLogout}
      />

      {/* Main View Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:px-6">
        {currentView === 'admin-login' || (currentView === 'admin' && !adminToken) ? (
          /* =========================================================================
             SECURE ADMIN LOGIN VIEW
             ========================================================================= */
          <AdminLogin
            onLoginSuccess={handleLoginSuccess}
            onCancel={() => handleViewChange('feed')}
          />
        ) : currentView === 'admin' && adminToken ? (
          /* =========================================================================
             DEDICATED AUTHENTICATED ADMIN INTELLIGENCE CONSOLE
             ========================================================================= */
          <div className="space-y-6">
            {/* Admin navigation tabs */}
            <div className="flex items-center gap-1.5 border-b border-slate-800 pb-3 overflow-x-auto scrollbar-none text-xs">
              <button
                onClick={() => setAdminTab('metrics')}
                className={`px-3 py-1.5 font-medium rounded-lg transition-colors ${
                  adminTab === 'metrics'
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Overview & Health
              </button>
              <button
                onClick={() => setAdminTab('review')}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-lg transition-colors ${
                  adminTab === 'review'
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Review Queue</span>
                {reviewQueue.length > 0 && (
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-300 border border-amber-500/40">
                    {reviewQueue.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setAdminTab('sources')}
                className={`px-3 py-1.5 font-medium rounded-lg transition-colors ${
                  adminTab === 'sources'
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sources & Adapters ({sources.length})
              </button>
              <button
                onClick={() => setAdminTab('settings')}
                className={`px-3 py-1.5 font-medium rounded-lg transition-colors ${
                  adminTab === 'settings'
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Scheduler & Quality Gates
              </button>
              <button
                onClick={() => setAdminTab('destinations')}
                className={`px-3 py-1.5 font-medium rounded-lg transition-colors ${
                  adminTab === 'destinations'
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Publishing Channels
              </button>
              <button
                onClick={() => setAdminTab('audit')}
                className={`px-3 py-1.5 font-medium rounded-lg transition-colors ${
                  adminTab === 'audit'
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Audit Trail ({auditLogs.length})
              </button>
              <button
                onClick={() => setAdminTab('tests')}
                className={`px-3 py-1.5 font-medium rounded-lg transition-colors ${
                  adminTab === 'tests'
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Automated Tests
              </button>
            </div>

            {/* Admin Tab Content */}
            {adminTab === 'metrics' && (
              <AdminMetrics
                metrics={adminMetrics}
                onScanNow={handleTriggerDiscovery}
                isScanning={isDiscovering}
              />
            )}

            {adminTab === 'review' && (
              <AdminReviewQueue
                items={reviewQueue}
                onApprove={handleApproveQueueItem}
                onReject={handleRejectQueueItem}
                onInspect={opp => {
                  setSelectedOpportunity(opp);
                  setIsDetailOpen(true);
                }}
                isLoading={false}
              />
            )}

            {adminTab === 'sources' && (
              <AdminSources
                sources={sources}
                onToggleEnabled={handleToggleSourceEnabled}
                onAddSource={handleAddSource}
                onDeleteSource={handleDeleteSource}
                onTestSource={handleTestSource}
              />
            )}

            {adminTab === 'settings' && (
              qualitySettings && schedulerHealth ? (
                <AdminSettings
                  settings={qualitySettings}
                  scheduler={schedulerHealth}
                  onUpdateSettings={handleUpdateSettings}
                />
              ) : (
                <div className="space-y-4 animate-pulse">
                  <div className="h-10 bg-slate-900 rounded-lg w-1/3" />
                  <div className="h-64 rounded-xl border border-slate-800 bg-slate-900/40 p-6" />
                </div>
              )
            )}

            {adminTab === 'destinations' && (
              <AdminDestinations
                destinations={destinations}
                onToggleActive={handleToggleDestinationActive}
                onUpdateConfig={handleUpdateDestinationConfig}
              />
            )}

            {adminTab === 'audit' && (
              <AdminAuditLogs
                logs={auditLogs}
                isLoading={false}
                onRefresh={fetchAdminData}
              />
            )}

            {adminTab === 'tests' && <AdminTestRunner />}
          </div>
        ) : (
          /* =========================================================================
             CLEAN PUBLIC CLIENT OPPORTUNITY FEED & EXPLORER
             (Completely free of admin tools, scheduler stats, or internal logs)
             ========================================================================= */
          <div className="space-y-6">
            {/* Hero / Strategic Subheader */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-900 via-slate-900/60 to-slate-950 p-6 sm:p-8">
              <div className="max-w-2xl space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Verified Opportunity Intelligence</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                  Global Grants, Fellowships & Capital Opportunities
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Continuously discovered from official funder websites and innovation bodies. Verified against canonical sources with zero fabricated facts or countdowns.
                </p>
              </div>
            </div>

            {/* Filter Bar */}
            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              selectedRegion={selectedRegion}
              onRegionChange={setSelectedRegion}
              sortBy={sortBy}
              onSortChange={setSortBy}
              totalCount={totalCount}
            />

            {/* Opportunities Cards Grid */}
            {isLoadingFeed ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3 animate-pulse">
                    <div className="h-4 bg-slate-800 rounded w-1/3"></div>
                    <div className="h-6 bg-slate-800 rounded w-3/4"></div>
                    <div className="h-14 bg-slate-800/60 rounded"></div>
                    <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : opportunities.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-400 mb-3">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-200">No opportunities match criteria</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {currentView === 'bookmarks'
                    ? "You haven't bookmarked any opportunities yet. Click the bookmark icon on any card to save it."
                    : 'Try clearing your filters or changing your search terms to discover verified opportunities.'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setSelectedRegion('all');
                    }}
                    className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {opportunities.map(opp => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    isBookmarked={bookmarkedIds.has(opp.id)}
                    onToggleBookmark={handleToggleBookmark}
                    onSelect={o => {
                      setSelectedOpportunity(o);
                      setIsDetailOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Opportunity Detail Modal */}
      <OpportunityDetailModal
        opportunity={selectedOpportunity}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedOpportunity(null);
        }}
        isBookmarked={selectedOpportunity ? bookmarkedIds.has(selectedOpportunity.id) : false}
        onToggleBookmark={handleToggleBookmark}
      />

      {/* Global Public Footer with subtle Administrator Portal link */}
      <footer className="mt-12 border-t border-slate-800/80 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Vanguard Opportunity Intelligence</span>
            <span>·</span>
            <span>Primary source verification & evidence checks</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Focus: Nigeria & Africa · Global</span>
            <span>·</span>
            <button
              onClick={() => handleViewChange(adminToken ? 'admin' : 'admin-login')}
              className="flex items-center gap-1 hover:text-slate-200 transition-colors"
            >
              <Lock className="h-3 w-3" />
              <span>{adminToken ? 'Admin Console' : 'Administrator Sign In'}</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
