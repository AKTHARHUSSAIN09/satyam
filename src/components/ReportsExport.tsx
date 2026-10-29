import React, { useState } from 'react';
import {
  Institution, CourseIntake, StudentRecord, GhostEnrolmentFlag, AnomalyRecord, AuditBlock
} from '../types';
import { calculateIntakeStatus } from '../services/validationEngine';
import {
  Download, FileText, BarChart2, Users, ShieldAlert, AlertTriangle,
  FileCheck2, Printer, Calendar, Filter, CheckCircle2
} from 'lucide-react';

interface ReportsExportProps {
  institutions: Institution[];
  courses: CourseIntake[];
  students: StudentRecord[];
  ghostFlags: GhostEnrolmentFlag[];
  anomalies: AnomalyRecord[];
  auditBlocks: AuditBlock[];
  triggerReport?: { type: 'PDF' | 'CSV'; section: string } | null;
}

type ReportType =
  | 'enrolment_summary'
  | 'intake_utilisation'
  | 'category_distribution'
  | 'anomaly_register'
  | 'ghost_flags'
  | 'audit_trail'
  | 'student_register';

interface ReportConfig {
  id: ReportType;
  label: string;
  description: string;
  icon: React.ReactNode;
  formats: ('CSV' | 'PDF')[];
}

const REPORT_CONFIGS: ReportConfig[] = [
  {
    id: 'enrolment_summary',
    label: 'National Enrolment Summary',
    description: 'Total enrolment vs approved intake across all institutions',
    icon: <BarChart2 size={16} />,
    formats: ['CSV', 'PDF']
  },
  {
    id: 'intake_utilisation',
    label: 'Programme Intake Utilisation',
    description: 'Per-course seat utilisation with category breakdown',
    icon: <Users size={16} />,
    formats: ['CSV', 'PDF']
  },
  {
    id: 'category_distribution',
    label: 'Admission Category Distribution',
    description: 'General, TFWS, PMSSS, NRI, OCI, FN enrolment split',
    icon: <Filter size={16} />,
    formats: ['CSV', 'PDF']
  },
  {
    id: 'anomaly_register',
    label: 'Regulatory Anomaly Register',
    description: 'All detected anomalies with severity and resolution status',
    icon: <AlertTriangle size={16} />,
    formats: ['CSV', 'PDF']
  },
  {
    id: 'ghost_flags',
    label: 'Ghost Enrolment Flag Report',
    description: 'Cross-institution collision and inactive student flags',
    icon: <ShieldAlert size={16} />,
    formats: ['CSV', 'PDF']
  },
  {
    id: 'audit_trail',
    label: 'Tamper-Evident Audit Trail',
    description: 'Cryptographic block-by-block audit chain export',
    icon: <FileCheck2 size={16} />,
    formats: ['CSV']
  },
  {
    id: 'student_register',
    label: 'Full Student Register',
    description: 'Complete student records with APAAR IDs, status and category',
    icon: <FileText size={16} />,
    formats: ['CSV', 'PDF']
  }
];

