import React, { useState, useEffect } from 'react';
import {
  Globe, Code, Key, Activity, CheckCircle2, AlertTriangle,
  Copy, RefreshCw, Play, Lock, Database, FileText,
  Zap, Building2, BarChart2, X, ChevronDown, ChevronRight,
  Clock, Server, Wifi, WifiOff, Shield
} from 'lucide-react';

/* ─────────────── Types ─────────────── */
type ApiSection = 'endpoints' | 'connections' | 'keys' | 'log';
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
type SysStatus = 'CONNECTED' | 'DEGRADED' | 'OFFLINE';

interface ApiEndpoint {
  method: HttpMethod;
  path: string;
  description: string;
  auth: string;
  category: string;
  sampleResponse: string;
}

interface ConnectedSystem {
  id: string;
  name: string;
  type: string;
  status: SysStatus;
  latencyMs: number;
  lastSync: string;
  recordsExchanged: string;
  version: string;
}

interface ApiKeyEntry {
  id: string;
  name: string;
  prefix: string;
  permissions: string[];
  createdAt: string;
  lastUsed: string;
  status: 'ACTIVE' | 'REVOKED';
  requestsToday: number;
  rateLimit: string;
}

interface RequestLogEntry {
  id: string;
  timestamp: string;
  method: HttpMethod;
  endpoint: string;
  statusCode: number;
  latencyMs: number;
  actor: string;
  institution: string;
}

