import React, { useState } from 'react';
import { ActiveRole, ActiveTab, Navbar } from './components/Navbar';

/* ── Feature Components ── */
import { IntakeGuard } from './components/IntakeGuard';
import { GhostRadar } from './components/GhostRadar';
import { AnomalyEngine } from './components/AnomalyEngine';
import { StudentPass } from './components/StudentPass';
import { AuditChain } from './components/AuditChain';
import { PreSubmissionDryRun } from './components/PreSubmissionDryRun';
import { PublicVerifierView } from './components/PublicVerifierView';
import { CentralDashboard } from './components/CentralDashboard';
import { StudentRecordManager } from './components/StudentRecordManager';
import { BulkUpload } from './components/BulkUpload';
import { ReportsExport } from './components/ReportsExport';
import { DocumentVerification } from './components/DocumentVerification';
import { ApiIntegration } from './components/ApiIntegration';
import { AuthLogin, AuthUser } from './components/AuthLogin';

/* ── Mock Data ── */
import {
  INITIAL_INSTITUTIONS,
  INITIAL_COURSES,
  INITIAL_STUDENTS,
  INITIAL_GHOST_FLAGS,
  INITIAL_ANOMALIES,
  INITIAL_AUDIT_BLOCKS,
  INITIAL_VERIFIABLE_PASS,
} from './mockData/initialData';

/* ── Types ── */
import {
  CourseIntake,
  StudentRecord,
  GhostEnrolmentFlag,
  AnomalyRecord,
  AuditBlock,
  VerifiableStudentPass,
  QuotaCategory,
} from './types';

/* ── Services ── */
import { sha256Sim, validateApaarChecksum } from './services/validationEngine';

/* ── Icons ── */
import { ShieldCheck, Layers, Database, Lock, AlertTriangle } from 'lucide-react';

