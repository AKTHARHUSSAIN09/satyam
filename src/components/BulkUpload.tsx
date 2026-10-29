import React, { useState, useRef } from 'react';
import { CourseIntake } from '../types';
import { performPreSubmissionDryRun } from '../services/validationEngine';
import {
  UploadCloud, FileText, CheckCircle2, AlertTriangle, Download,
  X, RefreshCw, FileCheck2, Table
} from 'lucide-react';

interface BulkUploadProps {
  courses: CourseIntake[];
  onCommitBatch: (validRowsCount: number, csvText: string) => void;
}

interface ParsedRow {
  rowNumber: number;
  apaarId: string;
  name: string;
  courseCode: string;
  quota: string;
  extraDoc: string;
  raw: string;
}

export const BulkUpload: React.FC<BulkUploadProps> = ({ courses, onCommitBatch }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [stage, setStage] = useState<'upload' | 'preview' | 'validated' | 'committed'>('upload');
  const [commitMsg, setCommitMsg] = useState('');
  const [dryRunResult, setDryRunResult] = useState<ReturnType<typeof performPreSubmissionDryRun> | null>(null);

  const TEMPLATE_CSV = `APAAR_ID,Student_Name,Course_Code,Quota,Passport_Visa_Ref
9812-4412-8819,Aarav Sharma,CSE-101,General,ADM-2026-001
7721-9034-1120,Tariq Ahmad Mir,AIML-102,PMSSS,ADM-2026-004
8819-2210-4491,Johnathan Doe,MBA-201,NRI,NRI-VISA-2026-441
5542-1190-7733,Amina Al-Mansoor,ECE-103,FN,MEA-VISA-FN-992`;

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.split('\n').filter(l => l.trim());
    const dataLines = lines[0]?.toLowerCase().includes('apaar') ? lines.slice(1) : lines;
    return dataLines.map((line, i) => {
      const parts = line.split(',').map(s => s.trim());
      return {
        rowNumber: i + 1,
        apaarId: parts[0] || '',
        name: parts[1] || '',
        courseCode: parts[2] || '',
        quota: parts[3] || '',
        extraDoc: parts[4] || '',
        raw: line
      };
    }).filter(r => r.apaarId || r.name);
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      alert('Please upload a CSV or TXT file.');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setCsvText(text);
      const rows = parseCSV(text);
      setParsedRows(rows);
      setStage('preview');
      setDryRunResult(null);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleValidate = () => {
    const lines = csvText.split('\n').filter(l => l.trim());
    const dataLines = lines[0]?.toLowerCase().includes('apaar') ? lines.slice(1) : lines;
    const result = performPreSubmissionDryRun(dataLines, courses);
    setDryRunResult(result);
    setStage('validated');
  };

  const handleCommit = () => {
    if (!dryRunResult) return;
    onCommitBatch(dryRunResult.validRows, csvText);
    setCommitMsg(`SUCCESS: ${dryRunResult.validRows} student records committed to AICTE Central Repository with signed receipt.`);
    setStage('committed');
  };

  const handleReset = () => {
    setFileName(null);
    setCsvText('');
    setParsedRows([]);
    setStage('upload');
    setDryRunResult(null);
    setCommitMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AICTE_APAAR_Bulk_Upload_Template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--navy-900)' }}>
            Bulk Student Data Upload
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
            Upload institution CSV files. File is parsed, validated, dry-run checked and committed to the national registry.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={downloadTemplate}>
            <Download size={14} /> Download CSV Template
          </button>
          {stage !== 'upload' && (
            <button className="btn btn-secondary btn-sm" onClick={handleReset}>
              <RefreshCw size={14} /> Start Over
            </button>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {(['upload', 'preview', 'validated', 'committed'] as const).map((s, i) => (
          <React.Fragment key={s}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%',
                backgroundColor: stage === s ? 'var(--navy-900)' : ['committed', 'validated', 'preview'].indexOf(stage) > ['committed', 'validated', 'preview', 'upload'].indexOf(s) - 1 ? 'var(--status-success)' : 'var(--slate-200)',
                color: stage === s || (['committed', 'validated', 'preview'].indexOf(stage) > ['committed', 'validated', 'preview', 'upload'].indexOf(s) - 1) ? '#fff' : 'var(--slate-500)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700
              }}>
                {i + 1}
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: stage === s ? 700 : 400, color: stage === s ? 'var(--navy-900)' : 'var(--slate-500)' }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
            </div>
            {i < 3 && <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--slate-200)' }} />}
          </React.Fragment>
        ))}
      </div>

      {/* Stage: Upload */}
      {stage === 'upload' && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? 'var(--navy-700)' : 'var(--slate-300)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '3rem 2rem',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: dragActive ? 'var(--navy-50)' : '#ffffff',
            transition: 'all 0.15s ease',
            marginBottom: '1.5rem'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            style={{ display: 'none' }}
            onChange={handleFileInput}
          />
          <UploadCloud size={40} color={dragActive ? 'var(--navy-700)' : 'var(--slate-400)'} style={{ margin: '0 auto 1rem' }} />
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--navy-900)', marginBottom: '0.35rem' }}>
            {dragActive ? 'Drop your CSV file here' : 'Drag & drop your CSV file, or click to browse'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
            Accepts: <span className="font-mono">.csv</span> files • Max 10,000 rows • UTF-8 encoded
          </div>
          <div style={{ marginTop: '1rem', padding: '0.5rem 1rem', display: 'inline-block', background: 'var(--slate-100)', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', color: 'var(--slate-600)' }}>
            Required columns: APAAR_ID, Student_Name, Course_Code, Quota, Passport_Visa_Ref
          </div>
        </div>
      )}

      {/* Stage: Preview */}
      {(stage === 'preview' || stage === 'validated' || stage === 'committed') && (
        <>
          {/* File Info Banner */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.85rem 1.25rem',
            background: 'var(--status-info-bg)',
            border: '1px solid var(--status-info-border)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FileText size={18} color="var(--status-info)" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--status-info)' }}>{fileName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-600)' }}>{parsedRows.length} student records parsed successfully</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {stage === 'preview' && (
                <button className="btn btn-primary" onClick={handleValidate}>
                  <FileCheck2 size={14} /> Run Validation & Dry-Run
                </button>
              )}
            </div>
          </div>

          {/* Parsed Data Preview Table */}
          {stage === 'preview' && (
            <div className="gov-card">
              <div className="gov-card-header">
                <div className="gov-card-title"><Table size={16} /> Parsed Record Preview ({parsedRows.length} rows)</div>
                <span className="badge badge-info">Review before validation</span>
              </div>
              <div className="gov-card-body" style={{ padding: 0 }}>
                <div className="table-container" style={{ border: 'none', borderRadius: 0, maxHeight: '400px', overflowY: 'auto' }}>
                  <table className="gov-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>APAAR ID</th>
                        <th>Student Name</th>
                        <th>Course Code</th>
                        <th>Quota</th>
                        <th>Extra Document</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map(row => (
                        <tr key={row.rowNumber}>
                          <td className="font-mono text-xs">{row.rowNumber}</td>
                          <td className="font-mono text-xs">{row.apaarId}</td>
                          <td>{row.name}</td>
                          <td><span className="badge badge-neutral">{row.courseCode}</span></td>
                          <td><span className="badge badge-neutral">{row.quota}</span></td>
                          <td className="font-mono text-xs">{row.extraDoc || <span style={{ color: 'var(--slate-400)' }}>—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Validation Results */}
          {(stage === 'validated' || stage === 'committed') && dryRunResult && (
            <>
              {/* Health Scorecard */}
              <div className="gov-card">
                <div className="gov-card-header">
                  <div className="gov-card-title"><FileCheck2 size={16} /> Validation Report</div>
                  <span className={`badge ${dryRunResult.dataHealthScore >= 90 ? 'badge-success' : dryRunResult.dataHealthScore >= 70 ? 'badge-warning' : 'badge-danger'}`}>
                    Data Health: {dryRunResult.dataHealthScore}%
                  </span>
                </div>
                <div className="gov-card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
                    {[
                      { label: 'Total Rows', value: dryRunResult.totalRowsProcessed, color: 'var(--navy-900)' },
                      { label: 'Valid Records', value: dryRunResult.validRows, color: 'var(--status-success)' },
                      { label: 'Invalid Records', value: dryRunResult.invalidRows, color: 'var(--status-danger)' },
                      { label: 'Data Health', value: `${dryRunResult.dataHealthScore}%`, color: dryRunResult.dataHealthScore >= 90 ? 'var(--status-success)' : dryRunResult.dataHealthScore >= 70 ? 'var(--status-warning)' : 'var(--status-danger)' }
                    ].map(stat => (
                      <div key={stat.label} style={{ padding: '0.85rem', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)', textTransform: 'uppercase' }}>{stat.label}</div>
                        <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Health bar */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div className="progress-bar-bg" style={{ height: '12px' }}>
                      <div
                        className={`progress-bar-fill ${dryRunResult.dataHealthScore >= 90 ? 'progress-healthy' : dryRunResult.dataHealthScore >= 70 ? 'progress-warning' : 'progress-danger'}`}
                        style={{ width: `${dryRunResult.dataHealthScore}%` }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>
                      <span>0% — Rejected</span>
                      <span style={{ color: 'var(--status-warning)' }}>70% — Warning</span>
                      <span style={{ color: 'var(--status-success)' }}>90% — Submission Ready</span>
                    </div>
                  </div>

                  {/* Errors */}
                  {dryRunResult.issues.length > 0 && (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy-900)', marginBottom: '0.5rem' }}>
                        Validation Issues ({dryRunResult.issues.length})
                      </div>
                      <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)' }}>
                        <table className="gov-table">
                          <thead>
                            <tr>
                              <th>Row</th>
                              <th>Field</th>
                              <th>Error</th>
                              <th>Fix</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dryRunResult.issues.map((issue, i) => (
                              <tr key={i}>
                                <td className="font-mono text-xs">{issue.rowNumber > 0 ? `Row ${issue.rowNumber}` : 'Batch'}</td>
                                <td className="font-mono text-xs">{issue.field}</td>
                                <td>
                                  <span className="badge badge-danger" style={{ fontSize: '0.62rem' }}>{issue.errorCode}</span>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--slate-700)', marginTop: '0.2rem' }}>{issue.message}</div>
                                </td>
                                <td style={{ fontSize: '0.72rem', color: 'var(--slate-600)' }}>{issue.suggestedFix}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Commit */}
                  {stage === 'validated' && (
                    <div style={{ borderTop: '1px solid var(--slate-200)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                        {dryRunResult.dataHealthScore >= 80
                          ? `${dryRunResult.validRows} records cleared for commit.`
                          : 'Minimum 80% data health required to commit.'}
                      </div>
                      <button
                        className="btn btn-primary"
                        disabled={dryRunResult.dataHealthScore < 80}
                        onClick={handleCommit}
                      >
                        <UploadCloud size={14} /> Commit {dryRunResult.validRows} Valid Records
                      </button>
                    </div>
                  )}

                  {/* Committed */}
                  {stage === 'committed' && commitMsg && (
                    <div style={{ padding: '0.85rem', background: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--status-success)' }}>
                      <CheckCircle2 size={16} /> {commitMsg}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
