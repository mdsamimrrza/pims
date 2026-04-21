import { useEffect, useMemo, useState } from 'react';
import AppIcon from '../components/AppIcon';
import useToast from '../hooks/useToast';
import {
  getApiMessage,
  getAtcUsageReport,
  getFulfillmentReport,
  getSummaryReport
} from '../api/pimsApi';

const categoryPrefixes = {
  'All ATC Categories': '',
  'Metabolic (A10)': 'A10',
  'Cardiovascular (C09)': 'C09',
  'Analgesics (N02)': 'N02'
};

function getDateRange(range) {
  const end = new Date();
  const start = new Date(end);

  if (range === 'Last 30 Days') {
    start.setDate(end.getDate() - 29);
  } else if (range === 'Last 90 Days') {
    start.setDate(end.getDate() - 89);
  } else {
    start.setDate(end.getDate() - 6);
  }

  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10)
  };
}

function createLinePath(values, width, height, padding) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const drawableWidth = width - padding * 2;
  const drawableHeight = height - padding * 2;

  return values.map((value, index) => {
    const x = padding + (index / Math.max(values.length - 1, 1)) * drawableWidth;
    const ratio = max === min ? 0.5 : (value - min) / (max - min);
    const y = height - padding - ratio * drawableHeight;
    return `${x},${y}`;
  }).join(' ');
}