/* ══════════════════════════════════════════════
   App
══════════════════════════════════════════════ */
export const App: React.FC = () => {
  /* ── Auth ── */
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedUser, setLoggedUser] = useState<AuthUser | null>(null);

  /* ── Role / Tab ── */
  const [activeRole, setActiveRole] = useState<ActiveRole>('AICTE_ADMIN');
  const [activeTab, setActiveTab] = useState<ActiveTab>('CENTRAL_DASHBOARD');

  /* ── Core State ── */
  const [courses, setCourses] = useState<CourseIntake[]>(INITIAL_COURSES);
  const [students, setStudents] = useState<StudentRecord[]>(INITIAL_STUDENTS);
  const [ghostFlags, setGhostFlags] = useState<GhostEnrolmentFlag[]>(INITIAL_GHOST_FLAGS);
  const [anomalies, setAnomalies] = useState<AnomalyRecord[]>(INITIAL_ANOMALIES);
  const [auditBlocks, setAuditBlocks] = useState<AuditBlock[]>(INITIAL_AUDIT_BLOCKS);
  const [verifiablePass, setVerifiablePass] = useState<VerifiableStudentPass>(INITIAL_VERIFIABLE_PASS);

  /* ══════════════════════════════════════════
     Auth Handlers
  ══════════════════════════════════════════ */
  const handleLogin = (user: AuthUser) => {
    setIsLoggedIn(true);
    setLoggedUser(user);
    setActiveRole(user.role);
    // Default tab per role
    if (user.role === 'AICTE_ADMIN') setActiveTab('CENTRAL_DASHBOARD');
    else if (user.role === 'INSTITUTION_REGISTRAR') setActiveTab('INTAKE_GUARD');
    else setActiveTab('STUDENT_PASS');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoggedUser(null);
    setActiveRole('AICTE_ADMIN');
    setActiveTab('CENTRAL_DASHBOARD');
  };

  /* ══════════════════════════════════════════
     Audit Chain Helper
  ══════════════════════════════════════════ */
  const appendAuditBlock = (
    actor: string,
    role: string,
    action: AuditBlock['action'],
    recordsCount: number,
    dataSummary: string
  ) => {
    setAuditBlocks(prev => {
      const prevBlock = prev[0];
      const newBlockNumber = (prevBlock?.blockNumber || 10482) + 1;
      const dataHash = sha256Sim(`${newBlockNumber}-${dataSummary}-${Date.now()}`);
      const newBlock: AuditBlock = {
        blockNumber: newBlockNumber,
        timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
        actor,
        actorRole: role,
        institutionId: loggedUser?.institution ? 'AICTE-INST-001' : 'AICTE-HQ-001',
        action,
        recordsAffected: recordsCount,
        dataHash,
        previousBlockHash: prevBlock?.dataHash || '0x0000000000000000',
        merkleRoot: sha256Sim(dataHash + 'merkle'),
        signatureReceipt: `SIG-ECDSA-AICTE-${newBlockNumber}`,
      };
      return [newBlock, ...prev];
    });
  };

  /* ══════════════════════════════════════════
     Feature 1 — Intake Guard: Add Student
  ══════════════════════════════════════════ */
  const handleAddStudentToCourse = (
    courseId: string,
    quota: QuotaCategory,
    apaarId: string,
    studentName: string
  ): { success: boolean; message: string } => {
    const courseIndex = courses.findIndex(c => c.courseId === courseId);
    if (courseIndex === -1) return { success: false, message: 'Course not found.' };

    const target = courses[courseIndex];

    // Category-specific quota blocks
    if (quota === 'TFWS' && target.enrolled.tfws >= target.approvedSupernumerary.tfws)
      return { success: false, message: `REGULATORY INTAKE BLOCK: TFWS quota for ${target.courseName} is full (${target.enrolled.tfws}/${target.approvedSupernumerary.tfws}). Cannot exceed 5% statutory ceiling.` };
    if (quota === 'NRI' && target.enrolled.nri >= target.approvedSupernumerary.nri)
      return { success: false, message: `REGULATORY INTAKE BLOCK: NRI quota (${target.approvedSupernumerary.nri} seats) exhausted. Supernumerary expansion requires AICTE Executive Council approval.` };
    if (quota === 'FN' && target.enrolled.fn >= target.approvedSupernumerary.fn)
      return { success: false, message: `REGULATORY INTAKE BLOCK: Foreign National quota cap (${target.approvedSupernumerary.fn} seats) reached.` };

    // Duplicate APAAR check
    if (students.some(s => s.apaarId === apaarId))
      return { success: false, message: `DUPLICATE APAAR DETECTED: ID ${apaarId} already exists in the registry. Cross-institution flag raised.` };

    // Total capacity check
    const currentTotal =
      target.enrolled.general + target.enrolled.obc + target.enrolled.sc_st +
      target.enrolled.ews + target.enrolled.tfws + target.enrolled.pmsss +
      target.enrolled.nri + target.enrolled.oci + target.enrolled.fn;
    const maxCapacity =
      target.sanctionedIntake +
      target.approvedSupernumerary.tfws + target.approvedSupernumerary.pmsss +
      target.approvedSupernumerary.nri + target.approvedSupernumerary.oci + target.approvedSupernumerary.fn;
    if (currentTotal >= maxCapacity)
      return { success: false, message: `HARD CEILING BREACH: ${target.courseId} has reached maximum capacity (${currentTotal}/${maxCapacity}). AICTE Approval Handbook enforces automatic intake freeze.` };

    // Update enrolled
    const updatedCourses = [...courses];
    const updatedEnrolled = { ...target.enrolled };
    if (quota === 'General') updatedEnrolled.general += 1;
    else if (quota === 'OBC') updatedEnrolled.obc += 1;
    else if (quota === 'SC_ST') updatedEnrolled.sc_st += 1;
    else if (quota === 'EWS') updatedEnrolled.ews += 1;
    else if (quota === 'TFWS') updatedEnrolled.tfws += 1;
    else if (quota === 'PMSSS') updatedEnrolled.pmsss += 1;
    else if (quota === 'NRI') updatedEnrolled.nri += 1;
    else if (quota === 'OCI') updatedEnrolled.oci += 1;
    else if (quota === 'FN') updatedEnrolled.fn += 1;
    updatedCourses[courseIndex] = { ...target, enrolled: updatedEnrolled };
    setCourses(updatedCourses);

    // Create student record
    const newStudent: StudentRecord = {
      id: `STU-${Date.now().toString().slice(-4)}`,
      apaarId,
      hashedId: sha256Sim(apaarId),
      studentName,
      gender: 'Male',
      dob: '2004-06-15',
      institutionId: 'AICTE-DEL-101',
      institutionName: 'Delhi Institute of Engineering & Advanced Technology',
      courseId: target.courseId,
      courseName: target.courseName,
      academicYear: '2026-27',
      quota,
      admissionDate: new Date().toISOString().slice(0, 10),
      isSupernumerary: !['General', 'EWS', 'OBC', 'SC_ST'].includes(quota),
      status: 'ACTIVE',
      academicActivityScore: 90,
      daysSinceLastActivity: 0,
      verificationHash: sha256Sim(`${apaarId}-${target.courseId}`),
    };
    setStudents(prev => [newStudent, ...prev]);
    appendAuditBlock(
      loggedUser?.badgeId || 'REGISTRAR_DIEAT_101',
      'Institution Registrar',
      'STUDENT_ENROLMENT',
      1,
      `Enrolled ${studentName} (${apaarId}) in ${target.courseId} under ${quota}`
    );
    return { success: true, message: `ADMISSION ACCEPTED: ${studentName} registered in ${target.courseId} under ${quota}. Record committed to ledger.` };
  };

  /* ══════════════════════════════════════════
     Student Record Manager Handlers
  ══════════════════════════════════════════ */
  const handleUpdateStudent = (updated: StudentRecord) => {
    setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
    appendAuditBlock(
      loggedUser?.badgeId || 'REGISTRAR',
      'Institution Registrar',
      'INTAKE_ALTERATION',
      1,
      `Updated record for ${updated.studentName} (${updated.apaarId})`
    );
  };

  const handleAddStudentDirect = (
    studentData: Omit<StudentRecord, 'id' | 'hashedId' | 'verificationHash'>
  ): { success: boolean; message: string } => {
    // Duplicate check
    if (students.some(s => s.apaarId === studentData.apaarId)) {
      return { success: false, message: `Duplicate APAAR ID: ${studentData.apaarId} already exists in the registry. Ghost enrolment flag will be raised.` };
    }
    const newStudent: StudentRecord = {
      ...studentData,
      id: `STU-${Date.now().toString().slice(-4)}`,
      hashedId: sha256Sim(studentData.apaarId),
      verificationHash: sha256Sim(`${studentData.apaarId}-${studentData.courseId}`),
    };
    setStudents(prev => [newStudent, ...prev]);
    appendAuditBlock(
      loggedUser?.badgeId || 'REGISTRAR',
      'Institution Registrar',
      'STUDENT_ENROLMENT',
      1,
      `Registered ${studentData.studentName} (${studentData.apaarId})`
    );
    return { success: true, message: `Student ${studentData.studentName} registered successfully and committed to audit chain.` };
  };

  /* ══════════════════════════════════════════
     Feature 2 — Ghost Radar
  ══════════════════════════════════════════ */
  const handleResolveGhostFlag = (id: string, resolution: 'FROZEN' | 'CLEARED') => {
    setGhostFlags(prev =>
      prev.map(f => f.id === id ? { ...f, status: resolution === 'FROZEN' ? 'CONFIRMED_GHOST' : 'CLEARED' } : f)
    );
    appendAuditBlock(
      loggedUser?.badgeId || 'AICTE_VIGILANCE_HQ',
      'AICTE Regulatory Officer',
      'REVOCATION',
      1,
      `Regulatory action: ${resolution} for ghost collision ${id}`
    );
  };

  /* ══════════════════════════════════════════
     Feature 3 — Anomaly Engine
  ══════════════════════════════════════════ */
  const handleUpdateAnomalyStatus = (anomalyId: string, newStatus: AnomalyRecord['status'], note: string) => {
    setAnomalies(prev =>
      prev.map(a => a.id === anomalyId ? { ...a, status: newStatus, actionTaken: note } : a)
    );
    appendAuditBlock(
      loggedUser?.badgeId || 'AICTE_CHAIRMAN_OFFICE',
      'Apex Directorate',
      'ANOMALY_CLEARED',
      1,
      `Adjudicated anomaly ${anomalyId} → ${newStatus}. Note: ${note}`
    );
  };

  /* ══════════════════════════════════════════
     Feature 4 — Student Pass
  ══════════════════════════════════════════ */
  const handleRevokePass = (passId: string) => {
    setVerifiablePass(prev => ({ ...prev, isRevoked: true }));
    appendAuditBlock(
      loggedUser?.badgeId || 'STUDENT_IDENTITY_VAULT',
      'Student Self-Service Consent',
      'REVOCATION',
      1,
      `Student revoked third-party verification consent for Pass ${passId}`
    );
  };

  /* ══════════════════════════════════════════
     Feature 5 — Bulk Upload Commit
  ══════════════════════════════════════════ */
  const commitCsvRecords = (csvText: string, source: string) => {
    const rows = csvText.split(/\r?\n/).filter(row => row.trim());
    const dataRows = rows[0]?.toLowerCase().includes('apaar') ? rows.slice(1) : rows;
    const knownApaars = new Set(students.map(student => student.apaarId.replace(/[^0-9]/g, '')));
    const additions: StudentRecord[] = [];
    const increments = new Map<string, QuotaCategory[]>();

    dataRows.forEach((row, index) => {
      const [rawApaar = '', rawName = '', courseId = '', rawQuota = 'General', extraDoc = ''] = row.split(',').map(value => value.trim());
      const cleanApaar = rawApaar.replace(/[^0-9]/g, '');
      const quota = rawQuota as QuotaCategory;
      const course = courses.find(item => item.courseId === courseId);
      const validQuota = ['General', 'OBC', 'SC_ST', 'EWS', 'TFWS', 'PMSSS', 'NRI', 'OCI', 'FN'].includes(quota);
      const requiresTravelDoc = ['NRI', 'OCI', 'FN'].includes(quota);
      if (!course || !rawName || !validQuota || !validateApaarChecksum(cleanApaar) || knownApaars.has(cleanApaar) || (requiresTravelDoc && !extraDoc)) return;

      knownApaars.add(cleanApaar);
      const formattedApaar = `${cleanApaar.slice(0, 4)}-${cleanApaar.slice(4, 8)}-${cleanApaar.slice(8)}`;
      additions.push({
        id: `STU-BATCH-${Date.now().toString().slice(-5)}-${index + 1}`,
        apaarId: formattedApaar,
        hashedId: sha256Sim(formattedApaar),
        studentName: rawName,
        gender: 'Other', dob: '2004-01-01',
        institutionId: loggedUser?.institution ? 'AICTE-DEL-101' : 'AICTE-HQ-001',
        institutionName: loggedUser?.institution || 'AICTE Prototype Registry',
        courseId: course.courseId, courseName: course.courseName, academicYear: '2026-27', quota,
        admissionDate: new Date().toISOString().slice(0, 10),
        isSupernumerary: !['General', 'OBC', 'SC_ST', 'EWS'].includes(quota),
        status: 'ACTIVE', academicActivityScore: 100, daysSinceLastActivity: 0,
        passportVisaNumber: extraDoc || undefined,
        verificationHash: sha256Sim(`${formattedApaar}-${course.courseId}`),
      });
      increments.set(course.courseId, [...(increments.get(course.courseId) || []), quota]);
    });

    if (additions.length) {
      setStudents(previous => [...additions, ...previous]);
      setCourses(previous => previous.map(course => {
        const courseIncrements = increments.get(course.courseId) || [];
        if (!courseIncrements.length) return course;
        const enrolled = { ...course.enrolled };
        courseIncrements.forEach(quota => {
          const key = quota === 'SC_ST' ? 'sc_st' : quota === 'TFWS' ? 'tfws' : quota === 'PMSSS' ? 'pmsss' : quota.toLowerCase() as keyof typeof enrolled;
          enrolled[key] += 1;
        });
        return { ...course, enrolled };
      }));
    }
    appendAuditBlock(loggedUser?.badgeId || 'REGISTRAR_DIEAT_101', 'Institution Registrar', 'BATCH_UPLOAD', additions.length, `${source}: ${additions.length} validated student records committed from CSV`);
    return additions.length;
  };

  const handleBulkUploadCommit = (_count: number, csvText: string) => {
    const committed = commitCsvRecords(csvText, 'Bulk upload');
    appendAuditBlock(
      loggedUser?.badgeId || 'REGISTRAR_DIEAT_101',
      'Institution Registrar',
      'BATCH_UPLOAD',
      committed,
      `Bulk upload receipt issued for ${committed} student records`
    );
  };

  /* ══════════════════════════════════════════
     Feature 6 — Dry Run Commit
  ══════════════════════════════════════════ */
  const handleCommitDryRunBatch = (_count: number, csvText: string) => {
    commitCsvRecords(csvText, 'Pre-submission dry-run');
  };

  /* ══════════════════════════════════════════
     Document Verification Handler
  ══════════════════════════════════════════ */
  const handleVerifyRecord = (studentId: string, status: 'VERIFIED' | 'REJECTED', note: string) => {
    setStudents(prev =>
      prev.map(s =>
        s.id === studentId
          ? { ...s, status: status === 'VERIFIED' ? 'ACTIVE' : 'EXCESS_ESCALATED' }
          : s
      )
    );
    appendAuditBlock(
      loggedUser?.badgeId || 'AICTE_HQ_OFC-001',
      'AICTE Verification Officer',
      'ANOMALY_CLEARED',
      1,
      `Document verification: ${status} for student ${studentId}. Note: ${note}`
    );
  };

  /* ══════════════════════════════════════════
     Export Report Handler
  ══════════════════════════════════════════ */
  const handleExportReport = (type: 'PDF' | 'CSV', section: string) => {
    appendAuditBlock(
      loggedUser?.badgeId || 'AICTE_HQ_OFC-001',
      'AICTE Regulatory Officer',
      'BATCH_UPLOAD',
      0,
      `Report exported: "${section}" as ${type}`
    );
  };

  /* ══════════════════════════════════════════
     Role Change
  ══════════════════════════════════════════ */
  const handleRoleChange = (role: ActiveRole) => {
    setActiveRole(role);
    if (role === 'AICTE_ADMIN') setActiveTab('CENTRAL_DASHBOARD');
    else if (role === 'INSTITUTION_REGISTRAR') setActiveTab('INTAKE_GUARD');
    else setActiveTab('STUDENT_PASS');
  };

  /* ══════════════════════════════════════════
     AUTH GATE — Show Login if not authenticated
  ══════════════════════════════════════════ */
  if (!isLoggedIn) {
    return <AuthLogin onLogin={handleLogin} />;
  }

  /* ══════════════════════════════════════════
     MAIN APP
  ══════════════════════════════════════════ */
  return (
    <div className="app-container">
      {/* Navigation Header */}
      <Navbar
        activeRole={activeRole}
        onRoleChange={handleRoleChange}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userName={loggedUser?.name}
        onLogout={handleLogout}
      />

      {/* Page Content */}
      <main className="page-wrapper">

        {/* ── Apex Regulatory Scorecard (visible to all roles) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="metric-tile highlight">
            <div className="metric-title"><span>National Approved Intake</span><Layers size={14} color="var(--slate-400)" /></div>
            <div className="metric-value">{INITIAL_INSTITUTIONS.reduce((sum, institution) => sum + institution.totalSanctioned, 0).toLocaleString()}</div>
            <div className="metric-sub">Across {INITIAL_INSTITUTIONS.length} AICTE-approved institutions</div>
          </div>
          <div className="metric-tile highlight">
            <div className="metric-title"><span>Actual Verified Enrolment</span><Database size={14} color="var(--slate-400)" /></div>
            <div className="metric-value font-mono">{students.length}</div>
            <div className="metric-sub" style={{ color: students.length > 2160 ? 'var(--status-danger)' : 'var(--status-success)', fontWeight: 600 }}>
              Live prototype registry — validations applied on new entries
            </div>
          </div>
          <div className="metric-tile warning">
            <div className="metric-title"><span>Ghost Collisions Flagged</span><AlertTriangle size={14} color="var(--status-warning)" /></div>
            <div className="metric-value font-mono" style={{ color: 'var(--status-warning)' }}>
              {ghostFlags.filter(f => f.status === 'DETECTED').length}
            </div>
            <div className="metric-sub">Zero-Activity &amp; Dual Enrolments</div>
          </div>
          <div className="metric-tile">
            <div className="metric-title"><span>Immutable Chain Blocks</span><Lock size={14} color="var(--navy-800)" /></div>
            <div className="metric-value font-mono">{auditBlocks[0]?.blockNumber || 10482}</div>
            <div className="metric-sub">
              <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>100% Tamper Evident</span>
            </div>
          </div>
        </div>

        {/* ══════════════ FEATURE ROUTES ══════════════ */}

        {/* CENTRAL DASHBOARD — AICTE */}
        {activeTab === 'CENTRAL_DASHBOARD' && (
          <CentralDashboard
            institutions={INITIAL_INSTITUTIONS}
            courses={courses}
            students={students}
            ghostFlags={ghostFlags}
            anomalies={anomalies}
            onExportReport={handleExportReport}
          />
        )}

        {/* INTAKE GUARD */}
        {activeTab === 'INTAKE_GUARD' && (
          <IntakeGuard
            courses={courses}
            onAddStudentToCourse={handleAddStudentToCourse}
          />
        )}

        {/* GHOST RADAR */}
        {activeTab === 'GHOST_RADAR' && (
          <GhostRadar
            flags={ghostFlags}
            onResolveFlag={handleResolveGhostFlag}
          />
        )}

        {/* ANOMALY ENGINE */}
        {activeTab === 'ANOMALY_ENGINE' && (
          <AnomalyEngine
            anomalies={anomalies}
            institutions={INITIAL_INSTITUTIONS}
            onUpdateAnomalyStatus={handleUpdateAnomalyStatus}
          />
        )}

        {/* STUDENT RECORDS */}
        {activeTab === 'STUDENT_RECORDS' && (
          <StudentRecordManager
            students={students}
            onUpdateStudent={handleUpdateStudent}
            onAddStudent={handleAddStudentDirect}
          />
        )}

        {/* BULK UPLOAD */}
        {activeTab === 'BULK_UPLOAD' && (
          <BulkUpload
            courses={courses}
            onCommitBatch={handleBulkUploadCommit}
          />
        )}

        {/* PRE-SUBMISSION DRY RUN */}
        {activeTab === 'DRY_RUN' && (
          <PreSubmissionDryRun
            courses={courses}
            onCommitBatch={handleCommitDryRunBatch}
          />
        )}

        {/* DOCUMENT VERIFICATION */}
        {activeTab === 'DOC_VERIFY' && (
          <DocumentVerification
            students={students}
            institutions={INITIAL_INSTITUTIONS}
            onVerifyRecord={handleVerifyRecord}
          />
        )}

        {/* AUDIT CHAIN */}
        {activeTab === 'AUDIT_CHAIN' && (
          <AuditChain blocks={auditBlocks} />
        )}

        {/* REPORTS & EXPORT */}
        {activeTab === 'REPORTS' && (
          <ReportsExport
            institutions={INITIAL_INSTITUTIONS}
            courses={courses}
            students={students}
            ghostFlags={ghostFlags}
            anomalies={anomalies}
            auditBlocks={auditBlocks}
          />
        )}

        {/* API INTEGRATION */}
        {activeTab === 'API_INTEGRATION' && (
          <ApiIntegration />
        )}

        {/* STUDENT PASS — Student view OR Public Verifier view */}
        {activeTab === 'STUDENT_PASS' && (
          <div>
            {activeRole === 'PUBLIC_VERIFIER' ? (
              <PublicVerifierView students={students} pass={verifiablePass} />
            ) : (
              <div>
                <StudentPass
                  pass={verifiablePass}
                  onUpdateConsent={updated => setVerifiablePass(updated)}
                  onRevokePass={handleRevokePass}
                />
                <div style={{ marginTop: '2rem' }}>
                  <PublicVerifierView students={students} pass={verifiablePass} />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Official Gov Footer */}
      <footer style={{ marginTop: 'auto', borderTop: '1px solid var(--slate-200)', backgroundColor: '#ffffff', padding: '1.25rem 2rem', fontSize: '0.75rem', color: 'var(--slate-500)' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <strong>All India Council for Technical Education (AICTE)</strong> — Nelson Mandela Marg, Vasant Kunj, New Delhi-110070.
            <div style={{ marginTop: '0.2rem' }}>
              APAAR National Academic Identity Integration Framework &nbsp;•&nbsp; Digital Personal Data Protection (DPDP) Act 2023 Compliant.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontFamily: 'var(--font-mono)' }}>
            <span>REST API v2.4</span>
            <span>•</span>
            <span>ABC Ledger Connected</span>
            <span>•</span>
            <span>SHA-256 Validated</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