/* ─────────────── Mock Data ─────────────── */
const ENDPOINTS: ApiEndpoint[] = [
  {
    method: 'GET', path: '/api/v2/students', category: 'Student Records',
    description: 'List all verified student records with pagination and filtering support.',
    auth: 'Bearer Token (AICTE Officer / Institution Admin)',
    sampleResponse: `{\n  "data": [\n    { "id": "STU-8819", "apaarId": "9812-4412-8819", "status": "ACTIVE", "quota": "General" }\n  ],\n  "meta": { "total": 2166, "page": 1, "perPage": 100 }\n}`
  },
  {
    method: 'POST', path: '/api/v2/students', category: 'Student Records',
    description: 'Register a new student record. Triggers APAAR checksum validation, intake guard check and audit chain entry.',
    auth: 'Bearer Token (Institution Registrar)',
    sampleResponse: `{\n  "success": true,\n  "studentId": "STU-9021",\n  "verificationHash": "0xa3f8...",\n  "auditBlockNumber": 10485\n}`
  },
  {
    method: 'PUT', path: '/api/v2/students/{id}', category: 'Student Records',
    description: 'Update an existing student record. Only permitted fields are mutable; APAAR ID and institution are immutable.',
    auth: 'Bearer Token (Institution Registrar)',
    sampleResponse: `{\n  "success": true,\n  "updatedFields": ["quota", "academicYear"],\n  "auditBlockNumber": 10486\n}`
  },
  {
    method: 'POST', path: '/api/v2/students/bulk-upload', category: 'Bulk Upload',
    description: 'Upload a CSV file of student records. Runs pre-submission dry-run validation automatically. Returns a health score and issue list.',
    auth: 'Bearer Token (Institution Registrar)',
    sampleResponse: `{\n  "jobId": "BATCH-2026-441",\n  "dataHealthScore": 94,\n  "validRows": 182,\n  "invalidRows": 11,\n  "auditReceipt": "SHA256:0xf8a2..."\n}`
  },
  {
    method: 'GET', path: '/api/v2/students/bulk-upload/{jobId}', category: 'Bulk Upload',
    description: 'Check the status of a bulk upload job and retrieve the validation report.',
    auth: 'Bearer Token',
    sampleResponse: `{\n  "jobId": "BATCH-2026-441",\n  "status": "COMPLETED",\n  "committedAt": "2026-10-29T14:30:00+05:30"\n}`
  },
  {
    method: 'GET', path: '/api/v2/verify/{apaarId}', category: 'Verification',
    description: 'Verify a student enrolment status using their APAAR ID. Returns consented fields only (privacy-gated).',
    auth: 'Signed Verification Token (Employer / Third Party)',
    sampleResponse: `{\n  "verified": true,\n  "enrolmentStatus": "CONFIRMED_ACTIVE",\n  "programme": "B.Tech CSE",\n  "institution": "Delhi Institute of Engg.",\n  "consentExpiry": "2026-11-30"\n}`
  },
  {
    method: 'POST', path: '/api/v2/verify/pass/generate', category: 'Verification',
    description: 'Generate a new digitally signed, QR-linked Verifiable Student Pass with configurable consent fields and expiry.',
    auth: 'Bearer Token (Student Portal)',
    sampleResponse: `{\n  "passId": "VSP-2026-88191",\n  "signedToken": "eyJhbGciOiJFUzI1NiJ9...",\n  "qrPayload": "AICTE-VERIFY:VSP-2026-88191",\n  "expiresAt": "2026-11-30"\n}`
  },
  {
    method: 'POST', path: '/api/v2/verify/pass/revoke', category: 'Verification',
    description: 'Revoke an existing Verifiable Student Pass. Immediately invalidates QR-based third-party access.',
    auth: 'Bearer Token (Student Portal / AICTE Officer)',
    sampleResponse: `{\n  "success": true,\n  "passId": "VSP-2026-88191",\n  "revokedAt": "2026-10-29T16:45:00+05:30"\n}`
  },
  {
    method: 'GET', path: '/api/v2/intake/{institutionId}', category: 'Intake Guard',
    description: 'Retrieve real-time seat ledger for an institution across all programmes and quota categories.',
    auth: 'Bearer Token',
    sampleResponse: `{\n  "institutionId": "AICTE-DEL-101",\n  "programmes": [\n    { "courseId": "CSE-101", "sanctioned": 60, "enrolled": 57, "remaining": 3, "utilisation": 95 }\n  ]\n}`
  },
  {
    method: 'GET', path: '/api/v2/reports/enrolment', category: 'Reports',
    description: 'Fetch consolidated national enrolment statistics, intake utilisation and anomaly counts for regulatory reporting.',
    auth: 'Bearer Token (AICTE Officer)',
    sampleResponse: `{\n  "academicYear": "2026-27",\n  "totalSanctioned": 2160,\n  "totalEnrolled": 2166,\n  "overEnrolled": 6,\n  "ghostFlags": 3,\n  "anomalies": 4\n}`
  },
  {
    method: 'POST', path: '/api/v2/webhooks/register', category: 'Webhooks',
    description: 'Register an institutional webhook endpoint to receive real-time push notifications for enrolment events, anomaly flags and audit receipts.',
    auth: 'Bearer Token (Institution Admin)',
    sampleResponse: `{\n  "webhookId": "WH-DIEAT-441",\n  "events": ["STUDENT_ENROLLED", "ANOMALY_FLAGGED", "AUDIT_BLOCK_CREATED"],\n  "signingSecret": "whsec_..."\n}`
  },
  {
    method: 'GET', path: '/api/v2/audit/chain', category: 'Audit',
    description: 'Retrieve the tamper-evident audit chain blocks. Each block includes SHA-256 hash, previous hash and ECDSA signature receipt.',
    auth: 'Bearer Token (AICTE Officer)',
    sampleResponse: `{\n  "blocks": [\n    { "blockNumber": 10485, "dataHash": "0xa3f8...", "previousHash": "0x9bc2...", "signatureReceipt": "SIG-ECDSA-AICTE-10485" }\n  ]\n}`
  },
];

