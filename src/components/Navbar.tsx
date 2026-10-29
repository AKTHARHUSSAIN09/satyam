import React from 'react';
import {
  ShieldCheck, Building2, UserCheck, Search, Activity,
  FileCheck2, BarChart2, Upload, Users, Download,
  Globe, Key, Database, LogOut
} from 'lucide-react';

/* ─────────────── Types ─────────────── */
export type ActiveRole =
  | 'AICTE_ADMIN'
  | 'INSTITUTION_REGISTRAR'
  | 'STUDENT_PORTAL'
  | 'PUBLIC_VERIFIER';

export type ActiveTab =
  | 'CENTRAL_DASHBOARD'
  | 'INTAKE_GUARD'
  | 'GHOST_RADAR'
  | 'ANOMALY_ENGINE'
  | 'STUDENT_RECORDS'
  | 'BULK_UPLOAD'
  | 'DRY_RUN'
  | 'DOC_VERIFY'
  | 'AUDIT_CHAIN'
  | 'REPORTS'
  | 'API_INTEGRATION'
  | 'STUDENT_PASS';

/* ─────────────── Tab Definitions ─────────────── */
interface TabDef {
  id: ActiveTab;
  label: string;
  icon: React.ReactNode;
  title: string;
}

const ALL_TABS: TabDef[] = [
  { id: 'CENTRAL_DASHBOARD', label: 'Central Dashboard', icon: <BarChart2 size={14} />, title: 'AICTE national consolidated monitoring across all institutions, programmes and categories' },
  { id: 'INTAKE_GUARD', label: 'Intake Guard', icon: <Activity size={14} />, title: 'Live seat ledger with category-wise tracking and hard intake blocks' },
  { id: 'GHOST_RADAR', label: 'Ghost Radar', icon: <ShieldCheck size={14} />, title: 'Cross-institution duplicate enrolment detection with hashed APAAR matching' },
  { id: 'ANOMALY_ENGINE', label: 'Anomaly Engine', icon: <Activity size={14} />, title: 'Explainable anomaly detection with institutional trust scores' },
  { id: 'STUDENT_RECORDS', label: 'Student Records', icon: <Users size={14} />, title: 'Create, view and update individual student records' },
  { id: 'BULK_UPLOAD', label: 'Bulk Upload', icon: <Upload size={14} />, title: 'Upload student CSV data in bulk with automatic validation' },
  { id: 'DRY_RUN', label: 'Pre-Submit Dry-Run', icon: <FileCheck2 size={14} />, title: 'Test-upload student records before official submission and get a Data Health Score' },
  { id: 'DOC_VERIFY', label: 'Doc Verify', icon: <FileCheck2 size={14} />, title: 'Verify student documents against APAAR, institutional records and trusted government sources' },
  { id: 'AUDIT_CHAIN', label: 'Audit Chain', icon: <Database size={14} />, title: 'Tamper-evident cryptographic audit log of all system actions' },
  { id: 'REPORTS', label: 'Reports', icon: <Download size={14} />, title: 'Generate and export regulatory reports in PDF and CSV formats' },
  { id: 'API_INTEGRATION', label: 'API Integration', icon: <Globe size={14} />, title: 'Manage secure APIs, connections, keys and request logs' },
  { id: 'STUDENT_PASS', label: 'Student Pass', icon: <UserCheck size={14} />, title: 'Consent-gated verifiable QR-based academic identity pass' },
];

/* ─────────────── Role → Tabs mapping ─────────────── */
const ROLE_TAB_IDS: Record<ActiveRole, ActiveTab[]> = {
  AICTE_ADMIN: [
    'CENTRAL_DASHBOARD', 'ANOMALY_ENGINE', 'GHOST_RADAR',
    'INTAKE_GUARD', 'DOC_VERIFY', 'AUDIT_CHAIN', 'REPORTS', 'API_INTEGRATION'
  ],
  INSTITUTION_REGISTRAR: [
    'INTAKE_GUARD', 'STUDENT_RECORDS', 'BULK_UPLOAD',
    'DRY_RUN', 'DOC_VERIFY', 'AUDIT_CHAIN', 'REPORTS'
  ],
  STUDENT_PORTAL: ['STUDENT_PASS'],
  PUBLIC_VERIFIER: ['STUDENT_PASS'],
};

