import axios from 'axios';
import { clearSession, getStoredRole, getStoredToken } from '../utils/session';

export const SESSION_EXPIRED_EVENT = 'pims:session-expired';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = String(error?.config?.url || '');
    const isLogoutRequest = requestUrl.includes('/auth/logout');

    if (error.response?.status === 401 && !isLogoutRequest) {
      const hadToken = Boolean(getStoredToken());
      if (hadToken) {
        const previousRole = getStoredRole();
        clearSession();

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, {
            detail: { role: previousRole }
          }));
        }
      }
    }

    return Promise.reject(error);
  }
);

function unwrap(response) {
  return response?.data?.data;
}

export function getApiMessage(error, fallback = 'Something went wrong') {
  return error?.response?.data?.message || error?.message || fallback;
}

export async function login(payload) {
  return unwrap(await apiClient.post('/auth/login', payload));
}

export async function getCurrentUser() {
  return unwrap(await apiClient.get('/auth/me'));
}

export async function getMyPatientRecord() {
  return unwrap(await apiClient.get('/patients/me'));
}

export async function logout() {
  return unwrap(await apiClient.post('/auth/logout'));
}

export async function forgotPassword(payload) {
  return unwrap(await apiClient.post('/auth/forgot-password', payload));
}

export async function resetPassword(payload) {
  return unwrap(await apiClient.post('/auth/reset-password', payload));
}

export async function changePassword(payload) {
  return unwrap(await apiClient.put('/auth/change-password', payload));
}

export async function listPatients(params) {
  return unwrap(await apiClient.get('/patients', { params }));
}

export async function createPatient(payload) {
  return unwrap(await apiClient.post('/patients', payload));
}

export async function createPatientPortalAccount(patientId, payload) {
  return unwrap(await apiClient.post(`/patients/${patientId}/portal-account`, payload));
}

export async function listMedicines(params) {
  return unwrap(await apiClient.get('/medicines', { params }));
}

export async function getAtcTree() {
  return unwrap(await apiClient.get('/atc/tree'));
}

export async function getAtcNode(code) {
  return unwrap(await apiClient.get(`/atc/${code}`));
}

export async function searchAtc(params) {
  return unwrap(await apiClient.get('/atc/search', { params }));
}

export async function listPrescriptions(params) {
  return unwrap(await apiClient.get('/prescriptions', { params }));
}

export async function getPrescription(id) {
  return unwrap(await apiClient.get(`/prescriptions/${id}`));
}

export async function createPrescription(payload) {
  return unwrap(await apiClient.post('/prescriptions', payload));
}

export async function updatePrescriptionStatus(id, payload) {
  return unwrap(await apiClient.put(`/prescriptions/${id}/status`, payload));
}

export async function downloadPrescriptionPdf(id) {
  return apiClient.get(`/prescriptions/${id}/pdf`, {
    responseType: 'blob'
  });
}

export async function listInventory(params) {
  return unwrap(await apiClient.get('/inventory', { params }));
}

export async function createInventoryItem(payload) {
  return unwrap(await apiClient.post('/inventory', payload));
}

export async function updateInventoryItem(id, payload) {
  return unwrap(await apiClient.put(`/inventory/${id}`, payload));
}

export async function getInventoryAudit(params) {
  return unwrap(await apiClient.get('/inventory/audit', { params }));
}

export async function listAlerts(params) {
  return unwrap(await apiClient.get('/alerts', { params }));
}

export async function acknowledgeAlert(id) {
  return unwrap(await apiClient.put(`/alerts/${id}/acknowledge`));
}

export async function dismissAlert(id) {
  return unwrap(await apiClient.put(`/alerts/${id}/dismiss`));
}

export async function getSummaryReport(params) {
  return unwrap(await apiClient.get('/reports/summary', { params }));
}

export async function getPatientSummaryReport(params) {
  return unwrap(await apiClient.get('/reports/patient-summary', { params }));
}

export async function getAtcUsageReport(params) {
  return unwrap(await apiClient.get('/reports/atcUsage', { params }));
}

export async function getFulfillmentReport(params) {
  return unwrap(await apiClient.get('/reports/fulfillment', { params }));
}

export async function listUsers(params) {
  return unwrap(await apiClient.get('/users', { params }));
}

export async function createUser(payload) {
  return unwrap(await apiClient.post('/users', payload));
}

export async function deactivateUser(id) {
  return unwrap(await apiClient.delete(`/users/${id}`));
}

export async function updateUser(id, payload) {
  return unwrap(await apiClient.put(`/users/${id}`, payload));
}

export async function permanentlyDeleteUser(id) {
  return unwrap(await apiClient.delete(`/users/${id}/permanent`));
}
