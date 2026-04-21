import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppIcon from '../components/AppIcon';
import useDebouncedValue from '../hooks/useDebouncedValue';
import useToast from '../hooks/useToast';
import { createMedicine, createPatientPortalAccount, getApiMessage, listPatients } from '../api/pimsApi';
import {
  clearAdminUsersError,
  createAdminUser,
  permanentlyDeleteAdminUser,
  setAdminUserStatus,
  fetchAdminUsers
} from '../store/slices/adminUsersSlice';

function userStatusClass(isActive) {
  return isActive ? 'status-pill status-success' : 'status-pill status-warning';
}

function formatDateTime(value) {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleString();
}

const emptyForm = {
  firstName: '',
  lastName: '',
  role: 'DOCTOR',
  email: '',
  password: 'test123',
  isActive: true
};

const emptyPortalForm = {
  patientId: '',
  firstName: '',
  lastName: '',
  email: '',
  password: 'Temp123!'
};

const emptyMedicineForm = {
  name: '',
  genericName: '',
  atcCode: '',
  brand: '',
  strength: '',
  dosageForm: 'Tablet',
  manufacturer: '',
  mrp: ''
};

const emptyPatientLookup = {
  query: '',
  results: [],
  isLoading: false,
  errorMessage: ''
};

export default function Admin() {
  const dispatch = useDispatch();
  const authUser = useSelector((state) => state.auth.user);
  const users = useSelector((state) => state.adminUsers.items);
  const pagination = useSelector((state) => state.adminUsers.pagination);
  const isLoading = useSelector((state) => state.adminUsers.isLoading);
  const isSubmitting = useSelector((state) => state.adminUsers.isSubmitting);
  const errorMessage = useSelector((state) => state.adminUsers.errorMessage);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [managedUser, setManagedUser] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [form, setForm] = useState(emptyForm);
  const [portalForm, setPortalForm] = useState(emptyPortalForm);
  const [medicineForm, setMedicineForm] = useState(emptyMedicineForm);
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);
  const [isMedicineModalOpen, setIsMedicineModalOpen] = useState(false);
  const [patientLookup, setPatientLookup] = useState(emptyPatientLookup);
  const { notifyError, notifySuccess } = useToast();
  const debouncedQuery = useDebouncedValue(searchQuery, 300);
  const debouncedPatientLookup = useDebouncedValue(patientLookup.query, 300);

  const queryParams = useMemo(() => ({
    page,
    limit,
    q: debouncedQuery || undefined,
    role: roleFilter !== 'All' ? roleFilter : undefined,
    isActive: statusFilter === 'Active' ? 'true' : statusFilter === 'Inactive' ? 'false' : undefined
  }), [debouncedQuery, limit, page, roleFilter, statusFilter]);

  useEffect(() => {
    dispatch(fetchAdminUsers(queryParams));
  }, [dispatch, queryParams]);

  useEffect(() => {
    if (!managedUser?._id) {
      return;
    }

    const nextUser = users.find((user) => user._id === managedUser._id);
    if (!nextUser) {
      setManagedUser(null);
    }
  }, [managedUser, users]);

  useEffect(() => {
    if (!isModalOpen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isModalOpen]);

  useEffect(() => {
    if (!managedUser) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setManagedUser(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [managedUser]);

  useEffect(() => {
    if (!isPortalModalOpen) {
      setPatientLookup(emptyPatientLookup);
      return undefined;
    }

    let isActive = true;

    async function searchPatients() {
      const query = String(debouncedPatientLookup || '').trim();

      if (!query) {
        setPatientLookup((current) => ({ ...current, results: [], isLoading: false, errorMessage: '' }));
        return;
      }

      setPatientLookup((current) => ({ ...current, isLoading: true, errorMessage: '' }));

      try {
        const data = await listPatients({ q: query, limit: 5 });

        if (!isActive) {
          return;
        }

        setPatientLookup((current) => ({
          ...current,
          isLoading: false,
          results: data?.patients || [],
          errorMessage: ''
        }));
      } catch (error) {
        if (!isActive) {
          return;
        }

        setPatientLookup((current) => ({
          ...current,
          isLoading: false,
          results: [],
          errorMessage: getApiMessage(error, 'Failed to search patients')
        }));
      }
    }

    searchPatients();

    return () => {
      isActive = false;
    };
  }, [debouncedPatientLookup, isPortalModalOpen]);

  useEffect(() => {
    if (!isMedicineModalOpen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMedicineModalOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMedicineModalOpen]);

  const summary = useMemo(() => ({
    total: pagination.total,
    active: users.filter((user) => user.isActive).length,
    inactive: users.filter((user) => !user.isActive).length
  }), [pagination.total, users]);

  const isManagingOwnAccount = useMemo(() => {
    const currentId = String(authUser?._id || authUser?.id || '');
    const targetId = String(managedUser?._id || managedUser?.id || '');
    return Boolean(currentId && targetId && currentId === targetId);
  }, [authUser, managedUser]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updatePortalForm = (field, value) => {
    setPortalForm((current) => ({ ...current, [field]: value }));
  };

  const updateMedicineForm = (field, value) => {
    setMedicineForm((current) => ({ ...current, [field]: value }));
  };

  const selectPatientLookup = (patient) => {
    setPortalForm((current) => ({
      ...current,
      patientId: patient._id,
      firstName: current.firstName || patient.name?.split(' ')?.[0] || '',
      lastName: current.lastName || patient.name?.split(' ')?.slice(1).join(' ') || '',
    }));
    setPatientLookup((current) => ({
      ...current,
      query: patient.name || patient.patientId || '',
      results: [patient],
      errorMessage: '',
    }));
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();

    try {
      dispatch(clearAdminUsersError());
      const user = await dispatch(createAdminUser(form)).unwrap();
      setForm(emptyForm);
      setIsModalOpen(false);
      setPage(1);
      dispatch(fetchAdminUsers({ ...queryParams, page: 1 }));
      notifySuccess('User created', `${user.firstName} ${user.lastName} created successfully.`);
    } catch (error) {
      notifyError('User creation failed', String(error || 'Failed to create user'));
    }
  };

  const handleCreatePatientPortal = async (event) => {
    event.preventDefault();

    try {
      dispatch(clearAdminUsersError());
      const result = await createPatientPortalAccount(portalForm.patientId, {
        firstName: portalForm.firstName,
        lastName: portalForm.lastName,
        email: portalForm.email,
        password: portalForm.password,
      });

      setPortalForm(emptyPortalForm);
      setIsPortalModalOpen(false);
      setPage(1);
      dispatch(fetchAdminUsers({ ...queryParams, page: 1 }));
      notifySuccess(
        'Patient portal created',
        `${result?.patient?.name || 'Patient'} can now log in with the linked account.`
      );
    } catch (error) {
      notifyError('Patient portal creation failed', String(error || 'Failed to create patient portal account'));
    }
  };

  const handleCreateMedicine = async (event) => {
    event.preventDefault();

    try {
      const medicine = await createMedicine({
        ...medicineForm,
        mrp: medicineForm.mrp === '' ? 0 : Number(medicineForm.mrp),
      });

      setMedicineForm(emptyMedicineForm);
      setIsMedicineModalOpen(false);
      notifySuccess(
        'Medicine created',
        `${medicine?.name || medicineForm.name || 'Medicine'} is now available for inventory batches.`
      );
    } catch (error) {
      notifyError('Medicine creation failed', String(error || 'Failed to create medicine'));
    }
  };

  const handleToggleUserStatus = async (user) => {
    const nextIsActive = !user?.isActive;
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'this user';
    const actionLabel = nextIsActive ? 'Activate' : 'Deactivate';
    const shouldProceed = window.confirm(
      `${actionLabel} ${fullName}? ${nextIsActive ? 'They will be able to log in again.' : 'This will disable account login access.'}`
    );

    if (!shouldProceed) {
      return;
    }

    try {
      dispatch(clearAdminUsersError());
      await dispatch(setAdminUserStatus({ userId: user._id, isActive: nextIsActive })).unwrap();
      dispatch(fetchAdminUsers(queryParams));
      notifySuccess(
        `User ${nextIsActive ? 'activated' : 'deactivated'}`,
        `${fullName} is now ${nextIsActive ? 'active' : 'inactive'}.`
      );
    } catch (error) {
      notifyError('Status update failed', String(error || 'Failed to update user status'));
    }
  };

  const handlePermanentDeleteUser = async (user) => {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'this user';
    const warning =
      `Permanently delete ${fullName}? This cannot be undone.\n\n` +
      'Recommended: deactivate first, then delete only if you are sure.';
    const shouldProceed = window.confirm(warning);

    if (!shouldProceed) {
      return;
    }

    try {
      dispatch(clearAdminUsersError());
      await dispatch(permanentlyDeleteAdminUser(user._id)).unwrap();
      dispatch(fetchAdminUsers(queryParams));
      notifySuccess('User permanently deleted', `${fullName} has been removed from the system.`);
      setManagedUser(null);
    } catch (error) {
      notifyError('Permanent delete failed', String(error || 'Failed to permanently delete user'));
    }
  };

  const handleSelectUser = (user) => {
    setManagedUser(user);
  };

  return (
    <section className="page">
      {errorMessage ? (
        <div className="notice-banner" role="alert">
          <div>
            <strong>User management issue</strong>
            <div className="helper-text">{errorMessage}</div>
          </div>
          <button className="button-ghost" onClick={() => dispatch(clearAdminUsersError())} type="button">Dismiss</button>
        </div>
      ) : null}

      <div className="toolbar admin-toolbar">
        <div className="stats-grid admin-summary-grid">
          <section className="panel">
            <strong>Total Users</strong>
            <h2>{summary.total}</h2>
          </section>
          <section className="panel">
            <strong>Active</strong>
            <h2>{summary.active}</h2>
          </section>
          <section className="panel">
            <strong>Inactive</strong>
            <h2>{summary.inactive}</h2>
          </section>
        </div>
        <button className="button-primary" onClick={() => setIsModalOpen(true)} type="button">
          <AppIcon name="plusCircle" size={16} />
          Create User
        </button>
        <button className="button-secondary" onClick={() => setIsPortalModalOpen(true)} type="button">
          <AppIcon name="users" size={16} />
          Create Patient Portal
        </button>
        <button className="button-primary" onClick={() => setIsMedicineModalOpen(true)} type="button">
          <AppIcon name="plusCircle" size={16} />
          Add Medicine
        </button>
      </div>

      <section className="table-panel">
        <div className="table-head">
          <div className="page-title">
            <div className="section-title">
              <AppIcon name="users" size={20} />
              <h3>User Directory</h3>
            </div>
            <p className="helper-text">Manage platform access, role assignments, and account status.</p>
          </div>
          <div className="toolbar-group">
            <label className="search-field" style={{ minWidth: '240px' }}>
              <span className="visually-hidden">Search users</span>
              <AppIcon name="search" size={16} />
              <input
                aria-label="Search users by name, email, or id"
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search name/email/id"
                type="search"
                value={searchQuery}
              />
            </label>
            <select
              aria-label="Filter users by role"
              onChange={(event) => {
                setRoleFilter(event.target.value);
                setPage(1);
              }}
              value={roleFilter}
            >
              <option>All</option>
              <option>DOCTOR</option>
              <option>PHARMACIST</option>
              <option>ADMIN</option>
              <option>PATIENT</option>
            </select>
            <select
              aria-label="Filter users by status"
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              value={statusFilter}
            >
              <option>All</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <select
              aria-label="Users per page"
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
        </div>

        <div className="table-wrap">
          <table aria-busy={isLoading ? 'true' : 'false'} className="data-table">
            <caption className="visually-hidden">User directory table with account role and status</caption>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Role</th>
                <th>Email</th>
                <th>Status</th>
                <th>Last Seen</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  className={managedUser?._id === user._id ? 'is-selected' : ''}
                  key={user._id}
                  onClick={() => handleSelectUser(user)}
                >
                  <td>{user._id}</td>
                  <td>{[user.firstName, user.lastName].filter(Boolean).join(' ')}</td>
                  <td>{user.role}</td>
                  <td>{user.email}</td>
                  <td><span className={userStatusClass(user.isActive)}>{user.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</td>
                  <td>
                    <span className="helper-text">Click row</span>
                  </td>
                </tr>
              ))}
              {!isLoading && !users.length ? (
                <tr>
                  <td className="helper-text" colSpan="7">No users match the current filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="toolbar">
          <span className="helper-text">Page {pagination.page} of {pagination.totalPages}</span>
          <div className="toolbar-group">
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
        </div>
      </section>

      {isModalOpen ? (
        <div className="user-modal-backdrop">
          <form aria-labelledby="create-user-title" aria-modal="true" className="user-modal" onSubmit={handleCreateUser} role="dialog">
            <div className="toolbar">
              <div className="page-title">
                <div className="section-title">
                  <AppIcon name="plusCircle" size={20} />
                  <h3 id="create-user-title">Create New User Profile</h3>
                </div>
                <p className="helper-text">Add a doctor, pharmacist, or administrator account.</p>
              </div>
              <button className="button-ghost" onClick={() => setIsModalOpen(false)} type="button">
                Close
              </button>
            </div>

            <div className="field-grid">
              <div className="field-grid two">
                <label className="field-label">
                  <span>First Name</span>
                  <input onChange={(event) => updateForm('firstName', event.target.value)} required value={form.firstName} />
                </label>
                <label className="field-label">
                  <span>Last Name</span>
                  <input onChange={(event) => updateForm('lastName', event.target.value)} required value={form.lastName} />
                </label>
              </div>
              <div className="field-grid two">
                <label className="field-label">
                  <span>Email</span>
                  <input onChange={(event) => updateForm('email', event.target.value)} required type="email" value={form.email} />
                </label>
                <label className="field-label">
                  <span>Role</span>
                  <select onChange={(event) => updateForm('role', event.target.value)} value={form.role}>
                    <option>DOCTOR</option>
                    <option>PHARMACIST</option>
                    <option>ADMIN</option>
                  </select>
                </label>
              </div>
              <label className="field-label">
                <span>Temporary Password</span>
                <input onChange={(event) => updateForm('password', event.target.value)} required value={form.password} />
              </label>
              <label className="checkbox-row">
                <input checked={form.isActive} onChange={(event) => updateForm('isActive', event.target.checked)} type="checkbox" />
                <span>Activate account immediately</span>
              </label>
            </div>

            <div className="toolbar">
              <button className="button-ghost" onClick={() => setIsModalOpen(false)} type="button">
                Cancel
              </button>
              <button className="button-primary" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Creating...' : 'Create Profile'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {managedUser ? (
        <div className="user-modal-backdrop">
          <section aria-labelledby="manage-user-title" aria-modal="true" className="user-modal manage-user-modal" role="dialog">
            <div className="toolbar">
              <div className="page-title">
                <div className="section-title">
                  <AppIcon name="users" size={20} />
                  <h3 id="manage-user-title">Manage User</h3>
                </div>
                <p className="helper-text">Choose an action for the selected user account.</p>
              </div>
              <button className="button-ghost" onClick={() => setManagedUser(null)} type="button">
                Close
              </button>
            </div>

            <div className="manage-user-profile">
              <div>
                <strong>{[managedUser.firstName, managedUser.lastName].filter(Boolean).join(' ') || managedUser.email}</strong>
                <div className="helper-text">{managedUser.email}</div>
              </div>
              <span className={userStatusClass(managedUser.isActive)}>{managedUser.isActive ? 'Active' : 'Inactive'}</span>
            </div>

            <div className="manage-user-meta-grid">
              <div className="manage-user-meta-item">
                <span className="caption">Role</span>
                <strong>{managedUser.role}</strong>
              </div>
              <div className="manage-user-meta-item">
                <span className="caption">User ID</span>
                <span className="helper-text">{managedUser._id}</span>
              </div>
              <div className="manage-user-meta-item">
                <span className="caption">Created At</span>
                <span className="helper-text">{formatDateTime(managedUser.createdAt)}</span>
              </div>
              <div className="manage-user-meta-item">
                <span className="caption">Updated At</span>
                <span className="helper-text">{formatDateTime(managedUser.updatedAt)}</span>
              </div>
              <div className="manage-user-meta-item">
                <span className="caption">Last Login</span>
                <span className="helper-text">{formatDateTime(managedUser.lastLogin)}</span>
              </div>
            </div>

            <div className="toolbar manage-user-actions">
              <button
                className="button-secondary"
                disabled={isSubmitting || isManagingOwnAccount}
                onClick={() => handleToggleUserStatus(managedUser)}
                type="button"
              >
                {managedUser.isActive ? 'Deactivate User' : 'Activate User'}
              </button>
              <button
                className="button-ghost"
                disabled={isSubmitting || isManagingOwnAccount}
                onClick={() => handlePermanentDeleteUser(managedUser)}
                style={{ color: 'var(--danger)' }}
                type="button"
              >
                Delete User Permanently
              </button>
            </div>

            {isManagingOwnAccount ? (
              <div className="manage-user-warning">
                You are managing your own account. Deactivate and permanent delete are disabled for safety.
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {isPortalModalOpen ? (
        <div className="user-modal-backdrop">
          <form aria-labelledby="create-portal-title" aria-modal="true" className="user-modal" onSubmit={handleCreatePatientPortal} role="dialog">
            <div className="toolbar">
              <div className="page-title">
                <div className="section-title">
                  <AppIcon name="users" size={20} />
                  <h3 id="create-portal-title">Create Patient Portal Account</h3>
                </div>
                <p className="helper-text">Link a login account to an existing patient record.</p>
              </div>
              <button className="button-ghost" onClick={() => setIsPortalModalOpen(false)} type="button">
                Close
              </button>
            </div>

            <div className="field-grid">
              <label className="field-label">
                <span>Search Patient</span>
                <input
                  onChange={(event) => setPatientLookup((current) => ({ ...current, query: event.target.value }))}
                  placeholder="Search by patient name or ID"
                  value={patientLookup.query}
                />
              </label>
              <div className="lookup-result" style={{ padding: '0.9rem' }}>
                {patientLookup.isLoading ? (
                  <div className="helper-text">Searching patients...</div>
                ) : patientLookup.results.length ? (
                  <div className="stack">
                    {patientLookup.results.map((patient) => (
                      <button
                        className="selection-item"
                        key={patient._id}
                        onClick={() => selectPatientLookup(patient)}
                        type="button"
                        style={{ width: '100%', textAlign: 'left' }}
                      >
                        <div>
                          <strong>{patient.name}</strong>
                          <div className="helper-text">{patient.patientId} · {patient.gender || 'N/A'}</div>
                        </div>
                        <span className="pill">Select</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="helper-text">
                    {patientLookup.query ? 'No matching patient found.' : 'Search by name or patient ID to pick a record.'}
                  </div>
                )}
                {patientLookup.errorMessage ? (
                  <div className="helper-text" style={{ color: 'var(--danger)', marginTop: '0.5rem' }}>
                    {patientLookup.errorMessage}
                  </div>
                ) : null}
              </div>
              <label className="field-label">
                <span>Patient Record ID</span>
                <input
                  onChange={(event) => updatePortalForm('patientId', event.target.value)}
                  required
                  value={portalForm.patientId}
                />
              </label>
              <div className="field-grid two">
                <label className="field-label">
                  <span>First Name</span>
                  <input onChange={(event) => updatePortalForm('firstName', event.target.value)} value={portalForm.firstName} />
                </label>
                <label className="field-label">
                  <span>Last Name</span>
                  <input onChange={(event) => updatePortalForm('lastName', event.target.value)} value={portalForm.lastName} />
                </label>
              </div>
              <div className="field-grid two">
                <label className="field-label">
                  <span>Email</span>
                  <input onChange={(event) => updatePortalForm('email', event.target.value)} required type="email" value={portalForm.email} />
                </label>
                <label className="field-label">
                  <span>Temporary Password</span>
                  <input onChange={(event) => updatePortalForm('password', event.target.value)} required value={portalForm.password} />
                </label>
              </div>
            </div>

            <div className="toolbar">
              <button className="button-ghost" onClick={() => setIsPortalModalOpen(false)} type="button">
                Cancel
              </button>
              <button className="button-primary" type="submit">
                Create Portal Account
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {isMedicineModalOpen ? (
        <div className="user-modal-backdrop">
          <form aria-labelledby="create-medicine-title" aria-modal="true" className="user-modal" onSubmit={handleCreateMedicine} role="dialog">
            <div className="toolbar">
              <div className="page-title">
                <div className="section-title">
                  <AppIcon name="plusCircle" size={20} />
                  <h3 id="create-medicine-title">Create Medicine</h3>
                </div>
                <p className="helper-text">Add a medicine record such as Paracetamol before creating inventory batches.</p>
              </div>
              <button className="button-ghost" onClick={() => setIsMedicineModalOpen(false)} type="button">
                Close
              </button>
            </div>

            <div className="field-grid">
              <div className="field-grid two">
                <label className="field-label">
                  <span>Medicine Name</span>
                  <input onChange={(event) => updateMedicineForm('name', event.target.value)} required value={medicineForm.name} placeholder="Paracetamol" />
                </label>
                <label className="field-label">
                  <span>Generic Name</span>
                  <input onChange={(event) => updateMedicineForm('genericName', event.target.value)} required value={medicineForm.genericName} placeholder="Paracetamol" />
                </label>
              </div>
              <div className="field-grid two">
                <label className="field-label">
                  <span>ATC Code</span>
                  <input onChange={(event) => updateMedicineForm('atcCode', event.target.value)} required value={medicineForm.atcCode} placeholder="N02BE01" />
                </label>
                <label className="field-label">
                  <span>Dosage Form</span>
                  <select onChange={(event) => updateMedicineForm('dosageForm', event.target.value)} value={medicineForm.dosageForm}>
                    <option>Tablet</option>
                    <option>Capsule</option>
                    <option>Injection</option>
                    <option>Syrup</option>
                    <option>Cream</option>
                    <option>Inhaler</option>
                  </select>
                </label>
              </div>
              <div className="field-grid two">
                <label className="field-label">
                  <span>Brand</span>
                  <input onChange={(event) => updateMedicineForm('brand', event.target.value)} value={medicineForm.brand} placeholder="Crocin" />
                </label>
                <label className="field-label">
                  <span>Strength</span>
                  <input onChange={(event) => updateMedicineForm('strength', event.target.value)} value={medicineForm.strength} placeholder="500 mg" />
                </label>
              </div>
              <div className="field-grid two">
                <label className="field-label">
                  <span>Manufacturer</span>
                  <input onChange={(event) => updateMedicineForm('manufacturer', event.target.value)} value={medicineForm.manufacturer} placeholder="Example Pharma Ltd" />
                </label>
                <label className="field-label">
                  <span>MRP</span>
                  <input onChange={(event) => updateMedicineForm('mrp', event.target.value)} min="0" type="number" value={medicineForm.mrp} placeholder="10" />
                </label>
              </div>
            </div>

            <div className="toolbar">
              <button className="button-ghost" onClick={() => setIsMedicineModalOpen(false)} type="button">
                Cancel
              </button>
              <button className="button-primary" type="submit">
                Create Medicine
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
