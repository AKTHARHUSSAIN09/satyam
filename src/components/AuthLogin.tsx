import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff, Lock, User, AlertTriangle, CheckCircle2, Building2, UserCheck, Search } from 'lucide-react';
import { ActiveRole } from './Navbar';

interface AuthUser {
  role: ActiveRole;
  name: string;
  email: string;
  institution?: string;
  badgeId: string;
  lastLogin: string;
}

const DEMO_ACCOUNTS: Record<string, { password: string; user: AuthUser }> = {
  'aicte.admin@aicte-india.org': {
    password: 'AICTE@2026',
    user: {
      role: 'AICTE_ADMIN',
      name: 'Dr. Rajendra Prasad Singh',
      email: 'aicte.admin@aicte-india.org',
      badgeId: 'AICTE-HQ-OFC-001',
      lastLogin: '2026-10-29 08:45 IST'
    }
  },
  'registrar@dieat.ac.in': {
    password: 'DIEAT@2026',
    user: {
      role: 'INSTITUTION_REGISTRAR',
      name: 'Prof. Sunita Mehta',
      email: 'registrar@dieat.ac.in',
      institution: 'Delhi Institute of Engineering & Advanced Technology',
      badgeId: 'INST-DIEAT-REG-101',
      lastLogin: '2026-10-29 09:30 IST'
    }
  },
  'aarav.sharma@student.dieat.ac.in': {
    password: 'Student@2026',
    user: {
      role: 'STUDENT_PORTAL',
      name: 'Aarav Sharma',
      email: 'aarav.sharma@student.dieat.ac.in',
      institution: 'Delhi Institute of Engineering & Advanced Technology',
      badgeId: 'STU-9812-4412-8819',
      lastLogin: '2026-10-28 14:20 IST'
    }
  },
  'verify@employer.com': {
    password: 'Verify@2026',
    user: {
      role: 'PUBLIC_VERIFIER',
      name: 'HR Portal — TechCorp India Ltd.',
      email: 'verify@employer.com',
      badgeId: 'EXT-VERIFIER-TC-441',
      lastLogin: '2026-10-27 11:05 IST'
    }
  }
};

const ROLE_INFO: Record<ActiveRole, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  AICTE_ADMIN: {
    label: 'AICTE Apex Regulatory HQ',
    icon: <ShieldCheck size={18} />,
    color: '#0b1a2e',
    description: 'Full regulatory oversight, anomaly adjudication, national dashboards'
  },
  INSTITUTION_REGISTRAR: {
    label: 'Institution Registrar',
    icon: <Building2 size={18} />,
    color: '#1d4ed8',
    description: 'Manage enrolments, bulk upload, intake management for your institution'
  },
  STUDENT_PORTAL: {
    label: 'Student Portal',
    icon: <UserCheck size={18} />,
    color: '#059669',
    description: 'View academic pass, manage consent, download credentials'
  },
  PUBLIC_VERIFIER: {
    label: 'Employer / Regulatory Verifier',
    icon: <Search size={18} />,
    color: '#7c3aed',
    description: 'Verify student enrolment records with APAAR ID or signed token'
  }
};

interface AuthLoginProps {
  onLogin: (user: AuthUser) => void;
}