function escapeCsvCell(value) {
  const text = String(value ?? '');
  if (!text.includes(',') && !text.includes('"') && !text.includes('\n')) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

function triggerDownload(blob, fileName) {
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export default function Reports() {
  const { notifyError, notifySuccess } = useToast();
  const [range, setRange] = useState('Last 7 Days');
  const [category, setCategory] = useState('All ATC Categories');
  const [summary, setSummary] = useState(null);
  const [usageReport, setUsageReport] = useState([]);
  const [fulfillmentReport, setFulfillmentReport] = useState(null);
  const [isDistributionOpen, setIsDistributionOpen] = useState(false);
  const [pageState, setPageState] = useState({
    isLoading: true,
    errorMessage: ''
  });

  const dateRange = useMemo(() => getDateRange(range), [range]);
  const prefix = categoryPrefixes[category];

  useEffect(() => {
    let isActive = true;

    async function loadReports() {
      setPageState({ isLoading: true, errorMessage: '' });

      try {
        const [summaryData, atcData, fulfillmentData] = await Promise.all([
          getSummaryReport(dateRange),
          getAtcUsageReport({ ...dateRange, limit: 10 }),
          getFulfillmentReport(dateRange)
        ]);

        if (!isActive) {
          return;
        }

        setSummary(summaryData);
        setUsageReport(atcData?.usage || []);
        setFulfillmentReport(fulfillmentData);
        setPageState({ isLoading: false, errorMessage: '' });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setPageState({
          isLoading: false,
          errorMessage: getApiMessage(error, 'Failed to load reports')
        });
      }
    }

    loadReports();

    return () => {
      isActive = false;
    };
  }, [dateRange]);

  const filteredUsage = useMemo(() => {
    if (!prefix) {
      return usageReport;
    }

    const scoped = usageReport.filter((item) => item.atcCode.startsWith(prefix));
    return scoped.length ? scoped : usageReport;
  }, [prefix, usageReport]);

  const dailyVolume = fulfillmentReport?.dailyVolume || [];
  const dailyCounts = dailyVolume.map((item) => item.count);
  const statusEntries = Object.entries(fulfillmentReport?.statusCounts || {});
  const totalStatuses = statusEntries.reduce((sum, [, value]) => sum + Number(value || 0), 0);

  const metrics = {
    volume: summary?.overview?.totalPrescriptions || 0,
    inventoryItems: summary?.overview?.inventoryItems || 0,
    fulfillmentHours: fulfillmentReport?.fulfillment?.averageFulfillmentHours || 0,
    uptimeMinutes: Math.round((summary?.overview?.uptimeSeconds || 0) / 60)
  };

  const handleViewFullDistribution = () => {
    setIsDistributionOpen(true);
  };

  const handleExportCsv = () => {
    try {
      const rows = [
        ['PIMS Reports Export'],
        [`Date Range`, `${dateRange.from} to ${dateRange.to}`],
        [`ATC Category`, category],
        [],
        ['Overview Metrics'],
        ['Prescription Volume', metrics.volume],
        ['Inventory Items', metrics.inventoryItems],
        ['Fulfillment Speed (hours)', metrics.fulfillmentHours.toFixed(2)],
        ['System Uptime (minutes)', metrics.uptimeMinutes],
        [],
        ['Fulfillment Status'],
        ['Status', 'Count', 'Share']
      ];

      statusEntries.forEach(([status, value]) => {
        const share = totalStatuses ? `${Math.round((Number(value || 0) / totalStatuses) * 100)}%` : '0%';
        rows.push([status, Number(value || 0), share]);
      });

      rows.push([], ['ATC Usage'], ['ATC Code', 'Prescriptions', 'Urgent Count']);

      filteredUsage.forEach((item) => {
        rows.push([item.atcCode, item.prescriptions, item.urgentCount]);
      });

      rows.push([], ['Daily Volume'], ['Date', 'Prescription Count']);

      dailyVolume.forEach((item) => {
        rows.push([item.date, item.count]);
      });

      const csv = rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(',')).join('\n');
      triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `pims-report-${dateRange.from}-to-${dateRange.to}.csv`);
      notifySuccess('CSV exported', 'Report CSV has been generated and downloaded.');
    } catch (error) {
      notifyError('CSV export failed', error?.message || 'Failed to export CSV report.');
    }
  };

  const handleGeneratePdf = () => {
    try {
      const statusRowsHtml = statusEntries.length
        ? statusEntries.map(([label, value]) => (
          `<tr><td>${label}</td><td>${value}</td><td>${totalStatuses ? `${Math.round((Number(value || 0) / totalStatuses) * 100)}%` : '0%'}</td></tr>`
        )).join('')
        : '<tr><td colspan="3">No status data</td></tr>';

      const atcRowsHtml = filteredUsage.length
        ? filteredUsage.map((item) => (`<tr><td>${item.atcCode}</td><td>${item.prescriptions}</td><td>${item.urgentCount}</td></tr>`)).join('')
        : '<tr><td colspan="3">No ATC usage data</td></tr>';

      const printWindow = window.open('', '_blank', 'width=960,height=720');

      if (!printWindow) {
        notifyError('PDF report blocked', 'Please allow pop-ups to generate the printable report.');
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>PIMS Report ${dateRange.from} to ${dateRange.to}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 24px; color: #182230; }
              h1, h2 { margin: 0 0 8px; }
              p { margin: 0 0 12px; color: #445064; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 18px; }
              th, td { border: 1px solid #d8dee8; padding: 8px; text-align: left; }
              th { background: #f2f5fa; }
              .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 16px; }
              .card { border: 1px solid #d8dee8; padding: 10px; }
            </style>
          </head>
          <body>
            <h1>PIMS Reports</h1>
            <p>Range: ${dateRange.from} to ${dateRange.to} | ATC Category: ${category}</p>

            <div class="grid">
              <div class="card"><strong>Prescription Volume</strong><div>${metrics.volume}</div></div>
              <div class="card"><strong>Inventory Items</strong><div>${metrics.inventoryItems}</div></div>
              <div class="card"><strong>Fulfillment Speed</strong><div>${metrics.fulfillmentHours.toFixed(2)}h</div></div>
              <div class="card"><strong>System Uptime</strong><div>${metrics.uptimeMinutes}m</div></div>
            </div>

            <h2>Fulfillment Status</h2>
            <table>
              <thead><tr><th>Status</th><th>Count</th><th>Share</th></tr></thead>
              <tbody>${statusRowsHtml}</tbody>
            </table>

            <h2>Top ATC Usage</h2>
            <table>
              <thead><tr><th>ATC Code</th><th>Prescriptions</th><th>Urgent Count</th></tr></thead>
              <tbody>${atcRowsHtml}</tbody>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      notifySuccess('Printable report ready', 'Use Save as PDF in the print dialog to export.');
    } catch (error) {
      notifyError('PDF generation failed', error?.message || 'Failed to generate report document.');
    }
  };

  return (
    <section className="page">
      {pageState.errorMessage ? (
        <div className="notice-banner">
          <div>
            <strong>Reports data issue</strong>
            <div className="helper-text">{pageState.errorMessage}</div>
          </div>
        </div>
      ) : null}

      <section className="panel">
        <div className="toolbar">
          <div className="toolbar-group">
            <select onChange={(event) => setRange(event.target.value)} value={range}>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Last 90 Days</option>
            </select>
            <select onChange={(event) => setCategory(event.target.value)} value={category}>
              {Object.keys(categoryPrefixes).map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="toolbar-group">
            <button className="button-secondary" onClick={handleExportCsv} type="button">
              <AppIcon name="download" size={16} />
              Export CSV
            </button>
            <button className="button-primary" onClick={handleGeneratePdf} type="button">
              <AppIcon name="download" size={16} />
              Generate PDF Report
            </button>
          </div>
        </div>
      </section>

      <div className="stats-grid">
        <StatPanel label="Prescription Volume" value={metrics.volume.toLocaleString()} helper="Total processed in this range" />
        <StatPanel label="Inventory Items" value={metrics.inventoryItems.toLocaleString()} helper="Tracked inventory batches" />
        <StatPanel label="Fulfillment Speed" value={`${metrics.fulfillmentHours.toFixed(2)}h`} helper="Average filled turnaround" />
        <StatPanel label="System Uptime" value={`${metrics.uptimeMinutes}m`} helper="Current backend process runtime" />
      </div>

      <div className="chart-grid">
        <section className="chart-card">
          <div className="page-title">
            <div className="section-title">
              <AppIcon name="reports" size={20} />
              <h3>Prescription Volume</h3>
            </div>
            <p className="helper-text">Daily prescription counts from the fulfillment report.</p>
          </div>

          {dailyVolume.length ? (
            <>
              <svg className="line-chart" viewBox="0 0 520 280" role="img" aria-label="Prescription volume line chart">
                <line x1="40" x2="480" y1="240" y2="240" stroke="#d8dee8" />
                <line x1="40" x2="40" y1="40" y2="240" stroke="#d8dee8" />
                <polyline
                  fill="none"
                  points={createLinePath(dailyCounts, 520, 280, 40)}
                  stroke="#94a3b8"
                  strokeWidth="3"
                />
                {dailyVolume.map((point, index) => (
                  <text key={point.date} fill="#667085" fontSize="12" x={40 + index * (dailyVolume.length > 1 ? 73 : 0)} y="258">
                    {point.date.slice(5)}
                  </text>
                ))}
              </svg>

              <div className="legend-row">
                <span><span className="legend-dot" style={{ background: '#94a3b8' }} />Prescriptions</span>
              </div>
            </>
          ) : (
            <div className="helper-text">No fulfillment volume returned for this date range.</div>
          )}
        </section>

        <section className="chart-card">
          <div className="page-title">
            <div className="section-title">
              <AppIcon name="inventory" size={20} />
              <h3>Status Distribution</h3>
            </div>
            <p className="helper-text">Prescription counts grouped by fulfillment status.</p>
          </div>

          {statusEntries.length ? (
            <svg className="bar-chart" viewBox="0 0 520 280" role="img" aria-label="Fulfillment status bar chart">
              <line x1="40" x2="480" y1="240" y2="240" stroke="#d8dee8" />
              {statusEntries.map(([label, value], index) => {
                const x = 80 + index * 90;
                const height = Number(value) * 18;
                return (
                  <g key={label}>
                    <rect fill="#98a2b3" height={height} width="34" x={x} y={240 - height} />
                    <text fill="#667085" fontSize="12" x={x - 5} y="258">{label}</text>
                  </g>
                );
              })}
            </svg>
          ) : (
            <div className="helper-text">No fulfillment status data returned for this range.</div>
          )}
        </section>
      </div>

      <div className="reports-bottom">
        <section className="table-panel">
          <div className="table-head">
            <div className="page-title">
              <div className="section-title">
                <AppIcon name="clock" size={20} />
                <h3>Fulfillment Snapshot</h3>
              </div>
              <p className="helper-text">Backend summary plus a placeholder per-pharmacist view until that API exists.</p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Count</th>
                  <th>Share</th>
                  <th>Avg. Fill Speed</th>
                  <th>Operational Signal</th>
                </tr>
              </thead>
              <tbody>
                {statusEntries.map(([label, value]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{value}</td>
                    <td>{totalStatuses ? `${Math.round((Number(value || 0) / totalStatuses) * 100)}%` : '0%'}</td>
                    <td>{`${metrics.fulfillmentHours.toFixed(2)}h`}</td>
                    <td>
                      <span className={`status-pill ${label === 'Cancelled' ? 'status-critical' : label === 'Pending' ? 'status-warning' : 'status-success'}`}>
                        {label === 'Cancelled' ? 'Needs Review' : 'Stable'}
                      </span>
                    </td>
                  </tr>
                ))}
                {!statusEntries.length ? (
                  <tr>
                    <td className="helper-text" colSpan="5">No fulfillment status rows available in this range.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="page-title">
            <div className="section-title">
              <AppIcon name="atc" size={20} />
              <h3>Top ATC Usage</h3>
            </div>
            <p className="helper-text">Most frequently prescribed ATC codes for the current date range.</p>
          </div>

          <div className="usage-list" style={{ marginTop: '1rem' }}>
            {filteredUsage.map((item, index) => (
              <div className="usage-item" key={item.atcCode}>
                <div className="toolbar">
                  <strong>{index + 1}. {item.atcCode}</strong>
                  <span className="status-pill status-success">{item.urgentCount} urgent</span>
                </div>
                <div className="helper-text">{item.prescriptions.toLocaleString()} prescriptions</div>
              </div>
            ))}
            {!filteredUsage.length ? (
              <div className="helper-text">No ATC usage data returned for this range.</div>
            ) : null}
          </div>

          <button
            className="button-secondary"
            onClick={handleViewFullDistribution}
            style={{ marginTop: '1rem', width: '100%' }}
            type="button"
          >
            View Full Distribution
          </button>
        </section>
      </div>

      {isDistributionOpen ? (
        <div className="user-modal-backdrop">
          <section className="user-modal" role="dialog" aria-modal="true" aria-labelledby="atc-full-distribution-title">
            <div className="toolbar">
              <div className="page-title">
                <div className="section-title">
                  <AppIcon name="atc" size={20} />
                  <h3 id="atc-full-distribution-title">ATC Full Distribution</h3>
                </div>
                <p className="helper-text">Showing all ATC usage records for the selected date range and filter.</p>
              </div>
              <button className="button-ghost" onClick={() => setIsDistributionOpen(false)} type="button">
                Close
              </button>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ATC Code</th>
                    <th>Prescriptions</th>
                    <th>Urgent Count</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsage.map((item, index) => (
                    <tr key={item.atcCode}>
                      <td>{index + 1}</td>
                      <td>{item.atcCode}</td>
                      <td>{Number(item.prescriptions || 0).toLocaleString()}</td>
                      <td>{Number(item.urgentCount || 0)}</td>
                    </tr>
                  ))}
                  {!filteredUsage.length ? (
                    <tr>
                      <td className="helper-text" colSpan="4">No ATC usage data returned for this range.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function StatPanel({ label, value, helper }) {
  return (
    <section className="panel">
      <strong>{label}</strong>
      <h2>{value}</h2>
      <div className="helper-text">{helper}</div>
    </section>
  );
}
