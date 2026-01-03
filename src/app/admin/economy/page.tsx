"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  Shield, Coins, TrendingUp, Users, AlertTriangle, Settings,
  FileText, Play, RefreshCw, Loader2, Crown,
  Zap, Activity, DollarSign, BarChart3,
  AlertCircle, CheckCircle, Info, Sliders, History,
  Search, Ban, UserCheck, Gift, Megaphone, ToggleLeft, ToggleRight,
  UserCog, Plus, Trash2, Edit, X, Check, Save
} from "lucide-react";
import type {
  AdminRole,
  EconomicOverview,
  TokenClassConfig,
  PricingRuleConfig,
  SubscriptionTierConfig,
  EthicalGovernanceConfig,
  AuditLogEntry,
  EconomicAlert,
} from "@/lib/types/admin-economy";

type TabId = "overview" | "analytics" | "users" | "tokens" | "pricing" | "subscriptions" | "ethical" | "settings" | "announcements" | "admins" | "audit";

interface AdminState {
  id: string;
  role: AdminRole;
  permissions: string[];
}

interface UserData {
  id: string;
  email: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  accountStatus: string;
  emailVerified: boolean;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  tokenBalance: number;
  lifetimeSpent: number;
  subscription: string;
  subscriptionStatus: string;
  characterCount: number;
}