export const AuthLogin: React.FC<AuthLoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDemoRole, setSelectedDemoRole] = useState<ActiveRole | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (loginAttempts >= 5) {
      setError('Account temporarily locked due to too many failed attempts. Please contact AICTE helpdesk.');
      return;
    }

    setIsLoading(true);

    // Simulate API auth check with 600ms delay
    setTimeout(() => {
      const account = DEMO_ACCOUNTS[email.toLowerCase().trim()];
      if (account && account.password === password) {
        setIsLoading(false);
        setLoginAttempts(0);
        onLogin(account.user);
      } else {
        setIsLoading(false);
        setLoginAttempts(prev => prev + 1);
        setError(`Invalid credentials. ${5 - loginAttempts - 1} attempts remaining before account lock.`);
      }
    }, 600);
  };

  const handleDemoLogin = (accountEmail: string) => {
    const account = DEMO_ACCOUNTS[accountEmail];
    if (account) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        onLogin(account.user);
      }, 400);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--navy-950)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Gov Top Banner */}
      <div style={{
        backgroundColor: '#06101e',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0.4rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.72rem',
        color: 'var(--slate-400)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontWeight: 600, color: '#93c5fd' }}>ALL INDIA COUNCIL FOR TECHNICAL EDUCATION</span>
          <span>|</span>
          <span>Ministry of Education, Government of India</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', display: 'flex', gap: '1rem' }}>
          <span>APAAR National Registry</span>
          <span className="badge badge-success" style={{ fontSize: '0.62rem' }}>SYSTEM ONLINE</span>
        </div>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        gap: '3rem',
        flexWrap: 'wrap'
      }}>
        {/* Left Branding Panel */}
        <div style={{ maxWidth: '420px', color: '#ffffff' }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '1.1rem', letterSpacing: '1px',
            marginBottom: '1.5rem'
          }}>
            AICTE
          </div>

          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '0.75rem', color: '#f8fafc' }}>
            SATYAM — APAAR Student Data Management & Verification System
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '2rem' }}>
            Secure, consent-gated academic identity verification portal. DPDP Act 2023 compliant with cryptographic audit trails.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(['AICTE_ADMIN', 'INSTITUTION_REGISTRAR', 'STUDENT_PORTAL', 'PUBLIC_VERIFIER'] as ActiveRole[]).map(role => (
              <div
                key={role}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  background: selectedDemoRole === role ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selectedDemoRole === role ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onClick={() => {
                  setSelectedDemoRole(role);
                  const entry = Object.entries(DEMO_ACCOUNTS).find(([, v]) => v.user.role === role);
                  if (entry) {
                    setEmail(entry[0]);
                    setPassword(entry[1].password);
                  }
                }}
              >
                <div style={{ color: '#93c5fd' }}>{ROLE_INFO[role].icon}</div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>{ROLE_INFO[role].label}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{ROLE_INFO[role].description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Login Card */}
        <div style={{
          width: '100%',
          maxWidth: '420px',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}>
          {/* Card Header */}
          <div style={{
            padding: '1.5rem 1.75rem',
            borderBottom: '1px solid var(--slate-200)',
            background: 'var(--navy-50)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <Lock size={18} color="var(--navy-900)" />
              <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy-900)' }}>
                Secure Portal Sign-In
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
              Authorized personnel only. All sessions are logged and audited.
            </p>
          </div>

          <div style={{ padding: '1.75rem' }}>
            {/* Security Notice */}
            <div style={{
              display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
              padding: '0.75rem 0.9rem',
              background: 'var(--status-info-bg)',
              border: '1px solid var(--status-info-border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              fontSize: '0.75rem',
              color: 'var(--status-info)'
            }}>
              <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <strong>Demo Mode:</strong> Click any role card on the left to auto-fill credentials, or enter manually below.
              </div>
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Email */}
              <div>
                <label style={{
                  display: 'block', fontSize: '0.775rem', fontWeight: 600,
                  color: 'var(--slate-700)', marginBottom: '0.35rem'
                }}>
                  Official Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} color="var(--slate-400)" style={{
                    position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)'
                  }} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@official.email"
                    required
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem 0.6rem 2.25rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--slate-300)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      fontFamily: 'var(--font-sans)'
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{
                  display: 'block', fontSize: '0.775rem', fontWeight: 600,
                  color: 'var(--slate-700)', marginBottom: '0.35rem'
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color="var(--slate-400)" style={{
                    position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)'
                  }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    style={{
                      width: '100%',
                      padding: '0.6rem 2.5rem 0.6rem 2.25rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--slate-300)',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)',
                      display: 'flex', alignItems: 'center'
                    }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  display: 'flex', gap: '0.5rem', alignItems: 'center',
                  padding: '0.65rem 0.85rem',
                  background: 'var(--status-danger-bg)',
                  border: '1px solid var(--status-danger-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.775rem',
                  color: 'var(--status-danger)'
                }}>
                  <AlertTriangle size={14} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
                style={{ padding: '0.7rem', fontSize: '0.875rem', marginTop: '0.25rem' }}
              >
                {isLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#ffffff', borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite'
                    }} />
                    Authenticating...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Lock size={15} /> Sign In Securely
                  </span>
                )}
              </button>
            </form>

            {/* Quick Demo Logins */}
            <div style={{ borderTop: '1px solid var(--slate-200)', marginTop: '1.5rem', paddingTop: '1.25rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.5px' }}>
                Quick Demo Access
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {Object.entries(DEMO_ACCOUNTS).map(([emailKey, acc]) => (
                  <button
                    key={emailKey}
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDemoLogin(emailKey)}
                    disabled={isLoading}
                    style={{ justifyContent: 'flex-start', gap: '0.4rem', fontSize: '0.72rem' }}
                  >
                    <div style={{ color: 'var(--navy-700)' }}>{ROLE_INFO[acc.user.role].icon}</div>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {acc.user.name.split(' ').slice(0, 2).join(' ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '0.85rem 1.75rem',
            background: 'var(--slate-50)',
            borderTop: '1px solid var(--slate-200)',
            fontSize: '0.7rem',
            color: 'var(--slate-500)',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>DPDP Act 2023 Compliant</span>
            <span className="font-mono">TLS 1.3 Encrypted</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export type { AuthUser };
