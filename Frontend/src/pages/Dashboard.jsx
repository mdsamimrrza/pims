import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppIcon from '../components/AppIcon';
import StatCard from '../components/StatCard';
import { getApiMessage, listMedicines, listPatients, listPrescriptions } from '../api/pimsApi';
import useDebouncedValue from '../hooks/useDebouncedValue';

const QUICK_SEARCH_TAGS = ['Metformin', 'Lisinopril', 'A10BA02', 'Amoxicillin', 'N02BE01'];

function statusClass(status) {
  if (status === 'Filled') {
    return 'status-pill status-success';
  }
  if (status === 'Pending' || status === 'Processing') {
    return 'status-pill status-warning';
  }
  if (status === 'Cancelled') {
    return 'status-pill status-critical';
  }
  if (status === 'Draft') {
    return 'status-pill status-neutral';
  }
  return 'status-pill status-neutral';
}

function isSameDay(dateValue) {
  const today = new Date();
  const date = new Date(dateValue);
  return today.toDateString() === date.toDateString();
}

function formatDate(value) {
  if (!value) {
    return 'Not available';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Not available';
  }

  return parsed.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function getAgeFromDob(value) {
  if (!value) {
    return 'Not available';
  }

  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) {
    return 'Not available';
  }

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthOffset = today.getMonth() - dob.getMonth();

  if (monthOffset < 0 || (monthOffset === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return `${age} years`;
}

function getMedicationName(item) {
  return item?.medicineId?.name || item?.medicineId?.genericName || item?.atcCode || 'Medication';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [medicineQuery, setMedicineQuery] = useState('');
  const [recentPrescriptions, setRecentPrescriptions] = useState([]);
  const [draftPrescriptions, setDraftPrescriptions] = useState([]);
  const [patientMatches, setPatientMatches] = useState([]);
  const [medicineMatches, setMedicineMatches] = useState([]);
  const [overview, setOverview] = useState({
    todayTotal: 0,
    scheduled: 0,
    newPatients: 0,
    urgentCount: 0
  });
  const [pageState, setPageState] = useState({
    isLoading: true,
    errorMessage: ''
  });

  const debouncedPatientQuery = useDebouncedValue(`${patientId} ${patientName}`.trim(), 350);
  const debouncedMedicineQuery = useDebouncedValue(medicineQuery, 300);

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      setPageState({ isLoading: true, errorMessage: '' });

      try {
        const [prescriptionData, draftData, patientData] = await Promise.all([
          listPrescriptions({ limit: 12 }),
          listPrescriptions({ limit: 10, status: 'Draft' }),
          listPatients({ limit: 25 })
        ]);

        if (!isActive) {
          return;
        }

        const prescriptions = prescriptionData?.prescriptions || [];
        const drafts = draftData?.prescriptions || [];
        const patients = patientData?.patients || [];

        setRecentPrescriptions(prescriptions.slice(0, 5));
        setDraftPrescriptions(drafts);
        setOverview({
          todayTotal: prescriptions.filter((item) => isSameDay(item.createdAt)).length,
          scheduled: prescriptions.filter((item) => item.status === 'Pending' || item.status === 'Processing').length,
          newPatients: patients.filter((item) => isSameDay(item.createdAt)).length,
          urgentCount: prescriptions.filter((item) => item.isUrgent).length
        });
        setPageState({ isLoading: false, errorMessage: '' });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setPageState({
          isLoading: false,
          errorMessage: getApiMessage(error, 'Failed to load dashboard')
        });
      }
    }

    loadDashboard();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function searchPatients() {
      if (!debouncedPatientQuery) {
        setPatientMatches([]);
        return;
      }

      try {
        const data = await listPatients({ q: debouncedPatientQuery, limit: 5 });
        if (isActive) {
          setPatientMatches(data?.patients || []);
        }
      } catch (_error) {
        if (isActive) {
          setPatientMatches([]);
        }
      }
    }

    searchPatients();

    return () => {
      isActive = false;
    };
  }, [debouncedPatientQuery]);

  useEffect(() => {
    let isActive = true;

    async function searchMedicines() {
      if (!debouncedMedicineQuery.trim()) {
        setMedicineMatches([]);
        return;
      }

      try {
        const data = await listMedicines({ q: debouncedMedicineQuery, limit: 5 });
        if (isActive) {
          setMedicineMatches(data?.medicines || []);
        }
      } catch (_error) {
        if (isActive) {
          setMedicineMatches([]);
        }
      }
    }

    searchMedicines();

    return () => {
      isActive = false;
    };
  }, [debouncedMedicineQuery]);

  const recentSearchTags = useMemo(() => QUICK_SEARCH_TAGS, []);
  const patientResultCount = patientMatches.length;

  const handleSelectPatient = (patientRecord) => {
    navigate(`/patients/${patientRecord._id}/details`, { state: { patient: patientRecord } });
  };

  return (
    <section className="page dashboard-page">
      {pageState.errorMessage ? (
        <div className="notice-banner">
          <div>
            <strong>Dashboard data could not load</strong>
            <div className="helper-text">{pageState.errorMessage}</div>
          </div>
        </div>
      ) : null}

      <div className="dashboard-hero">
        <section className="hero-banner surface-card">
          <div className="page-title">
            <div className="section-title">
              <AppIcon name="plusCircle" size={22} />
              <h2>Create New Prescription</h2>
            </div>
            <p className="helper-text">
              Generate a new medical prescription using integrated ATC drug classification and patient history.
            </p>
          </div>

          <div className="hero-actions">
            <Link className="button-primary" to="/prescription/new">
              Start Generator
              <AppIcon name="arrowRight" size={18} />
            </Link>
            <Link className="button-secondary" to="/prescriptions">
              View History
            </Link>
          </div>

          <div className="hero-tip helper-text">
            <strong>Quick Tip:</strong> Search medicines below or jump into the ATC tree to start a prescription faster.
          </div>
        </section>

        <section className="panel">
          <div className="patient-lookup-header">
            <div className="section-title">
              <AppIcon name="users" size={20} />
              <h3>Patient Lookup</h3>
            </div>
            {debouncedPatientQuery ? (
              <span className="patient-lookup-count">{patientResultCount} match{patientResultCount === 1 ? '' : 'es'}</span>
            ) : null}
          </div>
          <p className="helper-text">Search by patient ID or name, then open the full record page.</p>

          <div className="field-grid">
            <label className="field-label">
              <span>Patient ID / National ID</span>
              <input
                onChange={(event) => setPatientId(event.target.value)}
                placeholder="e.g. P-123456"
                value={patientId}
              />
            </label>
            <label className="field-label">
              <span>Full Name</span>
              <input
                onChange={(event) => setPatientName(event.target.value)}
                placeholder="Search by name..."
                value={patientName}
              />
            </label>
          </div>

          <div className="patient-lookup-results">
            {patientMatches.length ? (
              <div className="lookup-result-list">
                {patientMatches.map((patientRecord) => {
                  return (
                    <button
                      className="lookup-result lookup-result-action"
                      key={patientRecord._id}
                      onClick={() => handleSelectPatient(patientRecord)}
                      type="button"
                    >
                      <strong>{patientRecord.name}</strong>
                      <div className="helper-text">
                        {patientRecord.patientId} · {patientRecord.gender} · DOB {formatDate(patientRecord.dob)}
                      </div>
                      <div className="pill-row">
                        {(patientRecord.allergies || []).length ? patientRecord.allergies.map((entry) => (
                          <span className="pill" key={`${patientRecord._id}-${entry.substance}`}>
                            {entry.substance} ({entry.severity})
                          </span>
                        )) : <span className="pill">No allergies recorded</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="helper-text">
                {debouncedPatientQuery ? 'No patient match found yet.' : 'Type an ID or name to search patients.'}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="toolbar">
          <div className="page-title">
            <div className="section-title">
              <AppIcon name="search" size={20} />
              <h3>Quick Drug Search</h3>
            </div>
            <p className="helper-text">
              Search live medicine records by drug name, generic ingredient, or ATC code.
            </p>
          </div>
          <Link className="button-ghost" to="/atc">
            Explore Full Tree
            <AppIcon name="chevronRight" size={16} />
          </Link>
        </div>

        <label className="search-field">
          <AppIcon name="search" size={18} />
          <input
            onChange={(event) => setMedicineQuery(event.target.value)}
            placeholder="Enter drug name, active ingredient, or ATC code..."
            type="search"
            value={medicineQuery}
          />
        </label>

        <div className="pill-row" style={{ marginTop: '1rem' }}>
          <span className="caption" style={{ alignSelf: 'center' }}>Recent</span>
          {recentSearchTags.map((tag) => (
            <button className="pill" key={tag} onClick={() => setMedicineQuery(tag)} type="button">
              {tag}
            </button>
          ))}
        </div>

        {medicineMatches.length ? (
          <div className="mini-list" style={{ marginTop: '1rem' }}>
            {medicineMatches.map((medicine) => (
              <div className="mini-list-item" key={medicine._id || medicine.id}>
                <div>
                  <strong>{medicine.name}</strong>
                  <div className="helper-text">
                    {medicine.genericName} · {medicine.atcCode} · {medicine.strength || medicine.dosageForm}
                  </div>
                </div>
                <Link className="button-secondary" to="/prescription/new">Use</Link>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {draftPrescriptions.length ? (
        <section className="panel">
          <div className="section-title" style={{ marginBottom: '1.5rem' }}>
            <AppIcon name="note" size={20} />
            <h3>My Draft Prescriptions</h3>
          </div>
          <div className="mini-list">
            {draftPrescriptions.map((draft) => (
              <div className="mini-list-item" key={draft._id}>
                <div>
                  <strong>{draft.rxId}</strong>
                  <div className="helper-text">
                    {draft.patientId?.name || 'Unknown Patient'} · {draft.items?.length || 0} items · Saved {formatDate(draft.updatedAt)}
                  </div>
                </div>
                <div className="toolbar-group">
                  <span className="status-pill status-neutral">Draft</span>
                  <Link className="button-secondary" to={`/prescription/edit/${draft._id}`}>
                    <AppIcon name="edit" size={14} />
                    Resume
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="table-panel">
        <div className="table-head">
          <div className="page-title">
            <div className="section-title">
              <AppIcon name="clock" size={20} />
              <h3>Recent Prescriptions</h3>
            </div>
            <p className="helper-text">Your latest issued prescriptions and their current backend status.</p>
          </div>
          <Link className="button-secondary" to="/prescriptions">Manage All</Link>
        </div>

        {pageState.isLoading ? (
          <div className="helper-text">Loading dashboard prescriptions...</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>RX ID</th>
                  <th>Patient</th>
                  <th>Medicine</th>
                  <th>Date Issued</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentPrescriptions.map((record) => (
                  <tr key={record._id || record.id}>
                    <td>{record.rxId}</td>
                    <td>{record.patientId?.name || 'Unknown patient'}</td>
                    <td>{record.items?.[0]?.medicineId?.name || record.items?.[0]?.atcCode || 'N/A'}</td>
                    <td>{new Date(record.createdAt).toLocaleDateString()}</td>
                    <td><span className={statusClass(record.status)}>{record.status}</span></td>
                    <td>
                      <Link className="button-ghost" to="/prescriptions">
                        View
                        <AppIcon name="external" size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {!recentPrescriptions.length ? (
                  <tr>
                    <td className="helper-text" colSpan="6">No prescriptions found yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="stats-grid">
        <StatCard hint="Issued today" icon="note" title="Today's Total" value={String(overview.todayTotal).padStart(2, '0')} />
        <StatCard hint="Pending or processing" icon="calendar" title="Scheduled" value={String(overview.scheduled).padStart(2, '0')} />
        <StatCard hint="New patient records today" icon="users" title="New Patients" value={String(overview.newPatients).padStart(2, '0')} />
        <StatCard hint="Urgent prescriptions awaiting action" icon="alert" title="Urgent Rx" value={String(overview.urgentCount).padStart(2, '0')} />
      </div>
    </section>
  );
}