interface SystemSetting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  description: string;
  category: string;
  updated_at: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  is_active: boolean;
  target_audience: string;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
}

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  permissions: string[];
  is_active: boolean;
  created_at: number;
  profiles: {
    email: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface Analytics {
  users: {
    total: number;
    active: number;
    newThisWeek: number;
    newThisMonth: number;
    activeThisWeek: number;
  };
  characters: { total: number };
  tokens: { totalInCirculation: number };
  subscriptions: Record<string, number>;
  dailyStats: { date: string; signups: number }[];
}

export default function AdminEconomyPage() {
  const router = useRouter();
  const { session, isLoading: authLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [admin, setAdmin] = useState<AdminState | null>(null);
  const [overview, setOverview] = useState<EconomicOverview | null>(null);
  const [tokenConfigs, setTokenConfigs] = useState<TokenClassConfig[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRuleConfig[]>([]);
  const [subscriptionTiers, setSubscriptionTiers] = useState<SubscriptionTierConfig[]>([]);
  const [ethicalConfig, setEthicalConfig] = useState<EthicalGovernanceConfig | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !session?.accessToken) {
      router.push("/auth/login");
      return;
    }
    loadOverview();
  }, [authLoading, isAuthenticated, session, router]);

  const loadOverview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/economy/overview", {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Access denied");
        return;
      }
      const data = await res.json();
      setAdmin(data.admin);
      setOverview(data.overview);
    } catch {
      setError("Failed to load admin data");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTabData = useCallback(async (tab: TabId) => {
    if (!session?.accessToken) return;
    const headers = { Authorization: `Bearer ${session.accessToken}` };

    try {
      switch (tab) {
        case "analytics": {
          const res = await fetch("/api/admin/analytics", { headers });
          const data = await res.json();
          setAnalytics(data.analytics);
          break;
        }
        case "users": {
          const res = await fetch(`/api/admin/users?search=${searchQuery}&limit=50`, { headers });
          const data = await res.json();
          setUsers(data.users || []);
          setUsersTotal(data.total || 0);
          break;
        }
        case "tokens": {
          const res = await fetch("/api/admin/economy/tokens", { headers });
          const data = await res.json();
          setTokenConfigs(data.tokenConfigs || []);
          break;
        }
        case "pricing": {
          const res = await fetch("/api/admin/economy/pricing", { headers });
          const data = await res.json();
          setPricingRules(data.pricingRules || []);
          break;
        }
        case "subscriptions": {
          const res = await fetch("/api/admin/economy/subscriptions", { headers });
          const data = await res.json();
          setSubscriptionTiers(data.subscriptionTiers || []);
          break;
        }
        case "ethical": {
          const res = await fetch("/api/admin/economy/ethical", { headers });
          const data = await res.json();
          setEthicalConfig(data.ethicalConfig);
          break;
        }
        case "settings": {
          const res = await fetch("/api/admin/settings", { headers });
          const data = await res.json();
          setSystemSettings(data.settings || []);
          break;
        }
        case "announcements": {
          const res = await fetch("/api/admin/announcements", { headers });
          const data = await res.json();
          setAnnouncements(data.announcements || []);
          break;
        }
        case "admins": {
          const res = await fetch("/api/admin/admins", { headers });
          const data = await res.json();
          setAdminUsers(data.admins || []);
          break;
        }
        case "audit": {
          const res = await fetch("/api/admin/economy/audit?limit=100", { headers });
          const data = await res.json();
          setAuditLogs(data.auditLogs || []);
          break;
        }
      }
    } catch (err) {
      console.error("Failed to load tab data:", err);
    }
  }, [session?.accessToken, searchQuery]);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab !== "overview") {
      loadTabData(tab);
    }
  };

  const handleUserAction = async (userId: string, action: string, data?: Record<string, unknown>) => {
    if (!session?.accessToken) return;
    
    const reason = prompt("دلیل این اقدام را وارد کنید:");
    if (!reason) return;

    setActionLoading(true);
    try {
      await fetch("/api/admin/users", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, action, reason, data }),
      });
      loadTabData("users");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSettingUpdate = async (key: string, value: Record<string, unknown>) => {
    if (!session?.accessToken) return;
    
    setActionLoading(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key, value, reason: "Setting updated from admin panel" }),
      });
      loadTabData("settings");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTokenConfigUpdate = async (tokenClass: string, updates: Partial<TokenClassConfig>) => {
    if (!session?.accessToken) return;
    
    const reason = prompt("دلیل تغییر را وارد کنید:");
    if (!reason) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/economy/tokens", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tokenClass, updates, reason }),
      });
      if (res.ok) {
        loadTabData("tokens");
      } else {
        const data = await res.json();
        alert(data.error || "خطا در ذخیره تغییرات");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handlePricingRuleCreate = async (rule: Partial<PricingRuleConfig>) => {
    if (!session?.accessToken) return;
    
    const reason = prompt("دلیل ایجاد قانون جدید:");
    if (!reason) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/economy/pricing", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rule, reason }),
      });
      if (res.ok) {
        loadTabData("pricing");
      } else {
        const data = await res.json();
        alert(data.error || "خطا در ایجاد قانون");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubscriptionTierUpdate = async (tierId: string, updates: Partial<SubscriptionTierConfig>) => {
    if (!session?.accessToken) return;
    
    const reason = prompt("دلیل تغییر را وارد کنید:");
    if (!reason) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/economy/subscriptions", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tierId, updates, reason }),
      });
      if (res.ok) {
        loadTabData("subscriptions");
      } else {
        const data = await res.json();
        alert(data.error || "خطا در ذخیره تغییرات");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleEthicalConfigUpdate = async (updates: Partial<EthicalGovernanceConfig>) => {
    if (!session?.accessToken) return;
    
    const reason = prompt("دلیل تغییر را وارد کنید:");
    if (!reason) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/economy/ethical", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ updates, reason }),
      });
      if (res.ok) {
        loadTabData("ethical");
      } else {
        const data = await res.json();
        alert(data.error || "خطا در ذخیره تغییرات");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulate = async () => {
    if (!session?.accessToken) return;
    
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/economy/simulate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scenario: "default" }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`شبیه‌سازی موفق:\n\nتاثیر بر درآمد: ${data.simulation?.revenueImpact || "N/A"}%\nتاثیر بر کاربران: ${data.simulation?.userImpact || "N/A"}%`);
      } else {
        alert(data.error || "خطا در شبیه‌سازی");
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-destructive opacity-50" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode; permission: string }[] = [
    { id: "overview", label: "نمای کلی", icon: <BarChart3 className="w-4 h-4" />, permission: "view_economic_overview" },
    { id: "analytics", label: "آنالیتیکس", icon: <TrendingUp className="w-4 h-4" />, permission: "view_economic_overview" },
    { id: "users", label: "کاربران", icon: <Users className="w-4 h-4" />, permission: "manage_users" },
    { id: "tokens", label: "توکن‌ها", icon: <Coins className="w-4 h-4" />, permission: "view_token_analytics" },
    { id: "pricing", label: "قیمت‌گذاری", icon: <DollarSign className="w-4 h-4" />, permission: "view_economic_overview" },
    { id: "subscriptions", label: "اشتراک‌ها", icon: <Crown className="w-4 h-4" />, permission: "view_subscription_analytics" },
    { id: "settings", label: "تنظیمات", icon: <Settings className="w-4 h-4" />, permission: "manage_system_settings" },
    { id: "announcements", label: "اعلانات", icon: <Megaphone className="w-4 h-4" />, permission: "manage_announcements" },
    { id: "admins", label: "ادمین‌ها", icon: <UserCog className="w-4 h-4" />, permission: "manage_admins" },
    { id: "ethical", label: "اخلاقی", icon: <Shield className="w-4 h-4" />, permission: "view_ethical_governance" },
    { id: "audit", label: "لاگ", icon: <History className="w-4 h-4" />, permission: "view_audit_logs" },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.65_0.2_25_/_0.06),transparent_50%)]" />

      {actionLoading && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-background rounded-xl p-6 flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>در حال پردازش...</span>
          </div>
        </div>
      )}

      <nav className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h1 className="font-semibold">پنل مدیریت</h1>
              <p className="text-xs text-muted-foreground capitalize">{admin?.role.replace("_", " ")}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={loadOverview}>
              <RefreshCw className="w-4 h-4 ml-2" />
              بروزرسانی
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
              خروج از پنل
            </Button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 flex-wrap">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => handleTabChange(tab.id)}
              className={activeTab === tab.id ? "bg-destructive/90 hover:bg-destructive" : ""}
              disabled={!admin?.permissions.includes(tab.permission)}
            >
              {tab.icon}
              <span className="mr-2">{tab.label}</span>
            </Button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "overview" && overview && (
            <OverviewTab key="overview" overview={overview} />
          )}
          {activeTab === "analytics" && (
            <AnalyticsTab key="analytics" analytics={analytics} />
          )}
          {activeTab === "users" && (
            <UsersTab
              key="users"
              users={users}
              total={usersTotal}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSearch={() => loadTabData("users")}
              onAction={handleUserAction}
            />
          )}
          {activeTab === "tokens" && (
            <TokensTab
              key="tokens"
              configs={tokenConfigs}
              canManage={admin?.permissions.includes("manage_token_classes")}
              onUpdate={handleTokenConfigUpdate}
            />
          )}
          {activeTab === "pricing" && (
            <PricingTab
              key="pricing"
              rules={pricingRules}
              canManage={admin?.permissions.includes("manage_pricing_rules")}
              onCreate={handlePricingRuleCreate}
              onSimulate={handleSimulate}
            />
          )}
          {activeTab === "subscriptions" && (
            <SubscriptionsTab
              key="subscriptions"
              tiers={subscriptionTiers}
              canManage={admin?.permissions.includes("manage_subscriptions")}
              onUpdate={handleSubscriptionTierUpdate}
            />
          )}
          {activeTab === "settings" && (
            <SettingsTab key="settings" settings={systemSettings} onUpdate={handleSettingUpdate} />
          )}
          {activeTab === "announcements" && (
            <AnnouncementsTab
              key="announcements"
              announcements={announcements}
              session={session}
              onRefresh={() => loadTabData("announcements")}
            />
          )}
          {activeTab === "admins" && (
            <AdminsTab
              key="admins"
              admins={adminUsers}
              currentAdminId={admin?.id}
              session={session}
              onRefresh={() => loadTabData("admins")}
            />
          )}
          {activeTab === "ethical" && (
            <EthicalTab
              key="ethical"
              config={ethicalConfig}
              canManage={admin?.permissions.includes("manage_ethical_thresholds")}
              onUpdate={handleEthicalConfigUpdate}
            />
          )}
          {activeTab === "audit" && (
            <AuditTab key="audit" logs={auditLogs} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AnalyticsTab({ analytics }: { analytics: Analytics | null }) {
  if (!analytics) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="کل کاربران"
          value={analytics.users.total}
          icon={<Users className="w-5 h-5" />}
          trend={`${analytics.users.active} فعال`}
          color="primary"
        />
        <MetricCard
          title="کاربران جدید هفته"
          value={analytics.users.newThisWeek}
          icon={<TrendingUp className="w-5 h-5" />}
          trend={`${analytics.users.newThisMonth} این ماه`}
          color="green"
        />
        <MetricCard
          title="کل کاراکترها"
          value={analytics.characters.total}
          icon={<Zap className="w-5 h-5" />}
          trend="کاراکتر ساخته شده"
          color="amber"
        />
        <MetricCard
          title="توکن در گردش"
          value={analytics.tokens.totalInCirculation.toLocaleString()}
          icon={<Coins className="w-5 h-5" />}
          trend="مجموع موجودی"
          color="rose"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-4">ثبت‌نام روزانه (۷ روز اخیر)</h3>
          <div className="flex items-end gap-2 h-40">
            {analytics.dailyStats.map((day) => {
              const max = Math.max(...analytics.dailyStats.map(d => d.signups), 1);
              const height = (day.signups / max) * 100;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary/70 rounded-t transition-all"
                    style={{ height: `${Math.max(height, 5)}%` }}
                  />
                  <span className="text-xs text-muted-foreground">{day.date.slice(5)}</span>
                  <span className="text-xs font-medium">{day.signups}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-4">توزیع اشتراک‌ها</h3>
          <div className="space-y-3">
            {Object.entries(analytics.subscriptions).map(([plan, count]) => {
              const total = Object.values(analytics.subscriptions).reduce((a, b) => a + b, 0) || 1;
              const percent = (count / total) * 100;
              return (
                <div key={plan}>
                  <div className="flex justify-between mb-1">
                    <span className="capitalize">{plan}</span>
                    <span>{count} ({percent.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary/70 rounded-full" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function UsersTab({
  users,
  total,
  searchQuery,
  setSearchQuery,
  onSearch,
  onAction,
}: {
  users: UserData[];
  total: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSearch: () => void;
  onAction: (userId: string, action: string, data?: Record<string, unknown>) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">مدیریت کاربران ({total})</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="جستجو..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
              className="pl-4 pr-10 py-2 rounded-lg bg-secondary/50 border border-border text-sm w-64"
            />
          </div>
          <Button size="sm" onClick={onSearch}>
            جستجو
          </Button>
        </div>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 sticky top-0">
              <tr>
                <th className="text-right p-3 font-medium">کاربر</th>
                <th className="text-right p-3 font-medium">وضعیت</th>
                <th className="text-right p-3 font-medium">اشتراک</th>
                <th className="text-right p-3 font-medium">توکن</th>
                <th className="text-right p-3 font-medium">کاراکتر</th>
                <th className="text-right p-3 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-secondary/30">
                  <td className="p-3">
                    <div>
                      <div className="font-medium">{u.displayName || u.email}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      u.accountStatus === "active" ? "bg-green-500/20 text-green-500" :
                      u.accountStatus === "banned" ? "bg-red-500/20 text-red-500" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {u.accountStatus}
                    </span>
                  </td>
                  <td className="p-3 capitalize">{u.subscription}</td>
                  <td className="p-3">{u.tokenBalance.toLocaleString()}</td>
                  <td className="p-3">{u.characterCount}</td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {u.accountStatus === "active" ? (
                          <Button size="sm" variant="ghost" onClick={() => onAction(u.id, "ban")} title="مسدود کردن">
                            <Ban className="w-4 h-4 text-red-500" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => onAction(u.id, "unban")} title="رفع مسدودیت">
                            <UserCheck className="w-4 h-4 text-green-500" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => {
                          const amount = prompt("مقدار توکن:", "100");
                          if (amount) onAction(u.id, "grant_tokens", { amount: parseInt(amount) });
                        }} title="اهدای توکن">
                          <Gift className="w-4 h-4 text-primary" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          const amount = prompt("ریست به مقدار:", "1000");
                          if (amount) onAction(u.id, "reset_tokens", { amount: parseInt(amount) });
                        }} title="ریست توکن">
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          const plan = prompt("انتخاب پلن (free, basic, pro, enterprise):", u.subscription);
                          if (plan && ["free", "basic", "pro", "enterprise"].includes(plan)) {
                            onAction(u.id, "change_subscription", { plan });
                          }
                        }} title="تغییر اشتراک">
                          <Crown className="w-4 h-4 text-amber-500" />
                        </Button>
                      </div>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

function SettingsTab({
  settings,
  onUpdate,
}: {
  settings: SystemSetting[];
  onUpdate: (key: string, value: Record<string, unknown>) => void;
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleEdit = (setting: SystemSetting) => {
    setEditingKey(setting.key);
    setEditValue(JSON.stringify(setting.value, null, 2));
  };

  const handleSave = (key: string) => {
    try {
      const parsed = JSON.parse(editValue);
      onUpdate(key, parsed);
      setEditingKey(null);
    } catch {
      alert("JSON نامعتبر");
    }
  };

  const groupedSettings = settings.reduce((acc, s) => {
    acc[s.category] = acc[s.category] || [];
    acc[s.category].push(s);
    return acc;
  }, {} as Record<string, SystemSetting[]>);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      <h2 className="text-lg font-semibold">تنظیمات سیستم</h2>

      {Object.entries(groupedSettings).map(([category, categorySettings]) => (
        <div key={category} className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-4 capitalize">{category}</h3>
          <div className="space-y-4">
            {categorySettings.map((setting) => (
              <div key={setting.key} className="border-b border-border/50 pb-4 last:border-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium">{setting.key}</div>
                    <div className="text-sm text-muted-foreground">{setting.description}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(setting)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
                
                {editingKey === setting.key ? (
                  <div className="space-y-2">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full h-32 p-2 rounded bg-secondary/50 border border-border font-mono text-sm"
                      dir="ltr"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSave(setting.key)}>
                        <Check className="w-4 h-4 ml-1" />
                        ذخیره
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingKey(null)}>
                        <X className="w-4 h-4 ml-1" />
                        انصراف
                      </Button>
                    </div>
                  </div>
                ) : (
                  <pre className="p-3 rounded bg-secondary/30 text-xs overflow-auto" dir="ltr">
                    {JSON.stringify(setting.value, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

function AnnouncementsTab({
  announcements,
  session,
  onRefresh,
}: {
  announcements: Announcement[];
  session: { accessToken: string } | null;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("info");

  const handleCreate = async () => {
    if (!session?.accessToken || !title || !content) return;
    
    await fetch("/api/admin/announcements", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, content, type }),
    });
    
    setShowForm(false);
    setTitle("");
    setContent("");
    onRefresh();
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    if (!session?.accessToken) return;
    
    await fetch("/api/admin/announcements", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!session?.accessToken) return;
    
    await fetch(`/api/admin/announcements?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    
    onRefresh();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">مدیریت اعلانات</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 ml-2" />
          اعلان جدید
        </Button>
      </div>

      {showForm && (
        <div className="glass rounded-xl p-6 space-y-4">
          <input
            type="text"
            placeholder="عنوان"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 rounded bg-secondary/50 border border-border"
          />
          <textarea
            placeholder="محتوا"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-24 p-2 rounded bg-secondary/50 border border-border"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="p-2 rounded bg-secondary/50 border border-border"
          >
            <option value="info">اطلاعات</option>
            <option value="warning">هشدار</option>
            <option value="success">موفقیت</option>
            <option value="error">خطا</option>
          </select>
          <div className="flex gap-2">
            <Button onClick={handleCreate}>ایجاد</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>انصراف</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className={`glass rounded-xl p-5 ${!a.is_active ? "opacity-50" : ""}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{a.title}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    a.type === "warning" ? "bg-amber-500/20 text-amber-500" :
                    a.type === "error" ? "bg-red-500/20 text-red-500" :
                    a.type === "success" ? "bg-green-500/20 text-green-500" :
                    "bg-blue-500/20 text-blue-500"
                  }`}>
                    {a.type}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{a.content}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(a.created_at).toLocaleDateString("fa-IR")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => handleToggle(a.id, a.is_active)}>
                  {a.is_active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(a.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function AdminsTab({
  admins,
  currentAdminId,
  session,
  onRefresh,
}: {
  admins: AdminUser[];
  currentAdminId?: string;
  session: { accessToken: string } | null;
  onRefresh: () => void;
}) {
  const handleToggleActive = async (adminId: string, isActive: boolean) => {
    if (!session?.accessToken) return;
    
    await fetch("/api/admin/admins", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ adminId, isActive: !isActive }),
    });
    
    onRefresh();
  };

  const handleRemove = async (adminId: string) => {
    if (!session?.accessToken) return;
    if (!confirm("آیا مطمئن هستید؟")) return;
    
    await fetch(`/api/admin/admins?id=${adminId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    
    onRefresh();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">مدیریت ادمین‌ها</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {admins.map((a) => (
          <div key={a.id} className={`glass rounded-xl p-5 ${!a.is_active ? "opacity-50" : ""}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold">{a.profiles?.display_name || a.profiles?.email}</div>
                <div className="text-sm text-muted-foreground">{a.profiles?.email}</div>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs bg-primary/20 text-primary capitalize">
                  {a.role.replace("_", " ")}
                </span>
              </div>
              {a.id !== currentAdminId && (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleToggleActive(a.id, a.is_active)}>
                    {a.is_active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleRemove(a.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {a.permissions.slice(0, 5).map((p) => (
                <span key={p} className="px-2 py-0.5 rounded bg-secondary text-xs">
                  {p.replace(/_/g, " ")}
                </span>
              ))}
              {a.permissions.length > 5 && (
                <span className="px-2 py-0.5 rounded bg-secondary text-xs">
                  +{a.permissions.length - 5}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function OverviewTab({ overview }: { overview: EconomicOverview }) {
  const { tokenMetrics, subscriptionMetrics, systemMetrics, alerts } = overview;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <AlertBanner key={alert.alertId} alert={alert} />
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="مشترکین"
          value={subscriptionMetrics?.totalSubscribers ?? 0}
          icon={<Users className="w-5 h-5" />}
          trend={`+${subscriptionMetrics?.newSubscribersThisMonth ?? 0} این ماه`}
          color="primary"
        />
        <MetricCard
          title="MRR"
          value={`$${(subscriptionMetrics?.monthlyRecurringRevenue ?? 0).toLocaleString()}`}
          icon={<DollarSign className="w-5 h-5" />}
          trend="درآمد ماهانه"
          color="green"
        />
        <MetricCard
          title="بار سیستم"
          value={`${(systemMetrics?.currentLoad ?? 0).toFixed(0)}%`}
          icon={<Activity className="w-5 h-5" />}
          trend={`${systemMetrics?.activeUsers ?? 0} کاربر فعال`}
          color="amber"
        />
        <MetricCard
          title="نرخ خطا"
          value={`${(systemMetrics?.errorRate ?? 0).toFixed(2)}%`}
          icon={<AlertCircle className="w-5 h-5" />}
          trend={`${(systemMetrics?.averageResponseTime ?? 0).toFixed(0)}ms میانگین`}
          color="rose"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            گردش توکن
          </h3>
          <div className="space-y-3">
            {Object.entries(tokenMetrics.totalTokensInCirculation || {}).slice(0, 6).map(([tokenClass, amount]) => (
              <div key={tokenClass} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground capitalize">{tokenClass.replace(/_/g, " ")}</span>
                <div className="text-left">
                  <span className="font-medium">{(amount ?? 0).toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground mr-2">
                    ({((tokenMetrics.tokensConsumedToday || {})[tokenClass] ?? 0).toLocaleString()} امروز)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-accent" />
            اشتراک‌ها بر اساس طرح
          </h3>
          <div className="space-y-3">
            {Object.entries(subscriptionMetrics?.subscribersByTier || {}).map(([tier, count]) => {
              const total = subscriptionMetrics?.totalSubscribers || 1;
              const percent = ((count ?? 0) / total) * 100;
              return (
                <div key={tier}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm capitalize">{tier}</span>
                    <span className="text-sm font-medium">{count ?? 0} ({percent.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" />
          بیشترین مصرف توکن
        </h3>
        <div className="grid md:grid-cols-5 gap-4">
          {(tokenMetrics.topConsumptionContexts || []).map((ctx) => (
            <div key={ctx.contextType} className="text-center p-3 rounded-lg bg-secondary/50">
              <div className="text-lg font-bold">{(ctx.percentage ?? 0).toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground capitalize">{ctx.contextType.replace(/_/g, " ")}</div>
              <div className="text-xs text-muted-foreground mt-1">{(ctx.totalConsumed ?? 0).toLocaleString()} توکن</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function TokensTab({
  configs,
  canManage,
  onUpdate,
}: {
  configs: TokenClassConfig[];
  canManage?: boolean;
  onUpdate: (tokenClass: string, updates: Partial<TokenClassConfig>) => void;
}) {
  const [editingToken, setEditingToken] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<TokenClassConfig>>({});

  const startEdit = (config: TokenClassConfig) => {
    setEditingToken(config.tokenClass);
    setEditData({
      decayRatePerDay: config.decayRatePerDay,
      stakingBonusRate: config.stakingBonusRate,
      minBalance: config.minBalance,
      maxBalance: config.maxBalance,
      isActive: config.isActive,
    });
  };

  const handleSave = () => {
    if (editingToken) {
      onUpdate(editingToken, editData);
      setEditingToken(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">تنظیمات کلاس توکن</h2>
      </div>

      <div className="grid gap-4">
        {configs.map((config) => (
          <div key={config.tokenClass} className="glass rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{config.displayName}</h3>
                  {config.isActive ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-500">فعال</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">غیرفعال</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{config.description}</p>
              </div>
              {canManage && (
                <Button variant="ghost" size="sm" onClick={() => startEdit(config)}>
                  <Sliders className="w-4 h-4" />
                </Button>
              )}
            </div>

            {editingToken === config.tokenClass ? (
              <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">نرخ کاهش روزانه</label>
                    <input
                      type="number"
                      step="0.001"
                      value={editData.decayRatePerDay || 0}
                      onChange={(e) => setEditData({ ...editData, decayRatePerDay: parseFloat(e.target.value) })}
                      className="w-full p-2 rounded bg-secondary border border-border mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">نرخ پاداش استیکینگ</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editData.stakingBonusRate || 0}
                      onChange={(e) => setEditData({ ...editData, stakingBonusRate: parseFloat(e.target.value) })}
                      className="w-full p-2 rounded bg-secondary border border-border mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">حداقل موجودی</label>
                    <input
                      type="number"
                      value={editData.minBalance || 0}
                      onChange={(e) => setEditData({ ...editData, minBalance: parseInt(e.target.value) })}
                      className="w-full p-2 rounded bg-secondary border border-border mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">حداکثر موجودی</label>
                    <input
                      type="number"
                      value={editData.maxBalance || 0}
                      onChange={(e) => setEditData({ ...editData, maxBalance: parseInt(e.target.value) })}
                      className="w-full p-2 rounded bg-secondary border border-border mt-1"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editData.isActive || false}
                    onChange={(e) => setEditData({ ...editData, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">فعال</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave}>
                    <Save className="w-4 h-4 ml-1" />
                    ذخیره
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingToken(null)}>
                    <X className="w-4 h-4 ml-1" />
                    انصراف
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">کاهش</div>
                  <div className="font-medium">{config.decayEnabled ? `${(config.decayRatePerDay * 100).toFixed(2)}%/روز` : "غیرفعال"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">استیکینگ</div>
                  <div className="font-medium">{config.stakingEnabled ? `${(config.stakingBonusRate * 100).toFixed(1)}% پاداش` : "غیرفعال"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">محدودیت</div>
                  <div className="font-medium">{config.minBalance} - {config.maxBalance.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">قابل انتقال</div>
                  <div className="font-medium">{config.transferable ? "بله" : "خیر"}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function PricingTab({
  rules,
  canManage,
  onCreate,
  onSimulate,
}: {
  rules: PricingRuleConfig[];
  canManage?: boolean;
  onCreate: (rule: Partial<PricingRuleConfig>) => void;
  onSimulate: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [newRule, setNewRule] = useState<Partial<PricingRuleConfig>>({
    ruleName: "",
    description: "",
    multiplier: 1,
    flatAdjustment: 0,
    priority: 1,
    appliesTo: [],
    isActive: true,
  });

  const handleCreate = () => {
    if (!newRule.ruleName) {
      alert("نام قانون الزامی است");
      return;
    }
    onCreate(newRule);
    setShowForm(false);
    setNewRule({
      ruleName: "",
      description: "",
      multiplier: 1,
      flatAdjustment: 0,
      priority: 1,
      appliesTo: [],
      isActive: true,
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">قوانین قیمت‌گذاری پویا</h2>
        <div className="flex gap-2">
          {canManage && (
            <>
              <Button variant="outline" size="sm" onClick={onSimulate}>
                <Play className="w-4 h-4 ml-2" />
                شبیه‌سازی
              </Button>
              <Button size="sm" className="bg-destructive/90 hover:bg-destructive" onClick={() => setShowForm(!showForm)}>
                <Plus className="w-4 h-4 ml-2" />
                افزودن قانون
              </Button>
            </>
          )}
        </div>
      </div>

      {showForm && (
        <div className="glass rounded-xl p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">نام قانون</label>
              <input
                type="text"
                value={newRule.ruleName || ""}
                onChange={(e) => setNewRule({ ...newRule, ruleName: e.target.value })}
                className="w-full p-2 rounded bg-secondary/50 border border-border mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">اولویت</label>
              <input
                type="number"
                value={newRule.priority || 1}
                onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
                className="w-full p-2 rounded bg-secondary/50 border border-border mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">ضریب</label>
              <input
                type="number"
                step="0.1"
                value={newRule.multiplier || 1}
                onChange={(e) => setNewRule({ ...newRule, multiplier: parseFloat(e.target.value) })}
                className="w-full p-2 rounded bg-secondary/50 border border-border mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">تعدیل ثابت</label>
              <input
                type="number"
                value={newRule.flatAdjustment || 0}
                onChange={(e) => setNewRule({ ...newRule, flatAdjustment: parseInt(e.target.value) })}
                className="w-full p-2 rounded bg-secondary/50 border border-border mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">توضیحات</label>
            <textarea
              value={newRule.description || ""}
              onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
              className="w-full h-20 p-2 rounded bg-secondary/50 border border-border mt-1"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">اعمال روی (جدا با کاما)</label>
            <input
              type="text"
              placeholder="chat, evolution, memory_consolidation"
              onChange={(e) => setNewRule({ ...newRule, appliesTo: e.target.value.split(",").map(s => s.trim()) })}
              className="w-full p-2 rounded bg-secondary/50 border border-border mt-1"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate}>ایجاد</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>انصراف</Button>
          </div>
        </div>
      )}

      {rules.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">هنوز قانون قیمت‌گذاری تنظیم نشده</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.ruleId} className="glass rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{rule.ruleName}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                      اولویت {rule.priority}
                    </span>
                    {!rule.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">غیرفعال</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold">{rule.multiplier}x</div>
                  {rule.flatAdjustment !== 0 && (
                    <div className="text-xs text-muted-foreground">
                      {rule.flatAdjustment > 0 ? "+" : ""}{rule.flatAdjustment} ثابت
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {rule.appliesTo.map((context) => (
                  <span key={context} className="text-xs px-2 py-1 rounded bg-secondary">
                    {context}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function SubscriptionsTab({
  tiers,
  canManage,
  onUpdate,
}: {
  tiers: SubscriptionTierConfig[];
  canManage?: boolean;
  onUpdate: (tierId: string, updates: Partial<SubscriptionTierConfig>) => void;
}) {
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<SubscriptionTierConfig>>({});

  const startEdit = (tier: SubscriptionTierConfig) => {
    setEditingTier(tier.tierId);
    setEditData({
      monthlyPrice: tier.monthlyPrice,
      yearlyPrice: tier.yearlyPrice,
      rolloverPercent: tier.rolloverPercent,
    });
  };

  const handleSave = () => {
    if (editingTier) {
      onUpdate(editingTier, editData);
      setEditingTier(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">مدیریت طرح‌های اشتراک</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {tiers.map((tier) => (
          <div key={tier.tierId} className="glass rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold">{tier.displayName}</h3>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
              </div>
              <div className="text-left">
                <div className="text-xl font-bold">${tier.monthlyPrice}/ماه</div>
                <div className="text-xs text-muted-foreground">${tier.yearlyPrice}/سال</div>
              </div>
            </div>

            {editingTier === tier.tierId ? (
              <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">قیمت ماهانه</label>
                    <input
                      type="number"
                      value={editData.monthlyPrice || 0}
                      onChange={(e) => setEditData({ ...editData, monthlyPrice: parseFloat(e.target.value) })}
                      className="w-full p-2 rounded bg-secondary border border-border mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">قیمت سالانه</label>
                    <input
                      type="number"
                      value={editData.yearlyPrice || 0}
                      onChange={(e) => setEditData({ ...editData, yearlyPrice: parseFloat(e.target.value) })}
                      className="w-full p-2 rounded bg-secondary border border-border mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">انتقال توکن %</label>
                    <input
                      type="number"
                      value={editData.rolloverPercent || 0}
                      onChange={(e) => setEditData({ ...editData, rolloverPercent: parseInt(e.target.value) })}
                      className="w-full p-2 rounded bg-secondary border border-border mt-1"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave}>
                    <Save className="w-4 h-4 ml-1" />
                    ذخیره
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingTier(null)}>
                    <X className="w-4 h-4 ml-1" />
                    انصراف
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">عمق شناختی</span>
                    <span>{tier.capabilities.maxCognitiveDepth}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">کاراکترهای فعال</span>
                    <span>{tier.capabilities.maxActiveCharacters === -1 ? "نامحدود" : tier.capabilities.maxActiveCharacters}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">پردازش</span>
                    <span className="capitalize">{tier.capabilities.processingPriority}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">انتقال توکن</span>
                    <span>{tier.rolloverPercent}%</span>
                  </div>
                </div>

                {canManage && (
                  <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => startEdit(tier)}>
                    <Settings className="w-4 h-4 ml-2" />
                    پیکربندی
                  </Button>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function EthicalTab({
  config,
  canManage,
  onUpdate,
}: {
  config: EthicalGovernanceConfig | null;
  canManage?: boolean;
  onUpdate: (updates: Partial<EthicalGovernanceConfig>) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, number>>({});

  const startEdit = () => {
    if (config) {
      setEditData(config.riskThresholds as Record<string, number>);
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    onUpdate({ riskThresholds: editData as EthicalGovernanceConfig["riskThresholds"] });
    setIsEditing(false);
  };

  if (!config) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="glass rounded-xl p-12 text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">پیکربندی حاکمیت اخلاقی تنظیم نشده</p>
          {canManage && (
            <Button className="mt-4 bg-destructive/90 hover:bg-destructive" onClick={() => onUpdate({
              riskThresholds: {
                maxDailySpend: 10000,
                maxSingleTransaction: 1000,
                minBalanceWarning: 100,
                addictionWarningThreshold: 0.8,
                cooldownPeriodHours: 24,
              }
            })}>
              ایجاد پیکربندی
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">پیکربندی حاکمیت اخلاقی</h2>
        {canManage && !isEditing && (
          <Button size="sm" className="bg-destructive/90 hover:bg-destructive" onClick={startEdit}>
            <Settings className="w-4 h-4 ml-2" />
            ویرایش آستانه‌ها
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-4">آستانه‌های ریسک</h3>
          {isEditing ? (
            <div className="space-y-4">
              {Object.entries(editData).map(([key, value]) => (
                <div key={key}>
                  <label className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={value}
                    onChange={(e) => setEditData({ ...editData, [key]: parseFloat(e.target.value) })}
                    className="w-full p-2 rounded bg-secondary border border-border mt-1"
                  />
                </div>
              ))}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave}>
                  <Save className="w-4 h-4 ml-1" />
                  ذخیره
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                  <X className="w-4 h-4 ml-1" />
                  انصراف
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(config.riskThresholds).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                  <span className="font-medium">{typeof value === "number" ? value : String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-4">مداخلات فعال</h3>
          <div className="space-y-2">
            {config.interventions.filter(i => i.isActive).map((intervention) => (
              <div key={intervention.interventionId} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-sm capitalize">{intervention.interventionType.replace(/_/g, " ")}</span>
                <span className="text-xs text-muted-foreground mr-auto">سطح: {intervention.riskLevel}</span>
              </div>
            ))}
            {config.interventions.filter(i => i.isActive).length === 0 && (
              <p className="text-sm text-muted-foreground">هیچ مداخله فعالی وجود ندارد</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AuditTab({ logs }: { logs: AuditLogEntry[] }) {
  const downloadLogs = () => {
    const csv = [
      ["زمان", "ادمین", "عملیات", "هدف", "دلیل"].join(","),
      ...logs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.adminRole,
        log.actionType,
        log.targetType,
        `"${log.reason}"`,
      ].join(","))
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">گزارش عملیات</h2>
        <Button variant="outline" size="sm" onClick={downloadLogs}>
          <FileText className="w-4 h-4 ml-2" />
          خروجی
        </Button>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-12 text-center">
              <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">هنوز لاگی ثبت نشده</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 sticky top-0">
                <tr>
                  <th className="text-right p-3 font-medium">زمان</th>
                  <th className="text-right p-3 font-medium">ادمین</th>
                  <th className="text-right p-3 font-medium">عملیات</th>
                  <th className="text-right p-3 font-medium">هدف</th>
                  <th className="text-right p-3 font-medium">دلیل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-secondary/30">
                    <td className="p-3 text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString("fa-IR")}
                    </td>
                    <td className="p-3">
                      <span className="capitalize">{log.adminRole.replace("_", " ")}</span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-1 rounded bg-secondary text-xs capitalize">
                        {log.actionType.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-3 capitalize">{log.targetType.replace(/_/g, " ")}</td>
                    <td className="p-3 text-muted-foreground truncate max-w-[200px]">{log.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function MetricCard({ title, value, icon, trend, color }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend: string;
  color: "primary" | "green" | "amber" | "rose";
}) {
  const colors = {
    primary: "bg-primary/10 text-primary",
    green: "bg-green-500/10 text-green-500",
    amber: "bg-amber-500/10 text-amber-500",
    rose: "bg-rose-500/10 text-rose-500",
  };

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
        <div className="text-sm text-muted-foreground">{title}</div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{trend}</div>
    </div>
  );
}

function AlertBanner({ alert }: { alert: EconomicAlert }) {
  const severityConfig = {
    info: { bg: "bg-blue-500/10 border-blue-500/30", icon: <Info className="w-5 h-5 text-blue-500" /> },
    warning: { bg: "bg-amber-500/10 border-amber-500/30", icon: <AlertTriangle className="w-5 h-5 text-amber-500" /> },
    critical: { bg: "bg-rose-500/10 border-rose-500/30", icon: <AlertCircle className="w-5 h-5 text-rose-500" /> },
  };

  const config = severityConfig[alert.severity];

  return (
    <div className={`rounded-lg border p-4 flex items-start gap-3 ${config.bg}`}>
      {config.icon}
      <div className="flex-1">
        <div className="font-medium">{alert.title}</div>
        <div className="text-sm text-muted-foreground">{alert.message}</div>
      </div>
      <Button variant="ghost" size="sm">
        <CheckCircle className="w-4 h-4 ml-1" />
        تایید
      </Button>
    </div>
  );
}
