import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../components/AppIcon';
import StatCard from '../components/StatCard';
import { getApiMessage, listAlerts, listInventory, listPrescriptions } from '../api/pimsApi';

function alertTone(alert) {
  if (alert.severity === 'CRITICAL') {
    return 'status-pill status-critical';
  }
  if (alert.severity === 'WARNING') {
    return 'status-pill status-warning';
  }
  return 'status-pill status-success';
}

export default function PharmacistDashboard() {
  const [query, setQuery] = useState('');
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [pageState, setPageState] = useState({
    isLoading: true,
    errorMessage: ''
  });

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      setPageState({ isLoading: true, errorMessage: '' });

      try {
        const [inventoryData, alertData, prescriptionData] = await Promise.all([
          listInventory({ limit: 50 }),
          listAlerts({ limit: 10, includeAcknowledged: 'true' }),
          listPrescriptions({ limit: 20 })
        ]);

        if (!isActive) {
          return;
        }

        setInventory(inventoryData?.inventory || []);
        setAlerts(alertData?.alerts || []);
        setPrescriptions(prescriptionData?.prescriptions || []);
        setPageState({ isLoading: false, errorMessage: '' });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setPageState({
          isLoading: false,
          errorMessage: getApiMessage(error, 'Failed to load pharmacist dashboard')
        });
      }
    }

    loadDashboard();

    return () => {
      isActive = false;
    };
  }, []);

  const filteredInventory = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return inventory;
    }

    return inventory.filter((item) => {
      const medicineName = item.medicineId?.name || item.medicineId?.genericName || '';
      return medicineName.toLowerCase().includes(normalized) || item.atcCode.toLowerCase().includes(normalized);
    });
  }, [inventory, query]);

  const inventoryHealth = {
    totalSkus: inventory.length,
    lowStock: inventory.filter((item) => item.status === 'LOW STOCK').length,
    expiringSoon: inventory.filter((item) => item.status === 'NEAR EXPIRY').length,
    readyForPickup: prescriptions.filter((item) => item.status === 'Filled').length
  };

  const incomingPrescriptions = prescriptions.filter((item) => item.status === 'Pending' || item.status === 'Processing').slice(0, 4);
  const urgentAlerts = alerts.filter((alert) => !alert.isAcknowledged).slice(0, 4);

  return (
    <section className="page">
      {pageState.errorMessage ? (
        <div className="notice-banner">
          <div>
            <strong>Pharmacist dashboard data could not load</strong>
            <div className="helper-text">{pageState.errorMessage}</div>
          </div>
        </div>
      ) : null}

      <div className="stats-grid">
        <StatCard hint="Tracked inventory batches" icon="inventory" title="Total SKUs" value={String(inventoryHealth.totalSkus)} />
        <StatCard hint="Below reorder threshold" icon="alert" title="Low Stock" value={String(inventoryHealth.lowStock)} />
        <StatCard hint="Within 30 days of expiry" icon="clock" title="Expiring Soon" value={String(inventoryHealth.expiringSoon)} />
        <StatCard hint="Filled prescriptions" icon="checkCircle" title="Ready for Pickup" value={String(inventoryHealth.readyForPickup)} />
      </div>

      <div className="content-grid-2">
        <section className="panel">
          <div className="panel-head">
            <div className="page-title">
              <div className="section-title">
                <AppIcon name="prescription" size={20} />
                <h3>Incoming Prescriptions</h3>
              </div>
              <p className="helper-text">Live backend queue for pharmacist review.</p>
            </div>
            <Link className="button-secondary" to="/prescriptions">Open Queue</Link>
          </div>

          <div className="mini-list">
            {incomingPrescriptions.map((entry) => (
              <Link
                className={`feed-item ${entry.isUrgent ? 'is-stat' : ''}`.trim()}
                key={entry._id || entry.id}
                style={{ textDecoration: 'none', color: 'inherit', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                to="/prescriptions"
              >
                <div>
                  <strong>{entry.rxId}</strong>
                  <div>{entry.patientId?.name || 'Unknown patient'}</div>
                  <div className="helper-text">
                    {(entry.items || []).length} items · {entry.status}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={entry.isUrgent ? 'status-pill status-critical' : 'status-pill status-neutral'}>
                    {entry.isUrgent ? 'STAT' : entry.status}
                  </span>
                  <div className="helper-text" style={{ marginTop: '0.35rem' }}>
                    {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </Link>
            ))}
            {!incomingPrescriptions.length ? (
              <div className="helper-text">No incoming prescriptions in the queue.</div>
            ) : null}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div className="page-title">
              <div className="section-title">
                <AppIcon name="alert" size={20} />
                <h3>Urgent System Alerts</h3>
              </div>
              <p className="helper-text">Unacknowledged low-stock and expiry alerts.</p>
            </div>
            <Link className="button-ghost" to="/alerts">
              View all
              <AppIcon name="chevronRight" size={16} />
            </Link>
          </div>

          <div className="alert-list">
            {urgentAlerts.map((alert) => (
              <div className={`alert-item is-${alert.severity?.toLowerCase()}`} key={alert._id || alert.id}>
                <div>
                  <strong>{alert.medicineId?.name || alert.type}</strong>
                  <div className="helper-text">{alert.message}</div>
                </div>
                <span className={alertTone(alert)}>{alert.severity}</span>
              </div>
            ))}
            {!urgentAlerts.length ? (
              <div className="helper-text">No active alerts right now.</div>
            ) : null}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div className="page-title">
            <div className="section-title">
              <AppIcon name="search" size={20} />
              <h3>Quick Inventory Check</h3>
            </div>
            <p className="helper-text">Search medicine stock levels by name or ATC code.</p>
          </div>
          <Link className="button-secondary" to="/inventory">Manage Inventory</Link>
        </div>

        <label className="search-field">
          <AppIcon name="search" size={18} />
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search stock levels..."
            type="search"
            value={query}
          />
        </label>

        <div className="mini-list" style={{ marginTop: '1rem' }}>
          {pageState.isLoading ? (
            <div className="helper-text">Loading inventory snapshot...</div>
          ) : filteredInventory.slice(0, 4).map((item) => (
            <div className="inventory-row-card" key={item._id || item.id}>
              <div>
                <strong>{item.medicineId?.name || item.atcCode}</strong>
                <div className="helper-text">{item.atcCode} · {item.storage || 'No storage note'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700 }}>{item.currentStock} units</div>
                <span className={item.status === 'LOW STOCK' ? 'status-pill status-warning' : 'status-pill status-success'}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
          {!pageState.isLoading && !filteredInventory.length ? (
            <div className="helper-text">No inventory items match this search.</div>
          ) : null}
        </div>
      </section>
    </section>
  );
}