/* ─────────────── Role display config ─────────────── */
const ROLE_CONFIG: Record<ActiveRole, { label: string; icon: React.ReactNode; color: string }> = {
  AICTE_ADMIN: { label: 'AICTE Apex Regulatory HQ', icon: <ShieldCheck size={15} />, color: 'var(--navy-900)' },
  INSTITUTION_REGISTRAR: { label: 'Institution Registrar', icon: <Building2 size={15} />, color: '#1d4ed8' },
  STUDENT_PORTAL: { label: 'Student Portal', icon: <UserCheck size={15} />, color: '#059669' },
  PUBLIC_VERIFIER: { label: 'Employer / Verifier', icon: <Search size={15} />, color: '#7c3aed' },
};

/* ─────────────── Props ─────────────── */
interface NavbarProps {
  activeRole: ActiveRole;
  onRoleChange: (role: ActiveRole) => void;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  userName?: string;
  onLogout?: () => void;
}

/* ─────────────── Component ─────────────── */
export const Navbar: React.FC<NavbarProps> = ({
  activeRole,
  onRoleChange,
  activeTab,
  onTabChange,
  userName,
  onLogout,
}) => {
  const visibleTabIds = ROLE_TAB_IDS[activeRole];
  const visibleTabs = ALL_TABS.filter(t => visibleTabIds.includes(t.id));
  const roleConf = ROLE_CONFIG[activeRole];

  const handleRoleChange = (role: ActiveRole) => {
    onRoleChange(role);
    // Auto-switch to first valid tab for the new role
    const firstTab = ROLE_TAB_IDS[role][0];
    onTabChange(firstTab);
  };

  return (
    <header className="main-header">
      {/* ── Gov Official Top Banner ── */}
      <div className="gov-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 600, color: '#93c5fd' }}>ALL INDIA COUNCIL FOR TECHNICAL EDUCATION</span>
          <span>|</span>
          <span>Ministry of Education, Government of India</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontFamily: 'var(--font-mono)' }}>
          <span>PLATFORM: SATYAM / AICTE-APAAR-2026</span>
          <span className="badge badge-success" style={{ fontSize: '0.62rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--status-success)' }} />
            REGISTRY ONLINE (99.98% SLA)
          </span>
        </div>
      </div>

      {/* ── Main Header Bar ── */}
      <div className="header-content">
        {/* Brand */}
        <div className="brand-section">
          <div className="aicte-emblem">SATYAM</div>
          <div>
            <div className="brand-title">SATYAM — Student Data Management &amp; Verification System</div>
            <div className="brand-subtitle">Automated Intake Audit · Cross-Institution Anomaly Detection · Verifiable Pass</div>
          </div>
        </div>

        {/* Right: Role Selector + User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {userName && (
            <div style={{ fontSize: '0.78rem', color: 'var(--slate-600)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <UserCheck size={13} color="var(--slate-500)" />
              <span style={{ fontWeight: 600 }}>{userName}</span>
            </div>
          )}

          {/* Role Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>View:</span>
            <div className="role-badge">
              <span style={{ color: roleConf.color }}>{roleConf.icon}</span>
              <select
                value={activeRole}
                onChange={e => handleRoleChange(e.target.value as ActiveRole)}
                style={{ border: 'none', background: 'transparent', fontWeight: 600, color: 'var(--navy-900)', cursor: 'pointer', outline: 'none', fontSize: '0.8rem' }}
              >
                <option value="AICTE_ADMIN">AICTE Apex Regulatory HQ</option>
                <option value="INSTITUTION_REGISTRAR">Institution Registrar (DIEAT Delhi)</option>
                <option value="STUDENT_PORTAL">Student Portal (Aarav Sharma)</option>
                <option value="PUBLIC_VERIFIER">Public / Employer Verification Desk</option>
              </select>
            </div>
          </div>

          {/* Logout */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="btn btn-secondary btn-sm"
              title="Sign out"
              style={{ gap: '0.35rem' }}
            >
              <LogOut size={13} /> Sign Out
            </button>
          )}
        </div>
      </div>

      {/* ── Navigation Tab Bar ── */}
      <div style={{ borderTop: '1px solid var(--slate-200)', backgroundColor: '#ffffff', padding: '0.4rem 2rem' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          {/* Scrollable nav tabs */}
          <nav
            className="nav-tabs"
            style={{ overflowX: 'auto', flexShrink: 1 }}
          >
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                className={`nav-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => onTabChange(tab.id)}
                title={tab.title}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Cycle info */}
          <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', display: 'flex', gap: '0.75rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
            <span>Cycle: <strong style={{ color: 'var(--slate-700)' }}>2026-27 Autumn</strong></span>
            <span>•</span>
            <span>Cut-off: <strong style={{ color: 'var(--slate-700)' }}>15 Nov 2026</strong></span>
          </div>
        </div>
      </div>
    </header>
  );
};
