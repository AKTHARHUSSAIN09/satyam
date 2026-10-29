import React, { useState, useMemo } from 'react';
import { StudentRecord, Institution } from '../types';
import {
  FileCheck2, CheckCircle2, XCircle, Clock, AlertTriangle,
  Search, Filter, Eye, X, ShieldCheck, Download,
  FileText, Database, Globe, Building2, RefreshCw, UserCheck
} from 'lucide-react';

/* ─────────────── Types ─────────────── */
type VerStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'UNDER_REVIEW';

interface CheckItem {
  apaarMatch: VerStatus;
  institutionalRecord: VerStatus;
  documentSubmission: VerStatus;
  trustedSourceVerify: VerStatus;
}

interface VerRecord {
  studentId: string;
  apaarId: string;
  studentName: string;
  institutionName: string;
  courseName: string;
  academicYear: string;
  quota: string;
  isSupernumerary: boolean;
  overallStatus: VerStatus;
  checks: CheckItem;
  submittedOn: string;
  verifiedBy?: string;
  verificationNote?: string;
}

/* ─────────────── Derive records from students ─────────────── */
const deriveRecords = (students: StudentRecord[]): VerRecord[] =>
  students.map((s, i) => {
    let overall: VerStatus;
    let apaar: VerStatus;
    let inst: VerStatus;
    let doc: VerStatus;
    let trusted: VerStatus;

    if (s.status === 'ACTIVE' && s.academicActivityScore >= 80) {
      overall = 'VERIFIED'; apaar = 'VERIFIED'; inst = 'VERIFIED'; doc = 'VERIFIED'; trusted = 'VERIFIED';
    } else if (s.status === 'FLAGGED_DUPLICATE' || s.status === 'GHOST_FLAGGED') {
      overall = 'UNDER_REVIEW'; apaar = 'UNDER_REVIEW'; inst = 'PENDING'; doc = 'PENDING'; trusted = 'PENDING';
    } else if (s.status === 'EXCESS_ESCALATED') {
      overall = 'REJECTED'; apaar = 'VERIFIED'; inst = 'REJECTED'; doc = 'REJECTED'; trusted = 'REJECTED';
    } else if (i % 4 === 0) {
      overall = 'PENDING'; apaar = 'PENDING'; inst = 'PENDING'; doc = 'PENDING'; trusted = 'PENDING';
    } else {
      overall = 'VERIFIED'; apaar = 'VERIFIED'; inst = 'VERIFIED'; doc = 'VERIFIED'; trusted = 'VERIFIED';
    }

    return {
      studentId: s.id,
      apaarId: s.apaarId,
      studentName: s.studentName,
      institutionName: s.institutionName,
      courseName: s.courseName,
      academicYear: s.academicYear,
      quota: s.quota,
      isSupernumerary: s.isSupernumerary,
      overallStatus: overall,
      checks: { apaarMatch: apaar, institutionalRecord: inst, documentSubmission: doc, trustedSourceVerify: trusted },
      submittedOn: s.admissionDate,
      verifiedBy: overall === 'VERIFIED' ? 'AICTE-HQ-OFC-001' : undefined,
      verificationNote:
        overall === 'REJECTED' ? 'Excess admission: record does not match approved intake allocation.' :
        overall === 'UNDER_REVIEW' ? 'Possible duplicate enrolment flagged. Awaiting institutional clarification.' :
        overall === 'PENDING' ? 'Awaiting document submission and APAAR cross-check.' : undefined,
    };
  });

/* ─────────────── Helpers ─────────────── */
const STATUS_BADGE: Record<VerStatus, string> = {
  VERIFIED: 'badge-success',
  REJECTED: 'badge-danger',
  PENDING: 'badge-warning',
  UNDER_REVIEW: 'badge-info',
};