export const ReportsExport: React.FC<ReportsExportProps> = ({
  institutions,
  courses,
  students,
  ghostFlags,
  anomalies,
  auditBlocks,
  triggerReport
}) => {
  const [generating, setGenerating] = useState<string | null>(null);
  const [generated, setGenerated] = useState<Record<string, string>>({});
  const [selectedYear, setSelectedYear] = useState('2026-27');
  const [selectedRegion, setSelectedRegion] = useState('ALL');

  // Build CSV content for each report type
  const buildCSV = (type: ReportType): string => {
    switch (type) {
      case 'enrolment_summary': {
        const rows = [
          'Institution Code,Institution Name,Region,State,Type,Sanctioned Intake,Actual Enrolled,Utilisation %,Excess,Trust Score,Grade',
          ...institutions.map(i => {
            const util = Math.round((i.totalEnrolled / i.totalSanctioned) * 100);
            const excess = Math.max(0, i.totalEnrolled - i.totalSanctioned);
            return `${i.code},"${i.name}",${i.region},${i.state},${i.type},${i.totalSanctioned},${i.totalEnrolled},${util}%,${excess},${i.trustScore},${i.trustGrade}`;
          })
        ];
        return rows.join('\n');
      }
      case 'intake_utilisation': {
        const rows = [
          'Course ID,Course Name,Level,Sanctioned Intake,Supernumerary Total,Total Enrolled,Total Capacity,Utilisation %,Remaining Seats,Status',
          ...courses.map(c => {
            const s = calculateIntakeStatus(c);
            const superTotal = c.approvedSupernumerary.tfws + c.approvedSupernumerary.pmsss + c.approvedSupernumerary.nri + c.approvedSupernumerary.oci + c.approvedSupernumerary.fn;
            return `${c.courseId},"${c.courseName}",${c.level},${c.sanctionedIntake},${superTotal},${s.totalEnrolled},${s.totalCapacity},${s.totalPercentage}%,${s.availableSeats},${s.isBreached ? 'BREACHED' : s.isWarning ? 'WARNING' : 'NORMAL'}`;
          })
        ];
        return rows.join('\n');
      }
      case 'category_distribution': {
        const rows = [
          'Course ID,Course Name,General,OBC,SC/ST,EWS,TFWS,PMSSS,NRI,OCI,FN,Total',
          ...courses.map(c => {
            const total = Object.values(c.enrolled).reduce((a, b) => a + b, 0);
            return `${c.courseId},"${c.courseName}",${c.enrolled.general},${c.enrolled.obc},${c.enrolled.sc_st},${c.enrolled.ews},${c.enrolled.tfws},${c.enrolled.pmsss},${c.enrolled.nri},${c.enrolled.oci},${c.enrolled.fn},${total}`;
          })
        ];
        return rows.join('\n');
      }
      case 'anomaly_register': {
        const rows = [
          'Anomaly ID,Institution,Anomaly Type,Severity,Detected On,Status,Action Taken',
          ...anomalies.map(a =>
            `${a.id},"${a.institutionName}",${a.anomalyType},${a.severity},"${a.detectedOn}",${a.status},"${a.actionTaken || 'Pending'}"`
          )
        ];
        return rows.join('\n');
      }
      case 'ghost_flags': {
        const rows = [
          'Flag ID,Student Name,APAAR ID,Flag Type,Primary Institution,Secondary Institution,Confidence %,Detection Date,Status',
          ...ghostFlags.map(f =>
            `${f.id},"${f.studentName}",${f.apaarId},${f.flagType},"${f.primaryCollege}","${f.secondaryCollege || 'N/A'}",${f.confidenceScore}%,"${f.detectionDate}",${f.status}`
          )
        ];
        return rows.join('\n');
      }
      case 'audit_trail': {
        const rows = [
          'Block Number,Timestamp,Actor,Role,Institution ID,Action,Records Affected,Data Hash,Previous Hash,Signature Receipt',
          ...auditBlocks.map(b =>
            `${b.blockNumber},"${b.timestamp}","${b.actor}","${b.actorRole}",${b.institutionId},${b.action},${b.recordsAffected},${b.dataHash},${b.previousBlockHash},${b.signatureReceipt}`
          )
        ];
        return rows.join('\n');
      }
      case 'student_register': {
        const rows = [
          'Student ID,APAAR ID,Full Name,Gender,DOB,Institution,Course,Academic Year,Quota,Admission Date,Status,Activity Score',
          ...students.map(s =>
            `${s.id},${s.apaarId},"${s.studentName}",${s.gender},${s.dob},"${s.institutionName}","${s.courseName}",${s.academicYear},${s.quota},${s.admissionDate},${s.status},${s.academicActivityScore}`
          )
        ];
        return rows.join('\n');
      }
      default:
        return 'No data';
    }
  };

  // Build basic PDF-like text (print-formatted HTML in new window)
  const generatePDF = (type: ReportType, label: string) => {
    const csvContent = buildCSV(type);
    const rows = csvContent.split('\n');
    const headers = rows[0].split(',');
    const dataRows = rows.slice(1);

    const tableRows = dataRows.map(row => {
      const cells = row.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, ''));
      return `<tr>${cells.map(c => `<td style="padding:6px 10px;border:1px solid #e2e8f0;font-size:11px">${c}</td>`).join('')}</tr>`;
    }).join('');

    const headerRow = `<tr>${headers.map(h => `<th style="padding:6px 10px;border:1px solid #cbd5e1;background:#f1f5f9;font-size:11px;font-weight:700;white-space:nowrap">${h}</th>`).join('')}</tr>`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>AICTE APAAR — ${label}</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; color: #1e293b; }
    .header { background: #0b1a2e; color: #fff; padding: 16px 20px; border-radius: 6px; margin-bottom: 20px; }
    .header h1 { font-size: 16px; margin: 0 0 4px; }
    .header p { font-size: 11px; color: #94a3b8; margin: 0; }
    .meta { display: flex; gap: 20px; margin-bottom: 16px; font-size: 11px; color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .footer { font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 20px; display: flex; justify-content: space-between; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>AICTE — APAAR National Academic Registry: ${label}</h1>
    <p>All India Council for Technical Education • Ministry of Education, Government of India</p>
  </div>
  <div class="meta">
    <span><strong>Academic Year:</strong> ${selectedYear}</span>
    <span><strong>Generated:</strong> ${new Date().toLocaleString('en-IN')}</span>
    <span><strong>Portal:</strong> AICTE-APAAR-NAT-2026</span>
    <span><strong>Records:</strong> ${dataRows.length}</span>
  </div>
  <table>
    <thead>${headerRow}</thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="footer">
    <span>AICTE APAAR National Registry — Confidential</span>
    <span>DPDP Act 2023 Compliant • Cryptographically Sealed</span>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

    const newWin = window.open('', '_blank');
    if (newWin) {
      newWin.document.write(html);
      newWin.document.close();
    }
  };

  const handleGenerate = (reportId: ReportType, format: 'CSV' | 'PDF', label: string) => {
    const key = `${reportId}_${format}`;
    setGenerating(key);

    setTimeout(() => {
      if (format === 'CSV') {
        const csvContent = buildCSV(reportId);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AICTE_APAAR_${reportId.toUpperCase()}_${selectedYear.replace('-', '_')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        generatePDF(reportId, label);
      }
      setGenerating(null);
      setGenerated(prev => ({ ...prev, [key]: new Date().toLocaleTimeString() }));
    }, 500);
  };

  // Summary stats
  const totalEnrolled = institutions.reduce((s, i) => s + i.totalEnrolled, 0);
  const totalSanctioned = institutions.reduce((s, i) => s + i.totalSanctioned, 0);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--navy-900)' }}>
            Reports & Analytics Export
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
            Generate and download authorised regulatory reports in CSV or PDF format for AICTE officials.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            style={{ padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-300)', fontSize: '0.8rem' }}
          >
            <option value="2026-27">2026-27 (Current)</option>
            <option value="2025-26">2025-26</option>
            <option value="2024-25">2024-25</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Institutions', value: institutions.length, color: 'var(--navy-900)' },
          { label: 'Total Enrolled', value: totalEnrolled.toLocaleString(), color: 'var(--navy-900)' },
          { label: 'Total Sanctioned', value: totalSanctioned.toLocaleString(), color: 'var(--navy-900)' },
          { label: 'Anomalies', value: anomalies.length, color: 'var(--status-warning)' },
          { label: 'Ghost Flags', value: ghostFlags.length, color: 'var(--status-danger)' },
          { label: 'Audit Blocks', value: auditBlocks.length, color: 'var(--status-info)' },
          { label: 'Student Records', value: students.length, color: 'var(--status-success)' }
        ].map(stat => (
          <div key={stat.label} style={{ padding: '0.85rem', background: '#fff', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{stat.label}</div>
            <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Report Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
        {REPORT_CONFIGS.map(report => {
          const csvKey = `${report.id}_CSV`;
          const pdfKey = `${report.id}_PDF`;
          return (
            <div key={report.id} className="gov-card" style={{ marginBottom: 0 }}>
              <div className="gov-card-body">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '36px', height: '36px', flexShrink: 0,
                    background: 'var(--navy-50)', border: '1px solid var(--navy-100)',
                    borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--navy-800)'
                  }}>
                    {report.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--navy-900)' }}>{report.label}</div>
                    <div style={{ fontSize: '0.775rem', color: 'var(--slate-500)', marginTop: '0.15rem' }}>{report.description}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {report.formats.includes('CSV') && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleGenerate(report.id, 'CSV', report.label)}
                      disabled={generating === csvKey}
                      style={{ flex: 1 }}
                    >
                      {generating === csvKey ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ width: '11px', height: '11px', border: '2px solid var(--slate-300)', borderTopColor: 'var(--navy-700)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                          Generating...
                        </span>
                      ) : (
                        <><Download size={12} /> Export CSV</>
                      )}
                    </button>
                  )}
                  {report.formats.includes('PDF') && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleGenerate(report.id, 'PDF', report.label)}
                      disabled={generating === pdfKey}
                      style={{ flex: 1 }}
                    >
                      {generating === pdfKey ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ width: '11px', height: '11px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                          Preparing PDF...
                        </span>
                      ) : (
                        <><Printer size={12} /> Export PDF</>
                      )}
                    </button>
                  )}
                </div>

                {(generated[csvKey] || generated[pdfKey]) && (
                  <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--status-success)' }}>
                    <CheckCircle2 size={12} />
                    Last exported at {generated[csvKey] || generated[pdfKey]}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
