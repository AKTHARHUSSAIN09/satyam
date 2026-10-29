import React, { useState } from 'react';
import {
  Institution, CourseIntake, StudentRecord, GhostEnrolmentFlag, AnomalyRecord
} from '../types';
import {
  BarChart2, Building2, ShieldAlert, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, Users, BookOpen, Globe, MapPin,
  Download, Eye, Filter, RefreshCw, Activity
} from 'lucide-react';
import { calculateIntakeStatus } from '../services/validationEngine';

interface CentralDashboardProps {
  institutions: Institution[];
  courses: CourseIntake[];
  students: StudentRecord[];
  ghostFlags: GhostEnrolmentFlag[];
  anomalies: AnomalyRecord[];
  onExportReport: (type: 'PDF' | 'CSV', section: string) => void;
}

const REGION_COLORS: Record<string, string> = {
  Northern: '#1d4ed8',
  Western: '#0891b2',
  Southern: '#059669',
  Eastern: '#d97706',
  'North-West': '#7c3aed',
  Central: '#b91c1c'
};

export const CentralDashboard: React.FC<CentralDashboardProps> = ({
  institutions,
  courses,
  students,
  ghostFlags,
  anomalies,
  onExportReport
}) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'institutions' | 'category' | 'alerts'>('overview');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');

  // Aggregate Metrics
  const totalSanctioned = institutions.reduce((s, i) => s + i.totalSanctioned, 0);
  const totalEnrolled = institutions.reduce((s, i) => s + i.totalEnrolled, 0);
  const totalExcess = institutions.filter(i => i.totalEnrolled > i.totalSanctioned).reduce(
    (s, i) => s + (i.totalEnrolled - i.totalSanctioned), 0
  );
  const overallUtilisation = Math.round((totalEnrolled / totalSanctioned) * 100);

  const activeAlerts = anomalies.filter(a => a.status === 'PENDING_OFFICER_REVIEW' || a.status === 'SHOW_CAUSE_ISSUED').length;
  const activeGhosts = ghostFlags.filter(f => f.status === 'DETECTED' || f.status === 'UNDER_REVIEW').length;
  const highRiskInstitutions = institutions.filter(i => i.trustScore < 70).length;

  // Category breakdown across all courses
  const categoryTotals = courses.reduce((acc, c) => {
    acc.general += c.enrolled.general + c.enrolled.obc + c.enrolled.sc_st + c.enrolled.ews;
    acc.tfws += c.enrolled.tfws;
    acc.pmsss += c.enrolled.pmsss;
    acc.nri += c.enrolled.nri;
    acc.oci += c.enrolled.oci;
    acc.fn += c.enrolled.fn;
    return acc;
  }, { general: 0, tfws: 0, pmsss: 0, nri: 0, oci: 0, fn: 0 });

  const filteredInstitutions = selectedRegion === 'ALL'
    ? institutions
    : institutions.filter(i => i.region === selectedRegion);

  const regions = Array.from(new Set(institutions.map(i => i.region)));

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--navy-900)' }}>
            AICTE Central Command Dashboard
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
            Consolidated national monitoring across all AICTE-approved institutions, programmes and admission categories.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => onExportReport('CSV', 'National Enrolment Summary')}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => onExportReport('PDF', 'National Enrolment Summary')}>
            <Download size={14} /> Export PDF
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {(['overview', 'institutions', 'category', 'alerts'] as const).map(sec => (
          <button
            key={sec}
            className={`btn btn-sm ${activeSection === sec ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveSection(sec)}
          >
            {sec === 'overview' && <Activity size={13} />}
            {sec === 'institutions' && <Building2 size={13} />}
            {sec === 'category' && <Users size={13} />}
            {sec === 'alerts' && <AlertTriangle size={13} />}
            {sec.charAt(0).toUpperCase() + sec.slice(1)}
          </button>
        ))}
      </div>

      {/* === OVERVIEW === */}
      {activeSection === 'overview' && (
        <>
          {/* National KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="metric-tile highlight">
              <div className="metric-title">
                <span>Total Approved Intake</span>
                <BookOpen size={14} color="var(--slate-400)" />
              </div>
              <div className="metric-value">{totalSanctioned.toLocaleString()}</div>
              <div className="metric-sub">{institutions.length} AICTE Institutions</div>
            </div>

            <div className={`metric-tile ${overallUtilisation > 100 ? 'danger' : overallUtilisation > 90 ? 'warning' : 'highlight'}`}>
              <div className="metric-title">
                <span>Actual Enrolment</span>
                <TrendingUp size={14} color="var(--status-warning)" />
              </div>
              <div className="metric-value font-mono">{totalEnrolled.toLocaleString()}</div>
              <div className="metric-sub" style={{ color: totalExcess > 0 ? 'var(--status-danger)' : 'var(--status-success)', fontWeight: 600 }}>
                {totalExcess > 0 ? `+${totalExcess} over-enrolled` : `${overallUtilisation}% utilisation`}
              </div>
            </div>

            <div className={`metric-tile ${activeAlerts > 0 ? 'warning' : 'highlight'}`}>
              <div className="metric-title">
                <span>Active Regulatory Alerts</span>
                <AlertTriangle size={14} color="var(--status-warning)" />
              </div>
              <div className="metric-value font-mono" style={{ color: activeAlerts > 0 ? 'var(--status-warning)' : 'var(--status-success)' }}>
                {activeAlerts}
              </div>
              <div className="metric-sub">{anomalies.length} total anomalies detected</div>
            </div>

            <div className={`metric-tile ${activeGhosts > 0 ? 'danger' : 'highlight'}`}>
              <div className="metric-title">
                <span>Ghost / Collision Flags</span>
                <ShieldAlert size={14} color="var(--status-danger)" />
              </div>
              <div className="metric-value font-mono" style={{ color: 'var(--status-danger)' }}>{activeGhosts}</div>
              <div className="metric-sub">{ghostFlags.length} total flags raised</div>
            </div>

            <div className={`metric-tile ${highRiskInstitutions > 0 ? 'danger' : 'highlight'}`}>
              <div className="metric-title">
                <span>High-Risk Institutions</span>
                <Building2 size={14} color="var(--status-danger)" />
              </div>
              <div className="metric-value font-mono" style={{ color: highRiskInstitutions > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                {highRiskInstitutions}
              </div>
              <div className="metric-sub">Trust Score below 70/100</div>
            </div>

            <div className="metric-tile highlight">
              <div className="metric-title">
                <span>Verified Students</span>
                <CheckCircle2 size={14} color="var(--status-success)" />
              </div>
              <div className="metric-value font-mono" style={{ color: 'var(--status-success)' }}>
                {students.filter(s => s.status === 'ACTIVE').length}
              </div>
              <div className="metric-sub">{students.length} total records</div>
            </div>
          </div>

          {/* National Utilisation Bar + Region Map */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Intake Utilisation by Programme */}
            <div className="gov-card">
              <div className="gov-card-header">
                <div className="gov-card-title"><BarChart2 size={16} /> Programme-wise Intake Utilisation</div>
                <span className="badge badge-neutral font-mono">ALL INSTITUTIONS</span>
              </div>
              <div className="gov-card-body">
                {courses.map(course => {
                  const stats = calculateIntakeStatus(course);
                  return (
                    <div key={course.courseId} style={{ marginBottom: '1.1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{course.courseName}</span>
                        <span className="font-mono" style={{ fontSize: '0.78rem' }}>
                          {stats.totalEnrolled}/{stats.totalCapacity}
                          <span style={{ marginLeft: '0.5rem', fontWeight: 700, color: stats.isBreached ? 'var(--status-danger)' : stats.isWarning ? 'var(--status-warning)' : 'var(--status-success)' }}>
                            {stats.totalPercentage}%
                          </span>
                        </span>
                      </div>
                      <div className="progress-bar-bg">
                        <div
                          className={`progress-bar-fill ${stats.isBreached ? 'progress-danger' : stats.isWarning ? 'progress-warning' : 'progress-healthy'}`}
                          style={{ width: `${Math.min(100, stats.totalPercentage)}%` }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--slate-500)' }}>
                          Sanctioned: {course.sanctionedIntake} | Supernumerary: {
                            course.approvedSupernumerary.tfws + course.approvedSupernumerary.pmsss +
                            course.approvedSupernumerary.nri + course.approvedSupernumerary.oci + course.approvedSupernumerary.fn
                          } | Remaining: {stats.availableSeats}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Institution Compliance Summary */}
            <div className="gov-card">
              <div className="gov-card-header">
                <div className="gov-card-title"><Globe size={16} /> Regional Institution Compliance</div>
              </div>
              <div className="gov-card-body">
                {regions.map(region => {
                  const regionInsts = institutions.filter(i => i.region === region);
                  const avgTrust = Math.round(regionInsts.reduce((s, i) => s + i.trustScore, 0) / regionInsts.length);
                  const hasRisk = regionInsts.some(i => i.totalEnrolled > i.totalSanctioned);
                  return (
                    <div key={region} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid var(--slate-100)' }}>
                      <div style={{
                        width: '10px', height: '10px', borderRadius: '50%',
                        backgroundColor: REGION_COLORS[region] || '#64748b',
                        flexShrink: 0
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{region} Region</span>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            {hasRisk && <span className="badge badge-danger" style={{ fontSize: '0.62rem' }}>EXCESS</span>}
                            <span className="font-mono" style={{ fontSize: '0.78rem', fontWeight: 700, color: avgTrust >= 90 ? 'var(--status-success)' : avgTrust >= 70 ? 'var(--status-warning)' : 'var(--status-danger)' }}>
                              Trust: {avgTrust}/100
                            </span>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>
                          {regionInsts.length} institution{regionInsts.length !== 1 ? 's' : ''} •{' '}
                          {regionInsts.reduce((s, i) => s + i.totalEnrolled, 0)} enrolled / {regionInsts.reduce((s, i) => s + i.totalSanctioned, 0)} sanctioned
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* === INSTITUTIONS === */}
      {activeSection === 'institutions' && (
        <div className="gov-card">
          <div className="gov-card-header">
            <div className="gov-card-title"><Building2 size={16} /> All Institution Enrolment Register</div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Filter size={14} color="var(--slate-500)" />
              <select
                value={selectedRegion}
                onChange={e => setSelectedRegion(e.target.value)}
                style={{ padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-300)', fontSize: '0.8rem' }}
              >
                <option value="ALL">All Regions</option>
                {regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <button className="btn btn-secondary btn-sm" onClick={() => onExportReport('CSV', 'Institution Register')}>
                <Download size={13} /> Export
              </button>
            </div>
          </div>
          <div className="gov-card-body" style={{ padding: 0 }}>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Institute Code</th>
                    <th>Institution Name</th>
                    <th>Region / State</th>
                    <th>Type</th>
                    <th>Sanctioned</th>
                    <th>Enrolled</th>
                    <th>Utilisation</th>
                    <th>Excess</th>
                    <th>Duplicate Alerts</th>
                    <th>Trust Score</th>
                    <th>Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInstitutions.map(inst => {
                    const util = Math.round((inst.totalEnrolled / inst.totalSanctioned) * 100);
                    const excess = inst.totalEnrolled - inst.totalSanctioned;
                    return (
                      <tr key={inst.id}>
                        <td className="font-mono text-xs">{inst.code}</td>
                        <td><strong>{inst.name}</strong></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: REGION_COLORS[inst.region] || '#64748b' }} />
                            {inst.region} ({inst.state})
                          </div>
                        </td>
                        <td><span className="badge badge-neutral">{inst.type}</span></td>
                        <td className="font-mono">{inst.totalSanctioned}</td>
                        <td className="font-mono">{inst.totalEnrolled}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '50px', height: '5px', background: 'var(--slate-200)', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${Math.min(100, util)}%`, height: '100%',
                                backgroundColor: util > 100 ? 'var(--status-danger)' : util > 90 ? 'var(--status-warning)' : 'var(--status-success)'
                              }} />
                            </div>
                            <span className="font-mono" style={{ fontSize: '0.78rem' }}>{util}%</span>
                          </div>
                        </td>
                        <td>
                          {excess > 0 ? (
                            <span className="badge badge-danger">+{excess}</span>
                          ) : (
                            <span className="badge badge-success">None</span>
                          )}
                        </td>
                        <td className="font-mono">
                          {inst.duplicateAlerts > 0 ? (
                            <span className="badge badge-warning">{inst.duplicateAlerts}</span>
                          ) : (
                            <span className="badge badge-success">0</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div style={{ width: '45px', height: '5px', background: 'var(--slate-200)', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${inst.trustScore}%`, height: '100%',
                                backgroundColor: inst.trustScore >= 90 ? 'var(--status-success)' : inst.trustScore >= 70 ? 'var(--status-warning)' : 'var(--status-danger)'
                              }} />
                            </div>
                            <span className="font-mono" style={{ fontSize: '0.78rem', fontWeight: 700 }}>{inst.trustScore}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${inst.trustGrade.startsWith('A') ? 'badge-success' : inst.trustGrade === 'B' ? 'badge-info' : 'badge-danger'}`}>
                            Grade {inst.trustGrade}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* === CATEGORY BREAKDOWN === */}
      {activeSection === 'category' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* National Category Distribution */}
          <div className="gov-card">
            <div className="gov-card-header">
              <div className="gov-card-title"><Users size={16} /> National Category Distribution</div>
              <button className="btn btn-secondary btn-sm" onClick={() => onExportReport('CSV', 'Category Distribution')}>
                <Download size={13} /> Export
              </button>
            </div>
            <div className="gov-card-body">
              {[
                { label: 'General / Reservation Categories', key: 'general', value: categoryTotals.general, color: 'var(--navy-700)', type: 'Sanctioned' },
                { label: 'TFWS (Tuition Fee Waiver)', key: 'tfws', value: categoryTotals.tfws, color: 'var(--status-purple)', type: 'Supernumerary' },
                { label: 'PMSSS (J&K / Ladakh Scheme)', key: 'pmsss', value: categoryTotals.pmsss, color: '#0891b2', type: 'Supernumerary' },
                { label: 'NRI (Non-Resident Indian)', key: 'nri', value: categoryTotals.nri, color: 'var(--status-warning)', type: 'Supernumerary' },
                { label: 'OCI (Overseas Citizen of India)', key: 'oci', value: categoryTotals.oci, color: '#7c3aed', type: 'Supernumerary' },
                { label: 'Foreign National (FN)', key: 'fn', value: categoryTotals.fn, color: '#d97706', type: 'Supernumerary' }
              ].map(cat => {
                const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0;
                return (
                  <div key={cat.key} style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--navy-900)' }}>{cat.label}</span>
                        <span className="badge badge-neutral" style={{ marginLeft: '0.4rem', fontSize: '0.62rem' }}>{cat.type}</span>
                      </div>
                      <span className="font-mono" style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                        {cat.value} <span style={{ color: 'var(--slate-400)', fontWeight: 400 }}>({pct}%)</span>
                      </span>
                    </div>
                    <div className="progress-bar-bg">
                      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: cat.color, borderRadius: '999px', transition: 'width 0.3s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per-Course Category Table */}
          <div className="gov-card">
            <div className="gov-card-header">
              <div className="gov-card-title"><BookOpen size={16} /> Programme-wise Category Breakdown</div>
            </div>
            <div className="gov-card-body" style={{ padding: 0 }}>
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>Programme</th>
                      <th>General</th>
                      <th>TFWS</th>
                      <th>PMSSS</th>
                      <th>NRI</th>
                      <th>OCI</th>
                      <th>FN</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map(c => {
                      const total = Object.values(c.enrolled).reduce((a, b) => a + b, 0);
                      return (
                        <tr key={c.courseId}>
                          <td>
                            <strong>{c.courseId}</strong>
                            <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>{c.courseName}</div>
                          </td>
                          <td className="font-mono">{c.enrolled.general + c.enrolled.obc + c.enrolled.sc_st + c.enrolled.ews}</td>
                          <td className="font-mono">{c.enrolled.tfws}/{c.approvedSupernumerary.tfws}</td>
                          <td className="font-mono">{c.enrolled.pmsss}/{c.approvedSupernumerary.pmsss}</td>
                          <td className="font-mono">
                            <span style={{ color: c.enrolled.nri > c.approvedSupernumerary.nri ? 'var(--status-danger)' : undefined }}>
                              {c.enrolled.nri}/{c.approvedSupernumerary.nri}
                            </span>
                          </td>
                          <td className="font-mono">{c.enrolled.oci}/{c.approvedSupernumerary.oci}</td>
                          <td className="font-mono">{c.enrolled.fn}/{c.approvedSupernumerary.fn}</td>
                          <td className="font-mono" style={{ fontWeight: 700 }}>{total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === ALERTS SUMMARY === */}
      {activeSection === 'alerts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Alert Summary Tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'Show-Cause Issued', count: anomalies.filter(a => a.status === 'SHOW_CAUSE_ISSUED').length, color: 'var(--status-danger)', bg: 'var(--status-danger-bg)' },
              { label: 'Pending Officer Review', count: anomalies.filter(a => a.status === 'PENDING_OFFICER_REVIEW').length, color: 'var(--status-warning)', bg: 'var(--status-warning-bg)' },
              { label: 'Justification Received', count: anomalies.filter(a => a.status === 'JUSTIFICATION_RECEIVED').length, color: 'var(--status-info)', bg: 'var(--status-info-bg)' },
              { label: 'Resolved', count: anomalies.filter(a => a.status === 'RESOLVED').length, color: 'var(--status-success)', bg: 'var(--status-success-bg)' }
            ].map(item => (
              <div key={item.label} style={{ padding: '1rem', background: item.bg, borderRadius: 'var(--radius-md)', border: `1px solid`, borderColor: item.bg }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: item.color, textTransform: 'uppercase' }}>{item.label}</div>
                <div className="font-mono" style={{ fontSize: '1.65rem', fontWeight: 800, color: item.color, marginTop: '0.25rem' }}>{item.count}</div>
              </div>
            ))}
          </div>

          {/* Anomaly Table */}
          <div className="gov-card">
            <div className="gov-card-header">
              <div className="gov-card-title"><AlertTriangle size={16} /> Active Regulatory Anomaly Register</div>
              <button className="btn btn-secondary btn-sm" onClick={() => onExportReport('CSV', 'Anomaly Register')}>
                <Download size={13} /> Export
              </button>
            </div>
            <div className="gov-card-body" style={{ padding: 0 }}>
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>Anomaly ID</th>
                      <th>Institution</th>
                      <th>Type</th>
                      <th>Severity</th>
                      <th>Detected</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anomalies.map(a => (
                      <tr key={a.id}>
                        <td className="font-mono text-xs">{a.id}</td>
                        <td><strong>{a.institutionName}</strong></td>
                        <td><span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>{a.anomalyType.replace(/_/g, ' ')}</span></td>
                        <td>
                          <span className={`badge ${a.severity === 'CRITICAL' ? 'badge-danger' : a.severity === 'HIGH' ? 'badge-warning' : 'badge-info'}`}>
                            {a.severity}
                          </span>
                        </td>
                        <td className="font-mono text-xs">{a.detectedOn}</td>
                        <td>
                          <span className={`badge ${a.status === 'SHOW_CAUSE_ISSUED' ? 'badge-danger' : a.status === 'RESOLVED' ? 'badge-success' : a.status === 'JUSTIFICATION_RECEIVED' ? 'badge-info' : 'badge-warning'}`}>
                            {a.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Ghost Flags Summary */}
          <div className="gov-card">
            <div className="gov-card-header">
              <div className="gov-card-title"><ShieldAlert size={16} /> Ghost Enrolment Collision Register</div>
              <button className="btn btn-secondary btn-sm" onClick={() => onExportReport('CSV', 'Ghost Flag Register')}>
                <Download size={13} /> Export
              </button>
            </div>
            <div className="gov-card-body" style={{ padding: 0 }}>
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>Flag ID</th>
                      <th>Student</th>
                      <th>APAAR</th>
                      <th>Flag Type</th>
                      <th>Primary Institution</th>
                      <th>Confidence</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ghostFlags.map(f => (
                      <tr key={f.id}>
                        <td className="font-mono text-xs">{f.id}</td>
                        <td><strong>{f.studentName}</strong></td>
                        <td className="font-mono text-xs">{f.apaarId}</td>
                        <td>
                          <span className={`badge ${f.flagType === 'SIMULTANEOUS_DUAL_REGULAR' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                            {f.flagType === 'SIMULTANEOUS_DUAL_REGULAR' ? 'Dual Regular' : 'Ghost Inactive'}
                          </span>
                        </td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.primaryCollege}
                        </td>
                        <td className="font-mono">{f.confidenceScore}%</td>
                        <td>
                          <span className={`badge ${f.status === 'DETECTED' ? 'badge-danger' : f.status === 'UNDER_REVIEW' ? 'badge-warning' : f.status === 'CLEARED' ? 'badge-success' : 'badge-neutral'}`}>
                            {f.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
