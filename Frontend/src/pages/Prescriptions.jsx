import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import AppIcon from '../components/AppIcon';
import {
  downloadPrescriptionPdf,
  getApiMessage
} from '../api/pimsApi';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { ROLES } from '../constants/roles';
import { getStoredRole } from '../utils/session';
import useToast from '../hooks/useToast';
import {
  clearPrescriptionsError,
  fetchPrescriptionDetail,
  fetchPrescriptions,
  setSelectedPrescriptionFallback,
  updatePrescriptionStatusById
} from '../store/slices/prescriptionsSlice';

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
  return 'status-pill status-neutral';
}

function isToday(dateValue) {
  return new Date(dateValue).toDateString() === new Date().toDateString();
}

function isSelectionKey(event) {
  return event.key === 'Enter' || event.key === ' ';
}

function getPatientRef(record) {
  const value = record?.patientId;

  if (!value) {
    return { id: '', patient: null };
  }

  if (typeof value === 'string') {
    return { id: value, patient: null };
  }

  const id = value._id || value.id || '';
  return { id, patient: value };
}

export default function Prescriptions() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const role = getStoredRole();
  const isPharmacist = role === ROLES.PHARMACIST;
  const canViewPatientRecord = role === ROLES.DOCTOR || role === ROLES.ADMIN || role === ROLES.PHARMACIST;
  const records = useSelector((state) => state.prescriptions.items);
  const pagination = useSelector((state) => state.prescriptions.pagination);
  const selectedRecord = useSelector((state) => state.prescriptions.selected);
  const isLoading = useSelector((state) => state.prescriptions.isLoading);
  const isUpdating = useSelector((state) => state.prescriptions.isUpdating);
  const errorMessage = useSelector((state) => state.prescriptions.errorMessage);
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Issued: Newest');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, confirmText: 'Confirm', variant: 'primary', isError: false });
  const { notifyError, notifySuccess } = useToast();

  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    dispatch(fetchPrescriptions({
      page,
      limit,
      q: debouncedQuery || undefined,
      status: statusFilter !== 'All' ? statusFilter : undefined
    }));
  }, [debouncedQuery, dispatch, limit, page, statusFilter]);

  useEffect(() => {
    if (!selectedId && records.length) {
      setSelectedId(records[0]._id);
    }
    if (selectedId && records.length && !records.some((record) => record._id === selectedId)) {
      setSelectedId(records[0]._id);
    }
    if (!records.length) {
      setSelectedId('');
    }
  }, [records, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      dispatch(setSelectedPrescriptionFallback(null));
      return;
    }

    dispatch(fetchPrescriptionDetail(selectedId)).unwrap().catch(() => {
      dispatch(setSelectedPrescriptionFallback(records.find((record) => record._id === selectedId) || null));
    });
  }, [dispatch, records, selectedId]);

  const sortedRecords = useMemo(() => {
    const clone = [...records];

    if (sortBy === 'Issued: Oldest') {
      return clone.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    if (sortBy === 'Patient: A-Z') {
      return clone.sort((a, b) => String(a.patientId?.name || '').localeCompare(String(b.patientId?.name || '')));
    }

    if (sortBy === 'Patient: Z-A') {
      return clone.sort((a, b) => String(b.patientId?.name || '').localeCompare(String(a.patientId?.name || '')));
    }

    return clone.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [records, sortBy]);

  const totals = {
    total: pagination.total,
    pending: records.filter((item) => item.status === 'Pending' || item.status === 'Processing').length,
    filled: records.filter((item) => item.status === 'Filled' && isToday(item.updatedAt)).length,
    successRate: records.length
      ? `${Math.round((records.filter((item) => item.status === 'Filled').length / records.length) * 100)}%`
      : '0%'
  };

  const handlePdfDownload = async () => {
    if (!selectedRecord?._id) {
      return;
    }

    try {
      const response = await downloadPrescriptionPdf(selectedRecord._id);
      const fileUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `${selectedRecord.rxId || 'prescription'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(fileUrl);
      notifySuccess('PDF ready', 'Prescription PDF downloaded.');
    } catch (error) {
      notifyError('PDF download failed', getApiMessage(error, 'Failed to download prescription PDF'));
    }
  };

  const handleStatusChange = (status) => {
    if (!selectedRecord?._id) {
      return;
    }

    setConfirmDialog({
      isOpen: true,
      isError: false,
      title: `Mark as ${status}?`,
      message: `Are you sure you want to change the status of prescription ${selectedRecord.rxId || ''} to ${status}?`,
      confirmText: `Yes, Mark ${status}`,
      variant: status === 'Cancelled' ? 'danger' : 'primary',
      onConfirm: async () => {
        try {
          dispatch(clearPrescriptionsError());
          const updated = await dispatch(updatePrescriptionStatusById({ id: selectedRecord._id, status })).unwrap();
          notifySuccess('Prescription updated', `${updated.rxId} moved to ${updated.status}.`);
        } catch (error) {
          setConfirmDialog({
            isOpen: true,
            isError: true,
            title: 'Status Update Failed',
            message: String(error || 'Failed to update prescription status. Please check inventory levels.'),
            confirmText: 'Dismiss',
            variant: 'primary',
            onConfirm: null
          });
        }
      }
    });
  };

  const handleViewPatient = (record) => {
    const { id, patient } = getPatientRef(record);

    if (!canViewPatientRecord) {
      notifyError('Access denied', 'Your role does not have permission to open patient records.');
      return;
    }

    if (!id) {
      notifyError('Patient link unavailable', 'This prescription row does not include a patient record reference.');
      return;
    }

    navigate(`/patients/${id}/details`, patient ? { state: { patient } } : undefined);
  };

  return (
    <section className="page">
      {errorMessage ? (
        <div className="notice-banner" role="alert">
          <div>
            <strong>Prescription data issue</strong>
            <div className="helper-text">{errorMessage}</div>
          </div>
          <button className="button-ghost" onClick={() => dispatch(clearPrescriptionsError())} type="button">Dismiss</button>
        </div>
      ) : null}

      <div className="stats-grid">
        <section className="panel">
          <strong>Total</strong>
          <h2>{totals.total}</h2>
        </section>
        <section className="panel">
          <strong>Pending Review</strong>
          <h2>{totals.pending}</h2>
        </section>
        <section className="panel">
          <strong>Filled Today</strong>
          <h2>{totals.filled}</h2>
        </section>
        <section className="panel">
          <strong>Success Rate</strong>
          <h2>{totals.successRate}</h2>
        </section>
      </div>

      <div className="prescription-layout">
        <section className="table-panel">
          <div className="toolbar">
            <div className="toolbar-group">
              <label className="search-field" style={{ minWidth: '280px' }}>
                <span className="visually-hidden">Search prescriptions</span>
                <AppIcon name="search" size={18} />
                <input
                  aria-label="Search prescriptions"
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search prescriptions..."
                  type="search"
                  value={query}
                />
              </label>
              <select
                aria-label="Filter prescriptions by status"
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                value={statusFilter}
              >
                <option>All</option>
                <option>Pending</option>
                <option>Processing</option>
                <option>Filled</option>
                <option>Cancelled</option>
              </select>
              <select aria-label="Sort prescriptions" onChange={(event) => setSortBy(event.target.value)} value={sortBy}>
                <option>Issued: Newest</option>
                <option>Issued: Oldest</option>
                <option>Patient: A-Z</option>
                <option>Patient: Z-A</option>
              </select>
              <select
                aria-label="Prescriptions per page"
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(1);
                }}
                value={limit}
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
            <div className="toolbar-group">
              <span className="helper-text">Page {pagination.page} of {pagination.totalPages}</span>
              <button
                aria-label="Download selected prescription as PDF"
                className="button-secondary"
                disabled={!selectedRecord || isUpdating}
                onClick={handlePdfDownload}
                type="button"
              >
                Print PDF
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table aria-busy={isLoading ? 'true' : 'false'} className="data-table">
              <caption className="visually-hidden">Prescriptions table with selectable rows</caption>
              <thead>
                <tr>
                  <th>Prescription ID</th>
                  <th>Patient</th>
                  <th>Drug</th>
                  <th>Issued</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedRecords.map((record) => (
                  (() => {
                    const patientRef = getPatientRef(record);

                    return (
                  <tr
                    aria-selected={selectedId === record._id}
                    key={record._id}
                    onClick={() => setSelectedId(record._id)}
                    onKeyDown={(event) => {
                      if (isSelectionKey(event)) {
                        event.preventDefault();
                        setSelectedId(record._id);
                      }
                    }}
                    tabIndex={0}
                    style={{ background: selectedId === record._id ? 'rgba(15, 155, 142, 0.05)' : undefined, cursor: 'pointer' }}
                  >
                    <td>{record.rxId}</td>
                    <td>{record.patientId?.name || 'Unknown patient'}</td>
                    <td>{record.items?.[0]?.medicineId?.name || record.items?.[0]?.atcCode || 'N/A'}</td>
                    <td>{new Date(record.createdAt).toLocaleDateString()}</td>
                    <td><span className={statusClass(record.status)}>{record.status}</span></td>
                    <td>{record.isUrgent ? 'STAT' : 'Normal'}</td>
                    <td>
                      <button
                        className="button-ghost"
                        disabled={!canViewPatientRecord || !patientRef.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleViewPatient(record);
                        }}
                        type="button"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                    );
                  })()
                ))}
                {!isLoading && !sortedRecords.length ? (
                  <tr>
                    <td className="helper-text" colSpan="7">No prescriptions match the current filters.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div aria-label="Prescription pagination" className="toolbar" role="navigation">
            <button
              className="button-secondary"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              Previous
            </button>
            <button
              className="button-secondary"
              disabled={pagination.page >= pagination.totalPages || isLoading}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        </section>

        <aside className="detail-side-panel">
          <section className="panel" style={{ borderBottom: '2px solid rgba(15,118,110,0.18)' }}>
            <div className="section-title">
              <AppIcon name="note" size={18} />
              <h3 style={{ margin: 0 }}>Prescription Details</h3>
            </div>
          </section>

          <section className="panel">
            {selectedRecord ? (
              <div className="stack">

                {/* Rx Meta Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div style={{ padding: '0.6rem 0.75rem', background: 'var(--surface-muted)', borderRadius: '8px', borderLeft: '2px solid #14b8a6' }}>
                    <div className="caption">Rx ID</div>
                    <strong style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{selectedRecord.rxId || '—'}</strong>
                  </div>
                  <div style={{ padding: '0.6rem 0.75rem', background: 'var(--surface-muted)', borderRadius: '8px', borderLeft: '2px solid var(--line-strong)' }}>
                    <div className="caption">Issued</div>
                    <strong style={{ fontSize: '0.83rem' }}>{selectedRecord.createdAt ? new Date(selectedRecord.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</strong>
                  </div>
                </div>

                {/* Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className={statusClass(selectedRecord.status)}>{selectedRecord.status}</span>
                  {selectedRecord.isUrgent && <span className="status-pill status-critical">URGENT</span>}
                </div>

                {/* Patient */}
                <div style={{ padding: '0.8rem', background: 'var(--surface-muted)', borderRadius: '10px', display: 'grid', gap: '0.15rem' }}>
                  <div className="caption" style={{ color: 'var(--accent-strong)' }}>Patient</div>
                  <strong style={{ fontSize: '0.95rem' }}>{selectedRecord.patientId?.name || 'Unknown patient'}</strong>
                  <div className="helper-text" style={{ fontFamily: 'monospace', fontSize: '0.81rem' }}>{selectedRecord.patientId?.patientId || 'No patient ID'}</div>
                </div>

                {/* Diagnosis */}
                <div>
                  <div className="caption">Diagnosis</div>
                  <div style={{ color: 'var(--text)', fontSize: '0.9rem', lineHeight: 1.5, marginTop: '0.1rem' }}>{selectedRecord.diagnosis || 'Not specified'}</div>
                </div>

                {/* Doctor */}
                {selectedRecord.doctorId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(15,118,110,0.12)', border: '1px solid rgba(15,118,110,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f766e', fontSize: '0.78rem', fontWeight: 700, flexShrink: 0 }}>
                      {(selectedRecord.doctorId.firstName?.[0] || '') + (selectedRecord.doctorId.lastName?.[0] || '')}
                    </div>
                    <div>
                      <div className="caption">Prescribing Doctor</div>
                      <div style={{ fontSize: '0.88rem' }}>Dr. {[selectedRecord.doctorId.firstName, selectedRecord.doctorId.lastName].filter(Boolean).join(' ') || '—'}</div>
                    </div>
                  </div>
                )}

                {/* Sig */}
                <div>
                  <div className="caption">Digital Signature</div>
                  <div className="helper-text" style={{ fontFamily: 'monospace', fontSize: '0.79rem' }}>{selectedRecord.digitalSignature || 'Auto-generated'}</div>
                </div>

                {/* Items */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                    <div className="caption">Medications</div>
                    <span style={{ fontWeight: 600, color: 'var(--accent-strong)', fontSize: '0.8rem' }}>
                      ×{(selectedRecord.items || []).length}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gap: '0.45rem' }}>
                    {(selectedRecord.items || []).map((item, idx) => (
                      <div
                        key={`${selectedRecord._id}-${item.atcCode}-${idx}`}
                        style={{
                          padding: '0.65rem 0.8rem',
                          background: 'var(--surface-muted)',
                          borderRadius: '10px',
                          borderLeft: '2px solid #14b8a6',
                          display: 'grid',
                          gap: '0.2rem'
                        }}
                      >
                        <strong style={{ fontSize: '0.88rem' }}>{item.medicineId?.name || item.atcCode}</strong>
                        <div className="helper-text" style={{ fontSize: '0.81rem' }}>
                          {[item.dose, item.frequency, item.route, item.durationDays ? `${item.durationDays}d` : null].filter(Boolean).join(' · ')}
                        </div>
                        {item.instructions && (
                          <div style={{ fontSize: '0.79rem', color: '#d97706', marginTop: '0.1rem' }}>
                            ⚠ {item.instructions}
                          </div>
                        )}

                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="helper-text" style={{ padding: '1rem 0' }}>Select a prescription to view details.</div>
            )}

          </section>

          {isPharmacist && selectedRecord ? (
            <section className="panel">
              <div className="section-title">
                <AppIcon name="checkCircle" size={18} />
                <h4>Pharmacist Actions</h4>
              </div>
              <div className="toolbar-group">
                <button className="button-secondary" onClick={() => handleStatusChange('Processing')} type="button">
                  {isUpdating ? 'Updating...' : 'Mark Processing'}
                </button>
                <button className="button-primary" disabled={isUpdating} onClick={() => handleStatusChange('Filled')} type="button">
                  Mark Filled
                </button>
                <button className="button-ghost" disabled={isUpdating} onClick={() => handleStatusChange('Cancelled')} type="button">
                  Cancel
                </button>
              </div>
            </section>
          ) : null}
        </aside>
      </div>

      {confirmDialog.isOpen ? (
        <div className="user-modal-backdrop" style={{ zIndex: 10000 }}>
          <div className="user-modal" role="dialog" aria-modal="true" style={{ width: 'min(100%, 420px)' }}>
            <div className="page-title" style={{ marginBottom: '1rem' }}>
              <div className="section-title">
                <AppIcon name={confirmDialog.isError ? "alert" : "helpCircle"} size={20} />
                <h3 style={confirmDialog.isError ? { color: 'var(--danger)' } : {}}>{confirmDialog.title}</h3>
              </div>
            </div>
            <p style={{ marginBottom: '2rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
              {confirmDialog.message}
            </p>
            <div className="toolbar" style={{ justifyContent: 'flex-end' }}>
              {!confirmDialog.isError && (
                <button className="button-ghost" onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} type="button">
                  Cancel
                </button>
              )}
              <button
                className={confirmDialog.variant === 'danger' ? 'button-ghost' : 'button-primary'}
                style={confirmDialog.variant === 'danger' ? { color: 'var(--danger)' } : {}}
                onClick={() => {
                  setConfirmDialog({ ...confirmDialog, isOpen: false });
                  if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                }}
                type="button"
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
