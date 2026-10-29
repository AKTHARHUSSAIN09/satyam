import React, { useState, useMemo } from 'react';
import { StudentRecord, QuotaCategory } from '../types';
import {
  Edit3, Plus, Search, Filter, CheckCircle2, AlertTriangle,
  Save, X, Eye, UserCheck, Download, RefreshCw
} from 'lucide-react';
import { validateApaarChecksum } from '../services/validationEngine';

interface StudentRecordManagerProps {
  students: StudentRecord[];
  onUpdateStudent: (updated: StudentRecord) => void;
  onAddStudent: (student: Omit<StudentRecord, 'id' | 'hashedId' | 'verificationHash'>) => { success: boolean; message: string };
}

const STATUS_OPTIONS: StudentRecord['status'][] = ['ACTIVE', 'FLAGGED_DUPLICATE', 'GHOST_FLAGGED', 'EXCESS_ESCALATED'];
const QUOTA_OPTIONS: QuotaCategory[] = ['General', 'OBC', 'SC_ST', 'EWS', 'TFWS', 'PMSSS', 'NRI', 'OCI', 'FN'];

export const StudentRecordManager: React.FC<StudentRecordManagerProps> = ({
  students,
  onUpdateStudent,
  onAddStudent
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<StudentRecord>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [viewStudent, setViewStudent] = useState<StudentRecord | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    apaarId: '',
    studentName: '',
    gender: 'Male' as StudentRecord['gender'],
    dob: '',
    institutionId: 'AICTE-DEL-101',
    institutionName: 'Delhi Institute of Engineering & Advanced Technology',
    courseId: 'CSE-101',
    courseName: 'B.Tech - Computer Science & Engineering',
    academicYear: '2026-27',
    quota: 'General' as QuotaCategory,
    admissionDate: new Date().toISOString().slice(0, 10),
    passportVisaNumber: ''
  });
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  const filtered = useMemo(() => {
    return students.filter(s => {
      const matchSearch = !search ||
        s.studentName.toLowerCase().includes(search.toLowerCase()) ||
        s.apaarId.includes(search) ||
        s.id.includes(search) ||
        s.courseId.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [students, search, statusFilter]);

  const startEdit = (student: StudentRecord) => {
    setEditingId(student.id);
    setEditForm({ ...student });
    setEditErrors({});
    setSaveMessage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setEditErrors({});
  };

  const validateEdit = (): boolean => {
    const errors: Record<string, string> = {};
    if (!editForm.studentName?.trim()) errors.studentName = 'Student name is required';
    if (!editForm.apaarId?.trim()) errors.apaarId = 'APAAR ID is required';
    const clean = (editForm.apaarId || '').replace(/[^0-9]/g, '');
    if (clean.length !== 12) errors.apaarId = 'APAAR ID must be 12 digits';
    else if (!validateApaarChecksum(clean)) errors.apaarId = 'Invalid APAAR checksum (Verhoeff validation failed)';
    if (!editForm.dob) errors.dob = 'Date of birth is required';
    if (!editForm.admissionDate) errors.admissionDate = 'Admission date is required';
    if ((editForm.quota === 'NRI' || editForm.quota === 'OCI' || editForm.quota === 'FN') && !editForm.passportVisaNumber?.trim()) {
      errors.passportVisaNumber = 'Passport/Visa number required for NRI/OCI/FN quota';
    }
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveEdit = () => {
    if (!validateEdit()) return;
    const student = students.find(s => s.id === editingId);
    if (!student) return;
    const updated: StudentRecord = {
      ...student,
      ...editForm,
      isSupernumerary: editForm.quota !== 'General' && editForm.quota !== 'EWS' && editForm.quota !== 'OBC' && editForm.quota !== 'SC_ST'
    } as StudentRecord;
    onUpdateStudent(updated);
    setSaveMessage({ type: 'success', text: `Record for ${updated.studentName} updated successfully and committed to audit chain.` });
    setEditingId(null);
    setEditForm({});
    setTimeout(() => setSaveMessage(null), 4000);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');

    const clean = addForm.apaarId.replace(/[^0-9]/g, '');
    if (clean.length !== 12) { setAddError('APAAR ID must be exactly 12 digits'); return; }
    if (!validateApaarChecksum(clean)) { setAddError('APAAR checksum validation failed (Verhoeff algorithm)'); return; }
    if (!addForm.studentName.trim()) { setAddError('Student name is required'); return; }
    if (!addForm.dob) { setAddError('Date of birth is required'); return; }
    if ((addForm.quota === 'NRI' || addForm.quota === 'OCI' || addForm.quota === 'FN') && !addForm.passportVisaNumber.trim()) {
      setAddError('Passport/Visa number required for NRI/OCI/FN quota');
      return;
    }

    const result = onAddStudent({
      apaarId: addForm.apaarId,
      studentName: addForm.studentName,
      gender: addForm.gender,
      dob: addForm.dob,
      institutionId: addForm.institutionId,
      institutionName: addForm.institutionName,
      courseId: addForm.courseId,
      courseName: addForm.courseName,
      academicYear: addForm.academicYear,
      quota: addForm.quota,
      admissionDate: addForm.admissionDate,
      isSupernumerary: !['General', 'EWS', 'OBC', 'SC_ST'].includes(addForm.quota),
      status: 'ACTIVE',
      academicActivityScore: 100,
      daysSinceLastActivity: 0,
      passportVisaNumber: addForm.passportVisaNumber || undefined
    });

    if (result.success) {
      setAddSuccess(result.message);
      setShowAddForm(false);
      setAddForm(prev => ({ ...prev, apaarId: '', studentName: '', dob: '', passportVisaNumber: '' }));
    } else {
      setAddError(result.message);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--navy-900)' }}>
            Student Record Management
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
            View, create and update student records. All changes are cryptographically logged to the audit chain.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus size={14} /> Add New Student
          </button>
        </div>
      </div>

      {/* Success / Save Message */}
      {saveMessage && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem',
          backgroundColor: saveMessage.type === 'success' ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
          border: `1px solid ${saveMessage.type === 'success' ? 'var(--status-success-border)' : 'var(--status-danger-border)'}`,
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontSize: '0.82rem', color: saveMessage.type === 'success' ? 'var(--status-success)' : 'var(--status-danger)'
        }}>
          <CheckCircle2 size={15} /> {saveMessage.text}
        </div>
      )}

      {/* Add Student Form */}
      {showAddForm && (
        <div className="gov-card">
          <div className="gov-card-header">
            <div className="gov-card-title"><Plus size={16} /> Register New Student Record</div>
            <button className="btn btn-secondary btn-sm" onClick={() => { setShowAddForm(false); setAddError(''); setAddSuccess(''); }}>
              <X size={14} /> Cancel
            </button>
          </div>
          <div className="gov-card-body">
            <form onSubmit={handleAddSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.25rem' }}>
                    APAAR ID (12 digits) *
                  </label>
                  <input
                    type="text"
                    className="font-mono"
                    placeholder="xxxx-xxxx-xxxx"
                    value={addForm.apaarId}
                    onChange={e => setAddForm(p => ({ ...p, apaarId: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-300)', fontSize: '0.8125rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.25rem' }}>
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    value={addForm.studentName}
                    onChange={e => setAddForm(p => ({ ...p, studentName: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-300)', fontSize: '0.8125rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.25rem' }}>
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    value={addForm.dob}
                    onChange={e => setAddForm(p => ({ ...p, dob: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-300)', fontSize: '0.8125rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.25rem' }}>
                    Gender *
                  </label>
                  <select
                    value={addForm.gender}
                    onChange={e => setAddForm(p => ({ ...p, gender: e.target.value as StudentRecord['gender'] }))}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-300)', fontSize: '0.8125rem' }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.25rem' }}>
                    Programme Code *
                  </label>
                  <select
                    value={addForm.courseId}
                    onChange={e => setAddForm(p => ({
                      ...p, courseId: e.target.value,
                      courseName: e.target.options[e.target.selectedIndex].dataset.name || p.courseName
                    }))}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-300)', fontSize: '0.8125rem' }}
                  >
                    <option value="CSE-101" data-name="B.Tech - Computer Science & Engineering">CSE-101 — B.Tech CSE</option>
                    <option value="AIML-102" data-name="B.Tech - Artificial Intelligence & Machine Learning">AIML-102 — B.Tech AIML</option>
                    <option value="ECE-103" data-name="B.Tech - Electronics & Communication Engineering">ECE-103 — B.Tech ECE</option>
                    <option value="MBA-201" data-name="Post Graduate Diploma in Management (PGDM / MBA)">MBA-201 — MBA/PGDM</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.25rem' }}>
                    Admission Quota *
                  </label>
                  <select
                    value={addForm.quota}
                    onChange={e => setAddForm(p => ({ ...p, quota: e.target.value as QuotaCategory }))}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-300)', fontSize: '0.8125rem' }}
                  >
                    {QUOTA_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.25rem' }}>
                    Admission Date *
                  </label>
                  <input
                    type="date"
                    value={addForm.admissionDate}
                    onChange={e => setAddForm(p => ({ ...p, admissionDate: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-300)', fontSize: '0.8125rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.25rem' }}>
                    Academic Year
                  </label>
                  <input
                    type="text"
                    value={addForm.academicYear}
                    onChange={e => setAddForm(p => ({ ...p, academicYear: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-300)', fontSize: '0.8125rem' }}
                  />
                </div>
                {(addForm.quota === 'NRI' || addForm.quota === 'OCI' || addForm.quota === 'FN') && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.25rem' }}>
                      Passport / Visa Reference *
                    </label>
                    <input
                      type="text"
                      className="font-mono"
                      placeholder="MEA-VISA-..."
                      value={addForm.passportVisaNumber}
                      onChange={e => setAddForm(p => ({ ...p, passportVisaNumber: e.target.value }))}
                      style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-300)', fontSize: '0.8125rem' }}
                    />
                  </div>
                )}
              </div>

              {addError && (
                <div style={{ padding: '0.65rem', background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--status-danger)', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <AlertTriangle size={14} /> {addError}
                </div>
              )}
              {addSuccess && (
                <div style={{ padding: '0.65rem', background: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--status-success)', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <CheckCircle2 size={14} /> {addSuccess}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  <Plus size={14} /> Register Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="gov-card">
        <div className="gov-card-body" style={{ padding: '0.85rem 1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
              <Search size={15} color="var(--slate-400)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search by name, APAAR ID, course..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-300)', fontSize: '0.8125rem'
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Filter size={14} color="var(--slate-500)" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-300)', fontSize: '0.8125rem' }}
              >
                <option value="ALL">All Status</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
              Showing <strong>{filtered.length}</strong> of <strong>{students.length}</strong> records
            </span>
          </div>
        </div>
      </div>

      {/* Student Records Table */}
      <div className="gov-card">
        <div className="gov-card-body" style={{ padding: 0 }}>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="gov-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>APAAR ID</th>
                  <th>Name</th>
                  <th>Programme</th>
                  <th>Year</th>
                  <th>Quota</th>
                  <th>Admission Date</th>
                  <th>Status</th>
                  <th>Activity Score</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(student => (
                  <React.Fragment key={student.id}>
                    <tr style={{ backgroundColor: editingId === student.id ? 'var(--navy-50)' : undefined }}>
                      <td className="font-mono text-xs">{student.id}</td>
                      <td className="font-mono text-xs">{student.apaarId}</td>
                      <td>
                        {editingId === student.id ? (
                          <div>
                            <input
                              type="text"
                              value={editForm.studentName || ''}
                              onChange={e => setEditForm(p => ({ ...p, studentName: e.target.value }))}
                              style={{ width: '150px', padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${editErrors.studentName ? 'var(--status-danger)' : 'var(--slate-300)'}`, fontSize: '0.8rem' }}
                            />
                            {editErrors.studentName && <div style={{ fontSize: '0.65rem', color: 'var(--status-danger)' }}>{editErrors.studentName}</div>}
                          </div>
                        ) : (
                          <strong>{student.studentName}</strong>
                        )}
                      </td>
                      <td>
                        {editingId === student.id ? (
                          <select
                            value={editForm.courseId || ''}
                            onChange={e => setEditForm(p => ({ ...p, courseId: e.target.value }))}
                            style={{ padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-300)', fontSize: '0.8rem' }}
                          >
                            <option value="CSE-101">CSE-101</option>
                            <option value="AIML-102">AIML-102</option>
                            <option value="ECE-103">ECE-103</option>
                            <option value="MBA-201">MBA-201</option>
                          </select>
                        ) : (
                          student.courseId
                        )}
                      </td>
                      <td>
                        {editingId === student.id ? (
                          <input
                            type="text"
                            value={editForm.academicYear || ''}
                            onChange={e => setEditForm(p => ({ ...p, academicYear: e.target.value }))}
                            style={{ width: '80px', padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-300)', fontSize: '0.8rem' }}
                          />
                        ) : student.academicYear}
                      </td>
                      <td>
                        {editingId === student.id ? (
                          <select
                            value={editForm.quota || ''}
                            onChange={e => setEditForm(p => ({ ...p, quota: e.target.value as QuotaCategory }))}
                            style={{ padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-300)', fontSize: '0.8rem' }}
                          >
                            {QUOTA_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                          </select>
                        ) : (
                          <span className={`badge ${['NRI', 'OCI', 'FN'].includes(student.quota) ? 'badge-info' : ['TFWS', 'PMSSS'].includes(student.quota) ? 'badge-purple' : 'badge-neutral'}`}>
                            {student.quota}
                          </span>
                        )}
                      </td>
                      <td>
                        {editingId === student.id ? (
                          <input
                            type="date"
                            value={editForm.admissionDate || ''}
                            onChange={e => setEditForm(p => ({ ...p, admissionDate: e.target.value }))}
                            style={{ padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${editErrors.admissionDate ? 'var(--status-danger)' : 'var(--slate-300)'}`, fontSize: '0.8rem' }}
                          />
                        ) : student.admissionDate}
                      </td>
                      <td>
                        {editingId === student.id ? (
                          <select
                            value={editForm.status || ''}
                            onChange={e => setEditForm(p => ({ ...p, status: e.target.value as StudentRecord['status'] }))}
                            style={{ padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-300)', fontSize: '0.8rem' }}
                          >
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                          </select>
                        ) : (
                          <span className={`badge ${student.status === 'ACTIVE' ? 'badge-success' : student.status === 'FLAGGED_DUPLICATE' ? 'badge-danger' : student.status === 'GHOST_FLAGGED' ? 'badge-warning' : 'badge-neutral'}`}>
                            {student.status.replace(/_/g, ' ')}
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ width: '40px', height: '5px', background: 'var(--slate-200)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${student.academicActivityScore}%`, height: '100%',
                              backgroundColor: student.academicActivityScore >= 70 ? 'var(--status-success)' : student.academicActivityScore >= 30 ? 'var(--status-warning)' : 'var(--status-danger)'
                            }} />
                          </div>
                          <span className="font-mono" style={{ fontSize: '0.78rem' }}>{student.academicActivityScore}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          {editingId === student.id ? (
                            <>
                              <button className="btn btn-primary btn-sm" onClick={saveEdit}>
                                <Save size={12} /> Save
                              </button>
                              <button className="btn btn-secondary btn-sm" onClick={cancelEdit}>
                                <X size={12} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button className="btn btn-secondary btn-sm" onClick={() => startEdit(student)} title="Edit record">
                                <Edit3 size={12} />
                              </button>
                              <button className="btn btn-secondary btn-sm" onClick={() => setViewStudent(student)} title="View details">
                                <Eye size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View Student Modal */}
      {viewStudent && (
        <div className="modal-overlay" onClick={() => setViewStudent(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px' }}>
            <div className="gov-card-header">
              <div className="gov-card-title">
                <UserCheck size={18} color="var(--navy-800)" />
                <span>Student Record Detail — {viewStudent.studentName}</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setViewStudent(null)}><X size={14} /></button>
            </div>
            <div className="gov-card-body">
              {/* Institutional Student ID + APAAR */}
              <div style={{
                padding: '1rem', background: 'var(--navy-50)', border: '1px solid var(--navy-100)',
                borderRadius: 'var(--radius-md)', marginBottom: '1.25rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--slate-500)', textTransform: 'uppercase' }}>Institutional Student ID</div>
                  <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy-900)' }}>{viewStudent.id}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--slate-500)', textTransform: 'uppercase' }}>APAAR National ID</div>
                  <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy-900)', letterSpacing: '1px' }}>{viewStudent.apaarId}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`badge ${viewStudent.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                    {viewStudent.status.replace(/_/g, ' ')}
                  </span>
                  {viewStudent.isSupernumerary && <div><span className="badge badge-purple" style={{ marginTop: '0.35rem', fontSize: '0.65rem' }}>Supernumerary</span></div>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {[
                  ['Full Name', viewStudent.studentName],
                  ['Gender', viewStudent.gender],
                  ['Date of Birth', viewStudent.dob],
                  ['Institution', viewStudent.institutionName],
                  ['Programme', viewStudent.courseName],
                  ['Course Code', viewStudent.courseId],
                  ['Academic Year', viewStudent.academicYear],
                  ['Admission Quota', viewStudent.quota],
                  ['Admission Date', viewStudent.admissionDate],
                  ['Activity Score', `${viewStudent.academicActivityScore}/100`],
                  ['Days Since Activity', `${viewStudent.daysSinceLastActivity} days`],
                  ['Passport/Visa', viewStudent.passportVisaNumber || 'N/A']
                ].map(([label, value]) => (
                  <div key={label} style={{ padding: '0.65rem 0.85rem', background: 'var(--slate-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--slate-200)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--slate-500)', textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--navy-900)', marginTop: '0.15rem' }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--slate-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--slate-500)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Cryptographic Verification Hash</div>
                <div className="font-mono text-xs" style={{ wordBreak: 'break-all', color: 'var(--navy-900)' }}>{viewStudent.verificationHash}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