const StatusIcon: React.FC<{ status: VerStatus }> = ({ status }) => {
  if (status === 'VERIFIED') return <CheckCircle2 size={14} color="var(--status-success)" />;
  if (status === 'REJECTED') return <XCircle size={14} color="var(--status-danger)" />;
  if (status === 'UNDER_REVIEW') return <AlertTriangle size={14} color="var(--status-info)" />;
  return <Clock size={14} color="var(--status-warning)" />;
};

/* ─────────────── Props ─────────────── */
interface DocumentVerificationProps {
  students: StudentRecord[];
  institutions: Institution[];
  onVerifyRecord: (studentId: string, status: 'VERIFIED' | 'REJECTED', note: string) => void;
}

/* ─────────────── Component ─────────────── */
export const DocumentVerification: React.FC<DocumentVerificationProps> = ({
  students,
  institutions,
  onVerifyRecord,
}) => {
  const [records, setRecords] = useState<VerRecord[]>(() => deriveRecords(students));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<VerStatus | 'ALL'>('ALL');
  const [viewRecord, setViewRecord] = useState<VerRecord | null>(null);
  const [actionModal, setActionModal] = useState<{ record: VerRecord; action: 'VERIFIED' | 'REJECTED' } | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [batchSel, setBatchSel] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const applyAction = (studentId: string, action: 'VERIFIED' | 'REJECTED', note: string) => {
    setRecords(prev =>
      prev.map(r =>
        r.studentId === studentId
          ? {
              ...r,
              overallStatus: action,
              checks: {
                apaarMatch: action,
                institutionalRecord: action,
                documentSubmission: action,
                trustedSourceVerify: action,
              },
              verifiedBy: 'AICTE-HQ-OFC-001',
              verificationNote: note || (action === 'VERIFIED' ? 'All documents verified.' : 'Record rejected by AICTE officer.'),
            }
          : r
      )
    );
    onVerifyRecord(studentId, action, note);
  };

  const handleConfirmAction = () => {
    if (!actionModal) return;
    if (actionModal.action === 'REJECTED' && !actionNote.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }
    applyAction(actionModal.record.studentId, actionModal.action, actionNote);
    const msg = `${actionModal.record.studentName}'s record ${actionModal.action === 'VERIFIED' ? 'verified' : 'rejected'} and committed to audit chain.`;
    showToast(msg);
    setActionModal(null);
    setActionNote('');
  };

  const handleBatch = (action: 'VERIFIED' | 'REJECTED') => {
    Array.from(batchSel).forEach(id => applyAction(id, action, `Batch ${action.toLowerCase()} by AICTE officer.`));
    showToast(`${batchSel.size} records ${action === 'VERIFIED' ? 'verified' : 'rejected'} in batch.`);
    setBatchSel(new Set());
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRecords(deriveRecords(students));
      setRefreshing(false);
      showToast('Verification records refreshed from registry.');
    }, 800);
  };

  const filtered = useMemo(() =>
    records.filter(r => {
      const matchSearch =
        !search ||
        r.studentName.toLowerCase().includes(search.toLowerCase()) ||
        r.apaarId.includes(search) ||
        r.institutionName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || r.overallStatus === statusFilter;
      return matchSearch && matchStatus;
    }),
    [records, search, statusFilter]
  );

  const stats = useMemo(() => ({
    total: records.length,
    verified: records.filter(r => r.overallStatus === 'VERIFIED').length,
    pending: records.filter(r => r.overallStatus === 'PENDING').length,
    underReview: records.filter(r => r.overallStatus === 'UNDER_REVIEW').length,
    rejected: records.filter(r => r.overallStatus === 'REJECTED').length,
  }), [records]);

  const verifiedPct = stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--navy-900)' }}>
            Document &amp; Record Verification Centre
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
            Verify student records against APAAR national registry, institutional data and trusted government sources. All actions are immutably audit-logged.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {batchSel.size > 0 && (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => handleBatch('VERIFIED')}>
                <CheckCircle2 size={13} /> Batch Verify ({batchSel.size})
              </button>
              <button
                className="btn btn-secondary btn-sm"
                style={{ borderColor: 'var(--status-danger)', color: 'var(--status-danger)' }}
                onClick={() => handleBatch('REJECTED')}
              >
                <XCircle size={13} /> Batch Reject ({batchSel.size})
              </button>
            </>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.6s linear infinite' : undefined }} />
            Sync Registry
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem',
          backgroundColor: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)',
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--status-success)'
        }}>
          <CheckCircle2 size={14} /> {toast}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Records', value: stats.total, cls: 'metric-tile highlight', vc: 'var(--navy-900)' },
          { label: 'Verified', value: `${stats.verified} (${verifiedPct}%)`, cls: 'metric-tile highlight', vc: 'var(--status-success)' },
          { label: 'Pending Review', value: stats.pending, cls: 'metric-tile warning', vc: 'var(--status-warning)' },
          { label: 'Under Review', value: stats.underReview, cls: 'metric-tile', vc: 'var(--status-info)' },
          { label: 'Rejected', value: stats.rejected, cls: stats.rejected > 0 ? 'metric-tile danger' : 'metric-tile', vc: stats.rejected > 0 ? 'var(--status-danger)' : 'var(--navy-900)' },
        ].map(s => (
          <div key={s.label} className={s.cls}>
            <div className="metric-title"><span>{s.label}</span></div>
            <div className="metric-value" style={{ color: s.vc, fontSize: '1.35rem' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Verification Health Bar */}
      <div className="gov-card" style={{ marginBottom: '1.5rem' }}>
        <div className="gov-card-body" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--navy-900)' }}>
            <span>Overall Verification Completion</span>
            <span className="font-mono">{verifiedPct}%</span>
          </div>
          <div className="progress-bar-bg" style={{ height: '10px' }}>
            <div
              className={`progress-bar-fill ${verifiedPct >= 90 ? 'progress-healthy' : verifiedPct >= 70 ? 'progress-warning' : 'progress-danger'}`}
              style={{ width: `${verifiedPct}%` }}
            />
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--slate-500)' }}>
            <span><span style={{ color: 'var(--status-success)', fontWeight: 700 }}>●</span> Verified: {stats.verified}</span>
            <span><span style={{ color: 'var(--status-warning)', fontWeight: 700 }}>●</span> Pending: {stats.pending}</span>
            <span><span style={{ color: 'var(--status-info)', fontWeight: 700 }}>●</span> Under Review: {stats.underReview}</span>
            <span><span style={{ color: 'var(--status-danger)', fontWeight: 700 }}>●</span> Rejected: {stats.rejected}</span>
          </div>
        </div>
      </div>

      {/* Trusted Source Connections Panel */}
      <div className="gov-card" style={{ marginBottom: '1.5rem' }}>
        <div className="gov-card-header">
          <div className="gov-card-title"><ShieldCheck size={16} /> Trusted Source Verification Connections</div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-success)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--status-success)', fontWeight: 600 }}>All Systems Nominal</span>
          </div>
        </div>
        <div className="gov-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem' }}>
            {[
              { name: 'APAAR National Registry', status: 'CONNECTED', latency: '42ms', scope: '12.8M records', icon: <Database size={14} /> },
              { name: 'DigiLocker (MeitY)', status: 'CONNECTED', latency: '67ms', scope: 'On-demand docs', icon: <FileText size={14} /> },
              { name: 'ABC Academic Bank', status: 'CONNECTED', latency: '55ms', scope: '8.2M credits', icon: <Database size={14} /> },
              { name: 'NAD (National Academic Depository)', status: 'CONNECTED', latency: '38ms', scope: '5.1M awards', icon: <ShieldCheck size={14} /> },
              { name: 'MEA Passport Database', status: 'CONNECTED', latency: '91ms', scope: 'NRI / FN / OCI', icon: <Globe size={14} /> },
              { name: 'UIDAI (Aadhaar Auth)', status: 'PARTIAL', latency: '120ms', scope: 'Auth only (DPDP)', icon: <UserCheck size={14} /> },
            ].map(src => (
              <div key={src.name} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem',
                background: src.status === 'CONNECTED' ? 'var(--status-success-bg)' : 'var(--status-warning-bg)',
                border: `1px solid ${src.status === 'CONNECTED' ? 'var(--status-success-border)' : 'var(--status-warning-border)'}`,
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ color: src.status === 'CONNECTED' ? 'var(--status-success)' : 'var(--status-warning)', flexShrink: 0 }}>
                  {src.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--navy-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{src.name}</div>
                  <div style={{ fontSize: '0.67rem', color: 'var(--slate-500)' }}>{src.status} • {src.latency} • {src.scope}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="gov-card" style={{ marginBottom: '1rem' }}>
        <div className="gov-card-body" style={{ padding: '0.85rem 1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
              <Search size={14} color="var(--slate-400)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search by name, APAAR ID, institution..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-300)', fontSize: '0.8125rem' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Filter size={13} color="var(--slate-500)" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as VerStatus | 'ALL')}
                style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-300)', fontSize: '0.8125rem' }}
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="VERIFIED">Verified</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
              Showing <strong>{filtered.length}</strong> of <strong>{records.length}</strong> records
            </span>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="gov-card">
        <div className="gov-card-header">
          <div className="gov-card-title"><FileCheck2 size={16} /> Student Verification Register</div>
          <button className="btn btn-secondary btn-sm">
            <Download size={13} /> Export Report
          </button>
        </div>
        <div className="gov-card-body" style={{ padding: 0 }}>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="gov-table">
              <thead>
                <tr>
                  <th style={{ width: '36px' }}>
                    <input
                      type="checkbox"
                      title="Select all"
                      onChange={e => {
                        if (e.target.checked) setBatchSel(new Set(filtered.map(r => r.studentId)));
                        else setBatchSel(new Set());
                      }}
                      checked={batchSel.size === filtered.length && filtered.length > 0}
                    />
                  </th>
                  <th>APAAR ID</th>
                  <th>Student Name</th>
                  <th>Institution</th>
                  <th>Programme</th>
                  <th>Quota</th>
                  <th title="APAAR National Registry Match">APAAR</th>
                  <th title="Institutional Admission Record">Inst. Rec.</th>
                  <th title="Document Submission Completeness">Docs</th>
                  <th title="Trusted Source Cross-Verify">Trusted Src</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center', padding: '2rem', color: 'var(--slate-400)' }}>
                      No records match the current filter.
                    </td>
                  </tr>
                )}
                {filtered.map(rec => (
                  <tr key={rec.studentId} style={{ opacity: rec.overallStatus === 'REJECTED' ? 0.8 : 1 }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={batchSel.has(rec.studentId)}
                        onChange={() => {
                          setBatchSel(prev => {
                            const next = new Set(prev);
                            next.has(rec.studentId) ? next.delete(rec.studentId) : next.add(rec.studentId);
                            return next;
                          });
                        }}
                      />
                    </td>
                    <td className="font-mono text-xs">{rec.apaarId}</td>
                    <td><strong>{rec.studentName}</strong></td>
                    <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                      {rec.institutionName}
                    </td>
                    <td style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                      {rec.courseName}
                    </td>
                    <td>
                      <span className={`badge ${['NRI','OCI','FN'].includes(rec.quota) ? 'badge-info' : ['TFWS','PMSSS'].includes(rec.quota) ? 'badge-purple' : 'badge-neutral'}`}>
                        {rec.quota}
                      </span>
                    </td>
                    <td><StatusIcon status={rec.checks.apaarMatch} /></td>
                    <td><StatusIcon status={rec.checks.institutionalRecord} /></td>
                    <td><StatusIcon status={rec.checks.documentSubmission} /></td>
                    <td><StatusIcon status={rec.checks.trustedSourceVerify} /></td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[rec.overallStatus]}`} style={{ fontSize: '0.62rem' }}>
                        {rec.overallStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setViewRecord(rec)}
                          title="View detail"
                        >
                          <Eye size={12} />
                        </button>
                        {rec.overallStatus !== 'VERIFIED' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => { setActionModal({ record: rec, action: 'VERIFIED' }); setActionNote(''); }}
                            title="Verify"
                          >
                            <CheckCircle2 size={12} />
                          </button>
                        )}
                        {rec.overallStatus !== 'REJECTED' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ borderColor: 'var(--status-danger)', color: 'var(--status-danger)' }}
                            onClick={() => { setActionModal({ record: rec, action: 'REJECTED' }); setActionNote(''); }}
                            title="Reject"
                          >
                            <XCircle size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {viewRecord && (
        <div className="modal-overlay" onClick={() => setViewRecord(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px' }}>
            <div className="gov-card-header">
              <div className="gov-card-title">
                <FileCheck2 size={16} /> Verification Detail — {viewRecord.studentName}
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setViewRecord(null)}><X size={14} /></button>
            </div>
            <div className="gov-card-body">
              {/* Identity Banner */}
              <div style={{
                padding: '1rem', background: 'var(--navy-50)', border: '1px solid var(--navy-100)',
                borderRadius: 'var(--radius-md)', marginBottom: '1.25rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--slate-500)', textTransform: 'uppercase' }}>APAAR National ID</div>
                  <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy-900)', letterSpacing: '1px' }}>{viewRecord.apaarId}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-600)', marginTop: '0.15rem' }}>{viewRecord.institutionName} · {viewRecord.academicYear}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`badge ${STATUS_BADGE[viewRecord.overallStatus]}`} style={{ fontSize: '0.72rem' }}>
                    {viewRecord.overallStatus.replace('_', ' ')}
                  </span>
                  {viewRecord.verifiedBy && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--slate-500)', marginTop: '0.3rem' }}>by {viewRecord.verifiedBy}</div>
                  )}
                </div>
              </div>

              {/* Checklist */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy-900)', marginBottom: '0.75rem' }}>
                  Verification Checklist
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {[
                    {
                      label: 'APAAR ID Match — National Registry',
                      sub: 'Cross-referenced with DigiLocker ABC Ledger and APAAR Central Database',
                      status: viewRecord.checks.apaarMatch,
                      icon: <Database size={15} />,
                    },
                    {
                      label: 'Institutional Record Verification',
                      sub: 'Admission register, enrolment letter, fee receipt confirmed',
                      status: viewRecord.checks.institutionalRecord,
                      icon: <Building2 size={15} />,
                    },
                    {
                      label: 'Document Submission Completeness',
                      sub: '10th/12th marksheet, category certificate, passport/visa (NRI/OCI/FN)',
                      status: viewRecord.checks.documentSubmission,
                      icon: <FileText size={15} />,
                    },
                    {
                      label: 'Trusted Source Cross-Verification',
                      sub: 'Verified via NAD, UIDAI Auth, MEA Passport DB (where applicable)',
                      status: viewRecord.checks.trustedSourceVerify,
                      icon: <Globe size={15} />,
                    },
                  ].map(chk => {
                    const bg = chk.status === 'VERIFIED' ? 'var(--status-success-bg)' : chk.status === 'REJECTED' ? 'var(--status-danger-bg)' : chk.status === 'UNDER_REVIEW' ? 'var(--status-info-bg)' : 'var(--status-warning-bg)';
                    const border = chk.status === 'VERIFIED' ? 'var(--status-success-border)' : chk.status === 'REJECTED' ? 'var(--status-danger-border)' : chk.status === 'UNDER_REVIEW' ? 'var(--status-info-border)' : 'var(--status-warning-border)';
                    return (
                      <div key={chk.label} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.75rem 1rem', background: bg, border: `1px solid ${border}`, borderRadius: 'var(--radius-md)' }}>
                        <div style={{ color: chk.status === 'VERIFIED' ? 'var(--status-success)' : chk.status === 'REJECTED' ? 'var(--status-danger)' : 'var(--status-warning)', flexShrink: 0 }}>{chk.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--navy-900)' }}>{chk.label}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>{chk.sub}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <StatusIcon status={chk.status} />
                          <span className={`badge ${STATUS_BADGE[chk.status]}`} style={{ fontSize: '0.62rem' }}>{chk.status.replace('_', ' ')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Note */}
              {viewRecord.verificationNote && (
                <div style={{ padding: '0.75rem 1rem', background: 'var(--status-warning-bg)', border: '1px solid var(--status-warning-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--navy-900)', marginBottom: '1rem' }}>
                  <strong>Officer Note:</strong> {viewRecord.verificationNote}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                {viewRecord.overallStatus !== 'VERIFIED' && (
                  <button className="btn btn-primary" onClick={() => { setViewRecord(null); setActionModal({ record: viewRecord, action: 'VERIFIED' }); setActionNote(''); }}>
                    <CheckCircle2 size={14} /> Verify Record
                  </button>
                )}
                {viewRecord.overallStatus !== 'REJECTED' && (
                  <button
                    className="btn btn-secondary"
                    style={{ borderColor: 'var(--status-danger)', color: 'var(--status-danger)' }}
                    onClick={() => { setViewRecord(null); setActionModal({ record: viewRecord, action: 'REJECTED' }); setActionNote(''); }}
                  >
                    <XCircle size={14} /> Reject Record
                  </button>
                )}
                <button className="btn btn-secondary" onClick={() => setViewRecord(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Action Confirm Modal ── */}
      {actionModal && (
        <div className="modal-overlay" onClick={() => setActionModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="gov-card-header">
              <div className="gov-card-title">
                {actionModal.action === 'VERIFIED'
                  ? <><CheckCircle2 size={16} color="var(--status-success)" /> Confirm Verification</>
                  : <><XCircle size={16} color="var(--status-danger)" /> Confirm Rejection</>
                }
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setActionModal(null)}><X size={14} /></button>
            </div>
            <div className="gov-card-body">
              <div style={{ padding: '0.85rem', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.82rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--navy-900)' }}>{actionModal.record.studentName}</div>
                <div style={{ color: 'var(--slate-600)', marginTop: '0.15rem' }}>
                  APAAR: <span className="font-mono">{actionModal.record.apaarId}</span> · {actionModal.record.institutionName}
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.35rem' }}>
                  {actionModal.action === 'REJECTED' ? 'Rejection Reason *' : 'Verification Note (optional)'}
                </label>
                <textarea
                  value={actionNote}
                  onChange={e => setActionNote(e.target.value)}
                  placeholder={actionModal.action === 'VERIFIED'
                    ? 'Add a note (optional)...'
                    : 'State the reason for rejection (mandatory)...'}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-300)', fontSize: '0.8125rem', resize: 'vertical', minHeight: '80px', fontFamily: 'var(--font-sans)' }}
                />
              </div>
              <div style={{ padding: '0.65rem 0.85rem', background: 'var(--status-info-bg)', border: '1px solid var(--status-info-border)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--status-info)', marginBottom: '1rem' }}>
                This action will be immutably committed to the tamper-evident audit chain and is logged against your officer ID.
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  style={actionModal.action === 'REJECTED' ? { backgroundColor: 'var(--status-danger)', borderColor: '#991b1b' } : {}}
                  onClick={handleConfirmAction}
                >
                  {actionModal.action === 'VERIFIED'
                    ? <><CheckCircle2 size={14} /> Confirm Verification</>
                    : <><XCircle size={14} /> Confirm Rejection</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