const CONNECTED_SYSTEMS: ConnectedSystem[] = [
  { id: 'SYS-001', name: 'Delhi Institute of Engg. & Advanced Technology', type: 'Institution ERP', status: 'CONNECTED', latencyMs: 44, lastSync: '2 min ago', recordsExchanged: '2,166', version: 'REST v2.4' },
  { id: 'SYS-002', name: 'Mumbai Maritime Institute', type: 'Institution ERP', status: 'CONNECTED', latencyMs: 61, lastSync: '5 min ago', recordsExchanged: '1,890', version: 'REST v2.4' },
  { id: 'SYS-003', name: 'Bangalore Polytechnic & Applied Sciences', type: 'Institution ERP', status: 'DEGRADED', latencyMs: 340, lastSync: '18 min ago', recordsExchanged: '1,440', version: 'REST v2.2' },
  { id: 'SYS-004', name: 'Kolkata Engineering College', type: 'Institution ERP', status: 'CONNECTED', latencyMs: 58, lastSync: '3 min ago', recordsExchanged: '960', version: 'REST v2.4' },
  { id: 'SYS-005', name: 'APAAR National Registry (MoE)', type: 'Government API', status: 'CONNECTED', latencyMs: 42, lastSync: '30 sec ago', recordsExchanged: '12.8M', version: 'REST v3.1' },
  { id: 'SYS-006', name: 'DigiLocker Platform (MeitY)', type: 'Government API', status: 'CONNECTED', latencyMs: 67, lastSync: '1 min ago', recordsExchanged: 'On-demand', version: 'REST v2.0' },
  { id: 'SYS-007', name: 'Academic Bank of Credits (ABC)', type: 'Government API', status: 'CONNECTED', latencyMs: 55, lastSync: '4 min ago', recordsExchanged: '8.2M', version: 'REST v1.8' },
  { id: 'SYS-008', name: 'National Academic Depository (NAD)', type: 'Government API', status: 'CONNECTED', latencyMs: 38, lastSync: '2 min ago', recordsExchanged: '5.1M', version: 'REST v2.1' },
];

const API_KEYS: ApiKeyEntry[] = [
  {
    id: 'KEY-001', name: 'DIEAT Primary Integration Key', prefix: 'aicte_live_dk9x',
    permissions: ['students:read', 'students:write', 'intake:read', 'bulk-upload:write'],
    createdAt: '2026-08-15', lastUsed: '2026-10-29 21:40 IST', status: 'ACTIVE',
    requestsToday: 847, rateLimit: '5000/hr'
  },
  {
    id: 'KEY-002', name: 'Mumbai Maritime Read-Only', prefix: 'aicte_live_mm3r',
    permissions: ['students:read', 'intake:read', 'reports:read'],
    createdAt: '2026-09-01', lastUsed: '2026-10-29 19:15 IST', status: 'ACTIVE',
    requestsToday: 312, rateLimit: '2000/hr'
  },
  {
    id: 'KEY-003', name: 'Employer Verifier — TechCorp India', prefix: 'aicte_pub_tc7v',
    permissions: ['verify:read'],
    createdAt: '2026-10-01', lastUsed: '2026-10-27 11:05 IST', status: 'ACTIVE',
    requestsToday: 22, rateLimit: '500/hr'
  },
  {
    id: 'KEY-004', name: 'Bangalore Polytechnic (Legacy)', prefix: 'aicte_live_bp2l',
    permissions: ['students:read', 'students:write', 'intake:read'],
    createdAt: '2026-04-10', lastUsed: '2026-10-28 14:30 IST', status: 'REVOKED',
    requestsToday: 0, rateLimit: 'Revoked'
  },
];

