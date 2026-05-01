import { useEffect, useMemo, useState } from 'react';
import AppIcon from '../components/AppIcon';
import {
  createPrescription,
  getApiMessage,
  getPrescription,
  listMedicines,
  listPatients,
  updateDraftPrescription
} from '../api/pimsApi';
import { useParams, useNavigate } from 'react-router-dom';
import useDebouncedValue from '../hooks/useDebouncedValue';
import useToast from '../hooks/useToast';
import { getStoredDisplayName } from '../utils/session';

function createPrescriptionItem(medicine) {
  return {
    medicineId: medicine._id,
    name: medicine.name,
    atcCode: medicine.atcCode,
    dose: medicine.strength || '',
    frequency: '',
    route: 'Oral',
    durationDays: 7,
    instructions: ''
  };
}

function parseAllergies(value) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((substance) => ({
      substance,
      severity: 'Mild'
    }));
}

function generatePatientRecordId() {
  return `PAT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
}

function getValidation(items, patient, selectedPatientDbId, isDraft = false) {
  if (isDraft) {
    if (!selectedPatientDbId && !patient.name) {
      return {
        title: 'Needs Name',
        detail: 'Patient name is required to save a draft.',
        tone: 'status-pill status-warning'
      };
    }
    return {
      title: 'Ready',
      detail: 'You can save this as a draft.',
      tone: 'status-pill status-success'
    };
  }

  if (!selectedPatientDbId && (!patient.name || !patient.dob || !patient.email)) {
    return {
      title: 'Needs Patient Info',
      detail: 'Patient name, date of birth, and email are required for a new patient.',
      tone: 'status-pill status-warning'
    };
  }

  if (!items.length || items.some((item) => !item.dose || !item.frequency)) {
    return {
      title: 'Needs Review',
      detail: 'Each prescription item needs dose and frequency before submission.',
      tone: 'status-pill status-warning'
    };
  }

  return {
    title: 'Clear',
    detail: 'Required prescription fields are ready for backend submission.',
    tone: 'status-pill status-success'
  };
}

export default function Prescription() {
  const { id: editId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState({
    recordId: generatePatientRecordId(),
    name: '',
    dob: '',
    gender: 'Male',
    email: '',
    allergiesText: ''
  });
  const [selectedPatientDbId, setSelectedPatientDbId] = useState('');
  const [selectedPatientHasPortal, setSelectedPatientHasPortal] = useState(false);
  const [medicineQuery, setMedicineQuery] = useState('');
  const [patientSuggestions, setPatientSuggestions] = useState([]);
  const [medicineResults, setMedicineResults] = useState([]);
  const [urgent, setUrgent] = useState(false);
  const [allowRefills, setAllowRefills] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [items, setItems] = useState([]);
  const [portalCredentials, setPortalCredentials] = useState(null);
  const { notifySuccess, notifyWarning } = useToast();

  const debouncedMedicineQuery = useDebouncedValue(medicineQuery, 300);
  const debouncedPatientQuery = useDebouncedValue(`${patient.recordId} ${patient.name}`.trim(), 350);

  useEffect(() => {
    if (!editId) return;

    async function loadDraft() {
      try {
        const data = await getPrescription(editId);
        const rx = data?.prescription;
        if (!rx || rx.status !== 'Draft') {
          notifyWarning('Invalid Draft', 'This prescription is not a draft or does not exist.');
          navigate('/prescription/new');
          return;
        }

        const p = rx.patientId;
        setSelectedPatientDbId(p._id);
        setSelectedPatientHasPortal(Boolean(p.userId));
        setPatient({
          recordId: p.patientId,
          name: p.name,
          dob: p.dob ? new Date(p.dob).toISOString().slice(0, 10) : '',
          gender: p.gender || 'Male',
          email: p.userId?.email || '',
          allergiesText: (p.allergies || []).map((a) => a.substance).join(', ')
        });
        setUrgent(rx.isUrgent);
        setAllowRefills(rx.allowRefills > 0);
        setItems(rx.items.map(item => ({
          medicineId: item.medicineId?._id || null,
          name: item.medicineId?.name || 'Unknown',
          atcCode: item.atcCode,
          dose: item.dose,
          frequency: item.frequency,
          route: item.route,
          durationDays: item.durationDays,
          instructions: item.instructions
        })));
        setMessage(`Loaded draft ${rx.rxId} for editing.`);
      } catch (error) {
        setErrorMessage(getApiMessage(error, 'Failed to load draft prescription'));
      }
    }

    loadDraft();
  }, [editId, navigate]);

  useEffect(() => {
    let isActive = true;

    async function loadMedicines() {
      try {
        const data = await listMedicines({
          q: debouncedMedicineQuery || undefined,
          limit: 6
        });

        if (isActive) {
          setMedicineResults(data?.medicines || []);
        }
      } catch (_error) {
        if (isActive) {
          setMedicineResults([]);
        }
      }
    }

    loadMedicines();

    return () => {
      isActive = false;
    };
  }, [debouncedMedicineQuery]);

  useEffect(() => {
    let isActive = true;

    async function searchPatients() {
      if (!debouncedPatientQuery) {
        setPatientSuggestions([]);
        return;
      }

      try {
        const data = await listPatients({ q: debouncedPatientQuery, limit: 5 });
        if (isActive) {
          setPatientSuggestions(data?.patients || []);
        }
      } catch (_error) {
        if (isActive) {
          setPatientSuggestions([]);
        }
      }
    }

    searchPatients();

    return () => {
      isActive = false;
    };
  }, [debouncedPatientQuery]);

  const validation = useMemo(() => getValidation(items, patient, selectedPatientDbId, false), [items, patient, selectedPatientDbId]);
  const draftValidation = useMemo(() => getValidation(items, patient, selectedPatientDbId, true), [items, patient, selectedPatientDbId]);
  const needsPortalInviteEmail = Boolean(selectedPatientDbId) && !selectedPatientHasPortal && !patient.email;

  const selectPatient = (entry) => {
    setSelectedPatientDbId(entry._id);
    setSelectedPatientHasPortal(Boolean(entry.userId));
    setPatient({
      recordId: entry.patientId,
      name: entry.name,
      dob: entry.dob ? new Date(entry.dob).toISOString().slice(0, 10) : '',
      gender: entry.gender || 'Other',
      email: '',
      allergiesText: (entry.allergies || []).map((allergy) => allergy.substance).join(', ')
    });
    setMessage(`Loaded patient record ${entry.patientId}.`);
    setErrorMessage('');
  };

  const updatePatientField = (field, value) => {
    if (field === 'recordId' || field === 'name') {
      setSelectedPatientDbId('');
      setSelectedPatientHasPortal(false);
    }
    setPatient((current) => ({ ...current, [field]: value }));
  };

  const addMedicine = (medicine) => {
    setItems((current) => {
      if (current.some((item) => item.medicineId === medicine._id || item.atcCode === medicine.atcCode)) {
        return current;
      }

      return [...current, createPrescriptionItem(medicine)];
    });
  };

  const updateItem = (index, field, value) => {
    setItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  };

  const removeItem = (index) => {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleDraftSave = async () => {
    if (draftValidation.title !== 'Ready') {
      setErrorMessage(draftValidation.detail);
      return;
    }

    setIsSavingDraft(true);
    setErrorMessage('');
    setMessage('');

    try {
      const prescriptionPayload = {
        ...(selectedPatientDbId
          ? {
              patientId: selectedPatientDbId,
              patientEmail: patient.email,
            }
          : {
              patient: {
                patientId: patient.recordId,
                name: patient.name,
                dob: patient.dob,
                gender: patient.gender,
                email: patient.email,
                allergies: parseAllergies(patient.allergiesText)
              }
            }),
        diagnosis: 'Generated from doctor draft workflow',
        isUrgent: urgent,
        allowRefills: allowRefills ? 3 : 0,
        items: items.map((item) => ({
          medicineId: item.medicineId,
          atcCode: item.atcCode,
          dose: item.dose,
          frequency: item.frequency,
          route: item.route,
          durationDays: Number(item.durationDays) || 1,
          instructions: item.instructions
        })),
        isDraft: true
      };

      if (editId) {
        await updateDraftPrescription(editId, prescriptionPayload);
        setMessage('Draft prescription updated successfully.');
      } else {
        const response = await createPrescription(prescriptionPayload);
        const rx = response?.prescription;
        setMessage(`Draft prescription ${rx?.rxId} saved successfully.`);
        if (rx?._id) {
          navigate(`/prescription/edit/${rx._id}`, { replace: true });
        }
      }
      notifySuccess('Draft Saved', 'Your changes have been saved as a draft.', 3000);
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Failed to save draft'));
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    if (validation.title !== 'Clear') {
      setMessage('');
      setErrorMessage(validation.detail);
      return;
    }

    if (needsPortalInviteEmail) {
      setMessage('');
      setErrorMessage('Patient email is required to create the portal invite for this existing patient.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    setErrorMessage('');

    try {
      let patientDbId = selectedPatientDbId;

      if (!patientDbId) {
        patientDbId = '';
      }

      const prescriptionPayload = {
        ...(patientDbId
          ? {
              patientId: patientDbId,
              patientEmail: patient.email,
            }
          : {
              patient: {
                patientId: patient.recordId,
                name: patient.name,
                dob: patient.dob,
                gender: patient.gender,
                email: patient.email,
                allergies: parseAllergies(patient.allergiesText)
              }
            }),
        diagnosis: 'Generated from frontend prescription workflow',
        isUrgent: urgent,
        allowRefills: allowRefills ? 3 : 0,
        items: items.map((item) => ({
          medicineId: item.medicineId,
          atcCode: item.atcCode,
          dose: item.dose,
          frequency: item.frequency,
          route: item.route,
          durationDays: Number(item.durationDays) || 1,
          instructions: item.instructions
        }))
      };

      const response = editId 
        ? await updateDraftPrescription(editId, { ...prescriptionPayload, submit: true })
        : await createPrescription(prescriptionPayload);
      const createdPrescription = response?.prescription;
      const patientPortal = response?.patientPortal;
      const createdPatientDbId = patientPortal?.patient?._id || patientDbId;

      if (patientPortal?.access) {
        setPortalCredentials({
          name: patient.name,
          loginUrl: patientPortal.access.loginUrl,
          email: patientPortal.access.email,
          password: patientPortal.access.password
        });
        
        notifySuccess('Patient portal created', `${patient.name} has been granted access.`, 4000);

        if (patientPortal.user?.inviteEmail && !patientPortal.user.inviteEmail.delivered) {
          notifyWarning(
            'Invite email not delivered',
            'SMTP is not delivering the invite right now. Share the login details manually or fix SMTP settings.',
            7000
          );
        }
      }

      if (patientPortal?.patient?.patientId) {
        setPatient((current) => ({
          ...current,
          recordId: patientPortal.patient.patientId,
        }));
      }

      setMessage(`Prescription ${createdPrescription?.rxId || ''} submitted to pharmacy successfully.`);
      // Notify other views (e.g., dashboard) that prescriptions/patient data changed
      try { window.dispatchEvent(new CustomEvent('pims:data:changed', { detail: { resource: 'prescriptions' } })); } catch (_) {}
      setItems([]);
      if (editId) {
        navigate('/prescription/new');
      }
      setSelectedPatientDbId(createdPatientDbId);
      setSelectedPatientHasPortal(Boolean(patientPortal?.user));
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Failed to submit prescription'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page">
      {message ? (
        <div className="notice-banner">
          <div>
            <strong>Prescription workflow updated</strong>
            <div className="helper-text">{message}</div>
          </div>
          <button className="button-ghost" onClick={() => setMessage('')} type="button">Dismiss</button>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="notice-banner">
          <div>
            <strong>Prescription submission failed</strong>
            <div className="helper-text">{errorMessage}</div>
          </div>
        </div>
      ) : null}

      <div className="prescription-form-grid">
        <section className="panel">
          <div className="section-title">
            <AppIcon name="users" size={20} />
            <h3>Patient Information</h3>
          </div>
          <p className="helper-text">Use a live patient record or enter a new patient for creation on submit.</p>

          <div className="field-grid">
            <div className="field-grid two">
              <label className="field-label">
                <span>Patient ID / Search</span>
                <input
                  onChange={(event) => updatePatientField('recordId', event.target.value)}
                  placeholder="Search existing patient by ID, or use generated ID for new patient"
                  value={patient.recordId}
                />
              </label>
              <label className="field-label">
                <span>Full Name</span>
                <input
                  onChange={(event) => updatePatientField('name', event.target.value)}
                  placeholder="Patient name"
                  value={patient.name}
                />
              </label>
            </div>
            <div className="field-grid two">
              <label className="field-label">
                <span>Date of Birth</span>
                <input
                  onChange={(event) => updatePatientField('dob', event.target.value)}
                  type="date"
                  value={patient.dob}
                />
              </label>
              <label className="field-label">
                <span>Gender</span>
                <select
                  onChange={(event) => updatePatientField('gender', event.target.value)}
                  value={patient.gender}
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </label>
            </div>
            <label className="field-label">
              <span>Patient Email for Login {selectedPatientDbId && !selectedPatientHasPortal ? '(required for portal invite)' : ''}</span>
              <input
                onChange={(event) => updatePatientField('email', event.target.value)}
                placeholder="patient@example.com"
                type="email"
                value={patient.email}
              />
            </label>
            <label className="field-label">
              <span>Allergies</span>
              <input
                onChange={(event) => updatePatientField('allergiesText', event.target.value)}
                placeholder="Comma-separated allergies"
                value={patient.allergiesText}
              />
            </label>
          </div>

          {patientSuggestions.length ? (
            <div style={{ marginTop: '1rem' }}>
              <div className="caption" style={{ marginBottom: '0.6rem' }}>Matching Patients</div>
              <div className="mini-list">
                {patientSuggestions.map((entry) => (
                  <button className="mini-list-item" key={entry._id} onClick={() => selectPatient(entry)} type="button">
                    <div>
                      <strong>{entry.name}</strong>
                      <div className="helper-text">
                        {entry.patientId} · {entry.gender} · {entry.dob ? new Date(entry.dob).toLocaleDateString() : 'No DOB'}
                      </div>
                    </div>
                    <span className="pill">Use</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div style={{ marginTop: '1rem' }}>
            <div className="section-title">
              <AppIcon name="info" size={18} />
              <h4>Clinical Alerts & Allergies</h4>
            </div>
            <div className="mini-list">
              {patient.allergiesText ? parseAllergies(patient.allergiesText).map((alert) => (
                <div className="mini-list-item is-warning" key={alert.substance}>
                  <span>{alert.substance}</span>
                  <span className="status-pill status-warning">{alert.severity}</span>
                </div>
              )) : (
                <div className="mini-list-item">
                  <span>No allergy data entered for this patient yet.</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="section-title">
            <AppIcon name="search" size={20} />
            <h3>Medicine Picker</h3>
          </div>
          <p className="helper-text">Search the live medicine catalog by brand, generic name, or ATC code.</p>

          <label className="search-field">
            <AppIcon name="search" size={18} />
            <input
              onChange={(event) => setMedicineQuery(event.target.value)}
              placeholder="Search medicine database..."
              type="search"
              value={medicineQuery}
            />
          </label>

          <div style={{ marginTop: '1rem' }}>
            <div className="caption" style={{ marginBottom: '0.6rem' }}>Search Results</div>
            <div className="results-list">
              {medicineResults.map((medicine) => (
                <button key={medicine._id} onClick={() => addMedicine(medicine)} type="button">
                  <div>
                    <strong>{medicine.name}</strong>
                    <div className="helper-text">
                      {medicine.genericName} · ATC: {medicine.atcCode}
                    </div>
                  </div>
                  <span className="status-pill status-success">Add to Rx</span>
                </button>
              ))}
              {!medicineResults.length ? (
                <div className="helper-text" style={{ padding: '1rem' }}>
                  No medicine matches found yet.
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <section className="table-panel">
        <div className="toolbar">
          <div className="page-title">
            <div className="section-title">
              <AppIcon name="prescription" size={20} />
              <h3>Prescription Items</h3>
            </div>
            <p className="helper-text">Adjust dosage and instructions for each selected medicine.</p>
          </div>
          <div className="toolbar-group">
            <span className="helper-text">Signed by {getStoredDisplayName() || 'Current doctor'}</span>
            <button className="button-secondary" type="button">
              <AppIcon name="info" size={16} />
              Drug Interactions
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Medicine (ATC)</th>
                <th>Dose</th>
                <th>Frequency</th>
                <th>Route</th>
                <th>Duration (days)</th>
                <th>Instructions</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.atcCode}-${index}`}>
                  <td>
                    <strong>{item.name}</strong>
                    <div className="helper-text">{item.atcCode}</div>
                  </td>
                  <td>
                    <input onChange={(event) => updateItem(index, 'dose', event.target.value)} value={item.dose} />
                  </td>
                  <td>
                    <input
                      onChange={(event) => updateItem(index, 'frequency', event.target.value)}
                      placeholder="e.g. Twice daily"
                      value={item.frequency}
                    />
                  </td>
                  <td>
                    <input onChange={(event) => updateItem(index, 'route', event.target.value)} value={item.route} />
                  </td>
                  <td>
                    <input
                      onChange={(event) => updateItem(index, 'durationDays', event.target.value)}
                      type="number"
                      value={item.durationDays}
                    />
                  </td>
                  <td>
                    <input
                      onChange={(event) => updateItem(index, 'instructions', event.target.value)}
                      placeholder="Instructions"
                      value={item.instructions}
                    />
                  </td>
                  <td>
                    <button className="button-ghost" onClick={() => removeItem(index)} type="button">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td className="helper-text" colSpan="7">No medicines added yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="content-grid-3">
        <section className="panel">
          <div className="section-title">
            <AppIcon name="checkCircle" size={18} />
            <h3>Validation Status</h3>
          </div>
          <h2 className="metric-value">{validation.title}</h2>
          <div className="helper-text">{validation.detail}</div>
          <div className="panel-actions">
            <span className={validation.tone}>{validation.title}</span>
          </div>
        </section>

        <section className="panel">
          <div className="section-title">
            <AppIcon name="pill" size={18} />
            <h3>Total Items</h3>
          </div>
          <h2 className="metric-value">{items.length}</h2>
          <div className="helper-text">Medicines scheduled for dispense.</div>
        </section>

        <section className="panel">
          <label className="checkbox-row">
            <input checked={urgent} onChange={(event) => setUrgent(event.target.checked)} type="checkbox" />
            <span>Mark as Urgent / STAT</span>
          </label>
          <label className="checkbox-row" style={{ marginTop: '1rem' }}>
            <input checked={allowRefills} onChange={(event) => setAllowRefills(event.target.checked)} type="checkbox" />
            <span>Allow automatic refills (x3)</span>
          </label>
        </section>
      </div>

      <div className="toolbar prescription-actions">
        <div className="helper-text">
          Pharmacists will receive this digitally upon submission. Digital signature will be generated by the backend.
        </div>
        <div className="toolbar-group">
          <button className="button-ghost" onClick={() => navigate('/dashboard')} type="button">Cancel</button>
          <button className="button-secondary" disabled={isSavingDraft || isSubmitting} onClick={handleDraftSave} type="button">
            <AppIcon name="note" size={16} />
            {isSavingDraft ? 'Saving...' : 'Save Draft'}
          </button>
          <button className="button-primary" disabled={isSubmitting || isSavingDraft} onClick={handleSubmit} type="button">
            <AppIcon name="arrowRight" size={16} />
            {isSubmitting ? 'Submitting...' : 'Submit to Pharmacy'}
          </button>
        </div>
      </div>

      {portalCredentials ? (
        <div className="user-modal-backdrop" style={{ zIndex: 10000 }}>
          <div className="user-modal" role="dialog" aria-modal="true" style={{ width: 'min(100%, 460px)' }}>
            <div className="page-title" style={{ marginBottom: '1.5rem' }}>
              <div className="section-title">
                <AppIcon name="checkCircle" size={20} />
                <h3>Portal Access Created</h3>
              </div>
              <p className="helper-text">Share these credentials with the patient securely.</p>
            </div>
            
            <div style={{ background: 'var(--surface-muted)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid var(--line)' }}>
              <div style={{ marginBottom: '0.8rem' }}>
                <span className="caption">Login URL</span>
                <div style={{ wordBreak: 'break-all', fontWeight: '500' }}>{portalCredentials.loginUrl}</div>
              </div>
              <div style={{ marginBottom: '0.8rem' }}>
                <span className="caption">Email</span>
                <div style={{ fontWeight: '500' }}>{portalCredentials.email}</div>
              </div>
              {portalCredentials.password ? (
                <div>
                  <span className="caption">Temporary Password</span>
                  <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', background: 'var(--surface)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--line)', marginTop: '0.2rem' }}>
                    {portalCredentials.password}
                  </div>
                </div>
              ) : null}
            </div>
            
            <div className="toolbar" style={{ justifyContent: 'flex-end' }}>
              <button className="button-primary" onClick={() => setPortalCredentials(null)} type="button">
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
