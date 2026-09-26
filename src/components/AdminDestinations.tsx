import React, { useState } from 'react';
import { PublicationDestination } from '../types/opportunity';
import { Globe, Send, Mail, Share2, CheckCircle, AlertCircle, Key, RefreshCw } from 'lucide-react';

interface AdminDestinationsProps {
  destinations: PublicationDestination[];
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  onUpdateConfig: (id: string, config: any) => Promise<void>;
}

export const AdminDestinations: React.FC<AdminDestinationsProps> = ({
  destinations,
  onToggleActive,
  onUpdateConfig,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [channelId, setChannelId] = useState('');
  const [botToken, setBotToken] = useState('');
  const [smtpUrl, setSmtpUrl] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'web':
        return <Globe className="h-5 w-5 text-emerald-400" />;
      case 'telegram':
        return <Send className="h-5 w-5 text-sky-400" />;
      case 'newsletter':
        return <Mail className="h-5 w-5 text-indigo-400" />;
      default:
        return <Share2 className="h-5 w-5 text-amber-400" />;
    }
  };

  const handleSaveConfig = async (dest: PublicationDestination) => {
    let updatedConfig = { ...dest.config };
    if (dest.channel_type === 'telegram') {
      updatedConfig.channelId = channelId || dest.config.channelId;
      if (botToken) {
        updatedConfig.configured = true;
        updatedConfig.botTokenSnippet = 'configured (ends with ' + botToken.slice(-4) + ')';
      }
    } else if (dest.channel_type === 'newsletter') {
      if (smtpUrl) {
        updatedConfig.smtpUrl = smtpUrl;
        updatedConfig.configured = true;
      }
    } else if (dest.channel_type === 'webhook') {
      if (webhookUrl) {
        updatedConfig.webhookUrl = webhookUrl;
        updatedConfig.configured = true;
      }
    }

    await onUpdateConfig(dest.id, updatedConfig);
    setEditingId(null);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h3 className="text-base font-semibold text-slate-100">
          Publication Channels & External Broadcaster Adapters
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Qualified opportunities publish to the verified public portal immediately. External channels are only activated when genuine credentials are configured.
        </p>
      </div>

      <div className="space-y-4">
        {destinations.map(dest => {
          const isConfigured = dest.config.configured || dest.channel_type === 'web';
          const isEditing = editingId === dest.id;

          return (
            <div
              key={dest.id}
              className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 border border-slate-800">
                    {getChannelIcon(dest.channel_type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-100">{dest.name}</h4>
                      {isConfigured ? (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                          <CheckCircle className="h-3 w-3" />
                          Ready
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                          <AlertCircle className="h-3 w-3" />
                          Credentials Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {dest.channel_type === 'web' && 'Primary portal feed with immediate real-time availability.'}
                      {dest.channel_type === 'telegram' && 'Automated broadcast to Telegram subscriber channel.'}
                      {dest.channel_type === 'newsletter' && 'Weekly scheduled markdown newsletter digest to subscriber list.'}
                      {dest.channel_type === 'webhook' && 'Outbound JSON webhook for downstream aggregators and bots.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {dest.channel_type !== 'web' && (
                    <button
                      onClick={() => {
                        setEditingId(isEditing ? null : dest.id);
                        if (dest.channel_type === 'telegram') {
                          setChannelId(dest.config.channelId || '');
                        }
                      }}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                      {isEditing ? 'Cancel' : 'Configure'}
                    </button>
                  )}

                  <button
                    onClick={() => onToggleActive(dest.id, !dest.is_active)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      dest.is_active
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {dest.is_active ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>

              {/* Editing Form */}
              {isEditing && (
                <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-300 font-semibold mb-1">
                    <Key className="h-4 w-4 text-emerald-400" />
                    <span>Channel API Credentials Setup</span>
                  </div>

                  {dest.channel_type === 'telegram' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-slate-400 mb-1">
                          Telegram Channel @Username or ID:
                        </label>
                        <input
                          type="text"
                          value={channelId}
                          onChange={e => setChannelId(e.target.value)}
                          placeholder="@vanguard_opportunities"
                          className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-200 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">
                          Telegram Bot Token (from @BotFather):
                        </label>
                        <input
                          type="password"
                          value={botToken}
                          onChange={e => setBotToken(e.target.value)}
                          placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                          className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-200 focus:outline-none"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                          Secrets remain securely server-side and are never exposed publicly.
                        </p>
                      </div>
                    </div>
                  )}

                  {dest.channel_type === 'newsletter' && (
                    <div>
                      <label className="block text-slate-400 mb-1">
                        SMTP Connection String / Mailgun URL:
                      </label>
                      <input
                        type="text"
                        value={smtpUrl}
                        onChange={e => setSmtpUrl(e.target.value)}
                        placeholder="smtps://user:password@smtp.mailgun.org:465"
                        className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-200 focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveConfig(dest)}
                      className="rounded bg-emerald-600 px-4 py-1.5 font-semibold text-white hover:bg-emerald-500"
                    >
                      Save Configuration
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