const REQUEST_LOG: RequestLogEntry[] = [
  { id: 'REQ-001', timestamp: '21:48:12', method: 'POST', endpoint: '/api/v2/students', statusCode: 201, latencyMs: 112, actor: 'REGISTRAR_DIEAT_101', institution: 'Delhi Institute of Engg.' },
  { id: 'REQ-002', timestamp: '21:46:55', method: 'GET', endpoint: '/api/v2/intake/AICTE-DEL-101', statusCode: 200, latencyMs: 44, actor: 'AICTE_HQ_MONITOR', institution: 'AICTE HQ' },
  { id: 'REQ-003', timestamp: '21:45:03', method: 'GET', endpoint: '/api/v2/verify/9812-4412-8819', statusCode: 200, latencyMs: 67, actor: 'EXT-VERIFIER-TC-441', institution: 'TechCorp India Ltd.' },
  { id: 'REQ-004', timestamp: '21:43:18', method: 'POST', endpoint: '/api/v2/students/bulk-upload', statusCode: 202, latencyMs: 891, actor: 'REGISTRAR_MM_202', institution: 'Mumbai Maritime Institute' },
  { id: 'REQ-005', timestamp: '21:41:44', method: 'GET', endpoint: '/api/v2/reports/enrolment', statusCode: 200, latencyMs: 203, actor: 'AICTE_HQ_CHAIRMAN', institution: 'AICTE HQ' },
  { id: 'REQ-006', timestamp: '21:39:22', method: 'PUT', endpoint: '/api/v2/students/STU-7721', statusCode: 200, latencyMs: 98, actor: 'REGISTRAR_DIEAT_101', institution: 'Delhi Institute of Engg.' },
  { id: 'REQ-007', timestamp: '21:37:11', method: 'POST', endpoint: '/api/v2/verify/pass/generate', statusCode: 201, latencyMs: 145, actor: 'STU-9812-4412-8819', institution: 'Student Portal' },
  { id: 'REQ-008', timestamp: '21:35:09', method: 'GET', endpoint: '/api/v2/audit/chain', statusCode: 200, latencyMs: 77, actor: 'AICTE_HQ_OFC-001', institution: 'AICTE HQ' },
  { id: 'REQ-009', timestamp: '21:32:44', method: 'POST', endpoint: '/api/v2/students', statusCode: 400, latencyMs: 31, actor: 'REGISTRAR_BP_303', institution: 'Bangalore Polytechnic' },
  { id: 'REQ-010', timestamp: '21:30:00', method: 'GET', endpoint: '/api/v2/students', statusCode: 200, latencyMs: 188, actor: 'AICTE_HQ_OFC-001', institution: 'AICTE HQ' },
];

/* ─────────────── Sub-component helpers ─────────────── */
const METHOD_COLORS: Record<HttpMethod, { bg: string; color: string }> = {
  GET:    { bg: '#eff6ff', color: '#1d4ed8' },
  POST:   { bg: '#ecfdf5', color: '#059669' },
  PUT:    { bg: '#fffbeb', color: '#b45309' },
  PATCH:  { bg: '#faf5ff', color: '#7c3aed' },
  DELETE: { bg: '#fef2f2', color: '#b91c1c' },
};

const MethodBadge: React.FC<{ method: HttpMethod }> = ({ method }) => {
  const c = METHOD_COLORS[method];
  return (
    <span className="font-mono" style={{
      padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
      backgroundColor: c.bg, color: c.color, border: `1px solid ${c.color}33`, minWidth: '52px',
      display: 'inline-block', textAlign: 'center'
    }}>
      {method}
    </span>
  );
};

const StatusDot: React.FC<{ status: SysStatus }> = ({ status }) => {
  const color = status === 'CONNECTED' ? 'var(--status-success)' : status === 'DEGRADED' ? 'var(--status-warning)' : 'var(--status-danger)';
  return <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />;
};

/* ─────────────── Main Component ─────────────── */
export const ApiIntegration: React.FC = () => {
  const [section, setSection] = useState<ApiSection>('endpoints');
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [refreshingConn, setRefreshingConn] = useState(false);
  const [connections, setConnections] = useState<ConnectedSystem[]>(CONNECTED_SYSTEMS);
  const [apiKeys, setApiKeys] = useState<ApiKeyEntry[]>(API_KEYS);
  const [revealKey, setRevealKey] = useState<string | null>(null);
  const [log] = useState<RequestLogEntry[]>(REQUEST_LOG);

  // Group endpoints by category
  const grouped = ENDPOINTS.reduce<Record<string, ApiEndpoint[]>>((acc, ep) => {
    if (!acc[ep.category]) acc[ep.category] = [];
    acc[ep.category].push(ep);
    return acc;
  }, {});

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestEndpoint = (ep: ApiEndpoint) => {
    setTestingEndpoint(ep.path);
    setTestResult(null);
    setTimeout(() => {
      setTestResult(ep.sampleResponse);
      setTestingEndpoint(null);
    }, 900);
  };

  const handleRefreshConnections = () => {
    setRefreshingConn(true);
    setTimeout(() => {
      setConnections(prev => prev.map(c => ({
        ...c,
        latencyMs: c.status === 'CONNECTED' ? c.latencyMs + Math.floor(Math.random() * 10) - 5 : c.latencyMs,
        lastSync: c.status === 'CONNECTED' ? 'just now' : c.lastSync,
      })));
      setRefreshingConn(false);
    }, 1000);
  };

  const handleRevokeKey = (id: string) => {
    setApiKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'REVOKED', requestsToday: 0 } : k));
  };

  const connectedCount = connections.filter(c => c.status === 'CONNECTED').length;
  const degradedCount = connections.filter(c => c.status === 'DEGRADED').length;

  const SECTION_TABS: { id: ApiSection; label: string; icon: React.ReactNode }[] = [
    { id: 'endpoints', label: 'API Endpoints', icon: <Code size={14} /> },
    { id: 'connections', label: 'Connections', icon: <Globe size={14} /> },
    { id: 'keys', label: 'API Keys', icon: <Key size={14} /> },
    { id: 'log', label: 'Request Log', icon: <Activity size={14} /> },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--navy-900)' }}>
            AICTE &amp; Institutional API Integration Centre
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
            Secure RESTful APIs for data exchange with institutional management systems and government registries. TLS 1.3 encrypted · Rate-limited · Audit-logged.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ padding: '0.4rem 0.85rem', background: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--status-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--status-success)' }} />
            API v2.4 Online
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Endpoints', value: ENDPOINTS.length, color: 'var(--navy-900)', cls: 'metric-tile highlight' },
          { label: 'Connected Systems', value: connectedCount, color: 'var(--status-success)', cls: 'metric-tile highlight' },
          { label: 'Degraded Systems', value: degradedCount, color: 'var(--status-warning)', cls: degradedCount > 0 ? 'metric-tile warning' : 'metric-tile' },
          { label: 'Active API Keys', value: apiKeys.filter(k => k.status === 'ACTIVE').length, color: 'var(--navy-900)', cls: 'metric-tile' },
          { label: 'Requests Today', value: log.length * 148, color: 'var(--navy-900)', cls: 'metric-tile' },
          { label: 'Avg. Latency', value: '68ms', color: 'var(--status-success)', cls: 'metric-tile highlight' },
        ].map(s => (
          <div key={s.label} className={s.cls}>
            <div className="metric-title"><span>{s.label}</span></div>
            <div className="metric-value font-mono" style={{ color: s.color, fontSize: '1.35rem' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Section Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {SECTION_TABS.map(t => (
          <button
            key={t.id}
            className={`btn btn-sm ${section === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setSection(t.id); setExpandedEndpoint(null); setTestResult(null); }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ─── ENDPOINTS ─── */}
      {section === 'endpoints' && (
        <div>
          {Object.entries(grouped).map(([category, eps]) => (
            <div key={category} className="gov-card" style={{ marginBottom: '1rem' }}>
              <div className="gov-card-header">
                <div className="gov-card-title">
                  <Code size={15} /> {category}
                </div>
                <span className="badge badge-neutral">{eps.length} endpoint{eps.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="gov-card-body" style={{ padding: 0 }}>
                {eps.map((ep, i) => {
                  const key = `${ep.method}:${ep.path}`;
                  const isOpen = expandedEndpoint === key;
                  return (
                    <div key={key} style={{ borderBottom: i < eps.length - 1 ? '1px solid var(--slate-100)' : undefined }}>
                      {/* Endpoint Row */}
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1.25rem', cursor: 'pointer', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--slate-50)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                        onClick={() => setExpandedEndpoint(isOpen ? null : key)}
                      >
                        <MethodBadge method={ep.method} />
                        <span className="font-mono" style={{ fontSize: '0.82rem', color: 'var(--navy-900)', fontWeight: 600, flex: 1 }}>{ep.path}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)', flex: 2, minWidth: 0 }}>{ep.description}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--slate-500)' }}>
                            <Lock size={11} /> <span>Auth</span>
                          </div>
                          {isOpen ? <ChevronDown size={14} color="var(--slate-400)" /> : <ChevronRight size={14} color="var(--slate-400)" />}
                        </div>
                      </div>

                      {/* Expanded Detail */}
                      {isOpen && (
                        <div style={{ padding: '0 1.25rem 1.25rem', background: 'var(--slate-50)', borderTop: '1px solid var(--slate-100)' }}>
                          <div style={{ paddingTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            {/* Left: Info */}
                            <div>
                              <div style={{ marginBottom: '0.85rem' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate-500)', marginBottom: '0.3rem' }}>Authorization Required</div>
                                <div style={{ padding: '0.5rem 0.75rem', background: 'var(--status-info-bg)', border: '1px solid var(--status-info-border)', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', color: 'var(--status-info)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <Shield size={13} /> {ep.auth}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate-500)', marginBottom: '0.3rem' }}>Description</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--slate-700)', lineHeight: 1.6 }}>{ep.description}</div>
                              </div>
                              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleTestEndpoint(ep)}
                                  disabled={testingEndpoint === ep.path}
                                >
                                  {testingEndpoint === ep.path
                                    ? <><span style={{ width: '11px', height: '11px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} /> Sending...</>
                                    : <><Play size={12} /> Try It Out</>
                                  }
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleCopy(`curl -X ${ep.method} "https://api.aicte-india.org${ep.path}" -H "Authorization: Bearer <TOKEN>"`, key)}
                                >
                                  {copiedKey === key ? <><CheckCircle2 size={12} /> Copied!</> : <><Copy size={12} /> Copy cURL</>}
                                </button>
                              </div>
                            </div>

                            {/* Right: Sample Response */}
                            <div>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate-500)', marginBottom: '0.3rem' }}>
                                {testResult && testingEndpoint !== ep.path ? 'Live Response' : 'Sample Response'}
                              </div>
                              <pre style={{
                                background: '#0b1a2e', color: '#a5f3fc', padding: '0.85rem', borderRadius: 'var(--radius-md)',
                                fontSize: '0.72rem', overflow: 'auto', maxHeight: '180px', lineHeight: 1.5,
                                border: '1px solid #234873', margin: 0
                              }}>
                                {testResult && testingEndpoint !== ep.path ? testResult : ep.sampleResponse}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── CONNECTIONS ─── */}
      {section === 'connections' && (
        <div>
          <div className="gov-card">
            <div className="gov-card-header">
              <div className="gov-card-title"><Globe size={16} /> Connected Institutional & Government Systems</div>
              <button className="btn btn-secondary btn-sm" onClick={handleRefreshConnections} disabled={refreshingConn}>
                <RefreshCw size={13} style={{ animation: refreshingConn ? 'spin 0.6s linear infinite' : undefined }} />
                {refreshingConn ? 'Pinging...' : 'Refresh Status'}
              </button>
            </div>
            <div className="gov-card-body" style={{ padding: 0 }}>
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>System / Institution</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Latency</th>
                      <th>Last Sync</th>
                      <th>Records Exchanged</th>
                      <th>API Version</th>
                    </tr>
                  </thead>
                  <tbody>
                    {connections.map(sys => (
                      <tr key={sys.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <StatusDot status={sys.status} />
                            <strong>{sys.name}</strong>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${sys.type === 'Government API' ? 'badge-purple' : 'badge-neutral'}`} style={{ fontSize: '0.65rem' }}>
                            {sys.type}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${sys.status === 'CONNECTED' ? 'badge-success' : sys.status === 'DEGRADED' ? 'badge-warning' : 'badge-danger'}`}>
                            {sys.status}
                          </span>
                        </td>
                        <td>
                          <span className="font-mono" style={{ fontSize: '0.78rem', color: sys.latencyMs > 200 ? 'var(--status-warning)' : 'var(--status-success)', fontWeight: 700 }}>
                            {sys.latencyMs}ms
                          </span>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>{sys.lastSync}</td>
                        <td className="font-mono" style={{ fontSize: '0.78rem' }}>{sys.recordsExchanged}</td>
                        <td>
                          <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{sys.version}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Webhook Config Panel */}
          <div className="gov-card">
            <div className="gov-card-header">
              <div className="gov-card-title"><Zap size={16} /> Webhook Event Configuration</div>
              <button className="btn btn-primary btn-sm"><Zap size={13} /> Register New Webhook</button>
            </div>
            <div className="gov-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {[
                  { event: 'STUDENT_ENROLLED', desc: 'Fires when a student record is successfully committed', active: true },
                  { event: 'ANOMALY_FLAGGED', desc: 'Fires when an anomaly is detected by the Anomaly Engine', active: true },
                  { event: 'AUDIT_BLOCK_CREATED', desc: 'Fires when a new immutable audit block is appended', active: true },
                  { event: 'INTAKE_WARNING', desc: 'Fires when intake utilisation crosses 90% threshold', active: true },
                  { event: 'GHOST_FLAG_RAISED', desc: 'Fires when a ghost enrolment collision is detected', active: false },
                  { event: 'PASS_REVOKED', desc: 'Fires when a Verifiable Student Pass is revoked', active: false },
                ].map(wh => (
                  <div key={wh.event} style={{ padding: '0.75rem', background: wh.active ? 'var(--status-success-bg)' : 'var(--slate-50)', border: `1px solid ${wh.active ? 'var(--status-success-border)' : 'var(--slate-200)'}`, borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span className="font-mono" style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--navy-900)' }}>{wh.event}</span>
                      <span className={`badge ${wh.active ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '0.6rem' }}>{wh.active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>{wh.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── API KEYS ─── */}
      {section === 'keys' && (
        <div>
          <div className="gov-card" style={{ marginBottom: '1.5rem' }}>
            <div className="gov-card-header">
              <div className="gov-card-title"><Key size={16} /> API Key Management</div>
              <button className="btn btn-primary btn-sm"><Key size={13} /> Generate New Key</button>
            </div>
            <div className="gov-card-body" style={{ padding: 0 }}>
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>Key Name</th>
                      <th>Key Prefix</th>
                      <th>Permissions</th>
                      <th>Rate Limit</th>
                      <th>Requests Today</th>
                      <th>Last Used</th>
                      <th>Created</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiKeys.map(k => (
                      <tr key={k.id} style={{ opacity: k.status === 'REVOKED' ? 0.6 : 1 }}>
                        <td><strong>{k.name}</strong></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--navy-900)' }}>
                              {revealKey === k.id ? `${k.prefix}••••••••••••` : `${k.prefix}••••`}
                            </span>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.15rem 0.4rem' }}
                              onClick={() => setRevealKey(revealKey === k.id ? null : k.id)}
                              disabled={k.status === 'REVOKED'}
                              title={revealKey === k.id ? 'Hide' : 'Reveal prefix'}
                            >
                              {revealKey === k.id ? <X size={10} /> : <Shield size={10} />}
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.15rem 0.4rem' }}
                              onClick={() => handleCopy(k.prefix + '••••••••••••', k.id)}
                              disabled={k.status === 'REVOKED'}
                              title="Copy"
                            >
                              {copiedKey === k.id ? <CheckCircle2 size={10} color="var(--status-success)" /> : <Copy size={10} />}
                            </button>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', maxWidth: '220px' }}>
                            {k.permissions.map(p => (
                              <span key={p} className="badge badge-neutral" style={{ fontSize: '0.6rem' }}>{p}</span>
                            ))}
                          </div>
                        </td>
                        <td className="font-mono" style={{ fontSize: '0.78rem' }}>{k.rateLimit}</td>
                        <td className="font-mono" style={{ fontSize: '0.78rem', color: k.requestsToday > 500 ? 'var(--status-warning)' : 'var(--navy-900)' }}>
                          {k.requestsToday.toLocaleString()}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{k.lastUsed}</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{k.createdAt}</td>
                        <td>
                          <span className={`badge ${k.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                            {k.status}
                          </span>
                        </td>
                        <td>
                          {k.status === 'ACTIVE' ? (
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ borderColor: 'var(--status-danger)', color: 'var(--status-danger)', fontSize: '0.7rem' }}
                              onClick={() => handleRevokeKey(k.id)}
                            >
                              <X size={11} /> Revoke
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: 'var(--slate-400)' }}>Revoked</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div style={{ padding: '1rem 1.25rem', background: 'var(--status-warning-bg)', border: '1px solid var(--status-warning-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--navy-900)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertTriangle size={16} color="var(--status-warning)" style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <strong>Security Notice:</strong> API keys are shown with partial prefix only. Full keys are displayed once at generation time and never stored in plaintext. Use HTTPS for all API calls. All requests are logged and associated with your officer or institution identity. Revoke compromised keys immediately.
            </div>
          </div>
        </div>
      )}

      {/* ─── REQUEST LOG ─── */}
      {section === 'log' && (
        <div className="gov-card">
          <div className="gov-card-header">
            <div className="gov-card-title"><Activity size={16} /> Live Request Log — Today (Showing last 10)</div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: 'var(--status-success)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--status-success)', fontWeight: 600 }}>Streaming</span>
            </div>
          </div>
          <div className="gov-card-body" style={{ padding: 0 }}>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Time (IST)</th>
                    <th>Method</th>
                    <th>Endpoint</th>
                    <th>Status</th>
                    <th>Latency</th>
                    <th>Actor</th>
                    <th>Institution</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map(entry => (
                    <tr key={entry.id}>
                      <td className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={11} color="var(--slate-400)" />
                          {entry.timestamp}
                        </div>
                      </td>
                      <td><MethodBadge method={entry.method} /></td>
                      <td className="font-mono" style={{ fontSize: '0.76rem', color: 'var(--navy-900)' }}>{entry.endpoint}</td>
                      <td>
                        <span style={{
                          padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                          backgroundColor: entry.statusCode < 300 ? 'var(--status-success-bg)' : entry.statusCode < 400 ? 'var(--status-warning-bg)' : 'var(--status-danger-bg)',
                          color: entry.statusCode < 300 ? 'var(--status-success)' : entry.statusCode < 400 ? 'var(--status-warning)' : 'var(--status-danger)',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          {entry.statusCode}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono" style={{ fontSize: '0.78rem', color: entry.latencyMs > 500 ? 'var(--status-warning)' : 'var(--status-success)', fontWeight: 600 }}>
                          {entry.latencyMs}ms
                        </span>
                      </td>
                      <td className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--slate-600)' }}>{entry.actor}</td>
                      <td style={{ fontSize: '0.78rem' }}>{entry.institution}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
    </div>
  );
};
