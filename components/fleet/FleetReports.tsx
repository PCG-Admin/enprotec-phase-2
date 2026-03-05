import * as React from 'react';
import { Download, Filter, Printer, FileText } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';

/* ─── Mock data ──────────────────────────────────────────────────── */
const monthlyInspections = [
  { month: 'Sep', completed: 18, failed: 2 },
  { month: 'Oct', completed: 22, failed: 3 },
  { month: 'Nov', completed: 19, failed: 1 },
  { month: 'Dec', completed: 14, failed: 2 },
  { month: 'Jan', completed: 25, failed: 4 },
  { month: 'Feb', completed: 21, failed: 2 },
];

const monthlyCosts = [
  { month: 'Sep', fuel: 8200,  maintenance: 3100, other: 1400 },
  { month: 'Oct', fuel: 9100,  maintenance: 4500, other: 900  },
  { month: 'Nov', fuel: 7800,  maintenance: 2800, other: 1100 },
  { month: 'Dec', fuel: 6400,  maintenance: 5200, other: 2100 },
  { month: 'Jan', fuel: 10200, maintenance: 3900, other: 1500 },
  { month: 'Feb', fuel: 9500,  maintenance: 4100, other: 1200 },
];

const complianceData = [
  { name: 'Compliant',       value: 18, color: '#10b981' },
  { name: 'Expiring (30d)', value: 4,  color: '#f59e0b' },
  { name: 'Overdue',         value: 3,  color: '#ef4444' },
];

const vehicleUtilisation = [
  { vehicle: 'JL4017', hours: 210 },
  { vehicle: 'ABC123', hours: 185 },
  { vehicle: 'XYZ789', hours: 162 },
  { vehicle: 'DEF456', hours: 143 },
  { vehicle: 'GHI789', hours: 98  },
];

const recentReports = [
  { name: 'Monthly Fleet Report – Feb 2026', generated: '2026-02-28' },
  { name: 'Compliance Status Report – Jan 2026', generated: '2026-01-31' },
  { name: 'Cost Analysis – Q4 2025', generated: '2025-12-31' },
];

const PIE_COLORS = complianceData.map(d => d.color);

/* ─── Helper: CSV export ─────────────────────────────────────────── */
const exportCSV = (reportType: string, dateRange: string) => {
  let rows: string[] = [];
  let header = '';

  if (reportType === 'inspections') {
    header = 'Month,Completed,Failed';
    rows = monthlyInspections.map(r => `${r.month},${r.completed},${r.failed}`);
  } else if (reportType === 'costs') {
    header = 'Month,Fuel (R),Maintenance (R),Other (R)';
    rows = monthlyCosts.map(r => `${r.month},${r.fuel},${r.maintenance},${r.other}`);
  } else if (reportType === 'compliance') {
    header = 'Status,Count';
    rows = complianceData.map(r => `${r.name},${r.value}`);
  } else if (reportType === 'utilization') {
    header = 'Vehicle,Hours';
    rows = vehicleUtilisation.map(r => `${r.vehicle},${r.hours}`);
  } else {
    header = 'Metric,Value';
    rows = [
      'Total Vehicles,5', 'Active,4', 'In Maintenance,1',
      'Inspections This Month,21', 'Pass Rate,90.5%',
      'Total Monthly Cost (R),29950',
    ];
  }

  const csv  = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${reportType}-report-${dateRange}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const fmtR = (n: number) => `R ${n.toLocaleString('en-ZA')}`;

/* ─── Component ──────────────────────────────────────────────────── */
const FleetReports: React.FC = () => {
  const [dateRange, setDateRange]   = React.useState('quarter');
  const [reportType, setReportType] = React.useState('summary');

  const totalInspections   = monthlyInspections.reduce((s, r) => s + r.completed, 0);
  const totalFailed        = monthlyInspections.reduce((s, r) => s + r.failed, 0);
  const passRate           = ((totalInspections - totalFailed) / totalInspections * 100).toFixed(1);
  const totalCost          = monthlyCosts.reduce((s, r) => s + r.fuel + r.maintenance + r.other, 0);
  const totalFuel          = monthlyCosts.reduce((s, r) => s + r.fuel, 0);
  const totalMaintenance   = monthlyCosts.reduce((s, r) => s + r.maintenance, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-zinc-900">Fleet Reports</h1>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 border border-zinc-300 text-zinc-700 px-4 py-2 rounded-lg hover:bg-zinc-50 text-sm font-medium">
            <Printer className="h-4 w-4" /> Print
          </button>
          <button
            onClick={() => exportCSV(reportType, dateRange)}
            className="inline-flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 text-sm font-medium">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Report Type</label>
            <select value={reportType} onChange={e => setReportType(e.target.value)}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500">
              <option value="summary">Fleet Summary</option>
              <option value="inspections">Inspections Report</option>
              <option value="costs">Cost Analysis</option>
              <option value="compliance">Compliance Status</option>
              <option value="utilization">Vehicle Utilisation</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Date Range</label>
            <select value={dateRange} onChange={e => setDateRange(e.target.value)}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500">
              <option value="month">Last 30 days</option>
              <option value="quarter">Last 90 days</option>
              <option value="half">Last 6 months</option>
              <option value="year">Last 12 months</option>
            </select>
          </div>
          <div>
            <button className="inline-flex items-center gap-2 bg-zinc-100 text-zinc-700 px-4 py-2 rounded-lg hover:bg-zinc-200 text-sm font-medium w-full justify-center">
              <Filter className="h-4 w-4" /> Apply
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary ── */}
      {reportType === 'summary' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label:'Total Vehicles',   value:'5',              sub:'4 active, 1 in maintenance' },
              { label:'Inspections (6m)', value:String(totalInspections), sub:`Pass rate ${passRate}%` },
              { label:'Total Cost (6m)',  value:fmtR(totalCost),  sub:'All categories' },
              { label:'Compliance Score', value:'72%',            sub:'3 items overdue' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-white rounded-lg shadow p-5">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-bold text-zinc-900 mt-1">{value}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-base font-semibold text-zinc-800 mb-4">Monthly Inspections</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyInspections}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#888" tick={{ fontSize:12 }} />
                  <YAxis stroke="#888" tick={{ fontSize:12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" name="Completed" fill="#3b82f6" radius={[3,3,0,0]} />
                  <Bar dataKey="failed"    name="Failed"    fill="#ef4444" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-base font-semibold text-zinc-800 mb-4">Monthly Cost Trend (R)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={monthlyCosts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#888" tick={{ fontSize:12 }} />
                  <YAxis stroke="#888" tick={{ fontSize:12 }} tickFormatter={v => `R${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmtR(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="fuel"        name="Fuel"        stroke="#f97316" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="maintenance" name="Maintenance"  stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="other"       name="Other"        stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* ── Inspections Report ── */}
      {reportType === 'inspections' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <h3 className="text-base font-semibold text-zinc-800 mb-4">Inspections per Month</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyInspections}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#888" tick={{ fontSize:12 }} />
                <YAxis stroke="#888" tick={{ fontSize:12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[3,3,0,0]} />
                <Bar dataKey="failed"    name="Failed"    fill="#ef4444" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h3 className="text-base font-semibold text-zinc-800">Summary</h3>
            {[
              { label:'Total Inspections', value:totalInspections },
              { label:'Passed',            value:totalInspections - totalFailed },
              { label:'Failed',            value:totalFailed },
              { label:'Pass Rate',         value:`${passRate}%` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-zinc-600">{label}</span>
                <span className="font-semibold text-zinc-900">{value}</span>
              </div>
            ))}
            <div className="pt-2">
              <div className="w-full bg-zinc-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${passRate}%` }} />
              </div>
              <p className="text-xs text-zinc-500 mt-1">{passRate}% pass rate</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Cost Analysis ── */}
      {reportType === 'costs' && (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label:'Total (6m)',       value:fmtR(totalCost)       },
              { label:'Fuel (6m)',        value:fmtR(totalFuel)        },
              { label:'Maintenance (6m)', value:fmtR(totalMaintenance) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-lg shadow p-5">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
                <p className="text-xl font-bold text-zinc-900 mt-1">{value}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-base font-semibold text-zinc-800 mb-4">Cost Breakdown by Month (R)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyCosts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#888" tick={{ fontSize:12 }} />
                <YAxis stroke="#888" tick={{ fontSize:12 }} tickFormatter={v => `R${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmtR(v)} />
                <Legend />
                <Bar dataKey="fuel"        name="Fuel"        fill="#f97316" stackId="a" />
                <Bar dataKey="maintenance" name="Maintenance"  fill="#3b82f6" stackId="a" />
                <Bar dataKey="other"       name="Other"        fill="#8b5cf6" stackId="a" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ── Compliance Status ── */}
      {reportType === 'compliance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-base font-semibold text-zinc-800 mb-4">Compliance Overview</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={complianceData} cx="50%" cy="50%"
                  innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                  {complianceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-lg shadow p-6 space-y-3">
            <h3 className="text-base font-semibold text-zinc-800 mb-2">Breakdown</h3>
            {complianceData.map(d => (
              <div key={d.name} className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span className="flex-1 text-sm text-zinc-700">{d.name}</span>
                <span className="font-semibold text-zinc-900">{d.value}</span>
              </div>
            ))}
            <hr className="my-2" />
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600">Total tracked</span>
              <span className="font-semibold">{complianceData.reduce((s,d) => s+d.value, 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600">Compliance rate</span>
              <span className="font-semibold text-green-600">72%</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Vehicle Utilisation ── */}
      {reportType === 'utilization' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-base font-semibold text-zinc-800 mb-4">Vehicle Hours (Last 30 days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vehicleUtilisation} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" stroke="#888" tick={{ fontSize:12 }} />
              <YAxis dataKey="vehicle" type="category" stroke="#888" tick={{ fontSize:12 }} width={60} />
              <Tooltip />
              <Bar dataKey="hours" name="Hours" fill="#3b82f6" radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Reports */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-zinc-200">
          <h2 className="text-base font-semibold text-zinc-800">Recent Reports</h2>
        </div>
        <div className="divide-y divide-zinc-100">
          {recentReports.map(r => (
            <div key={r.name} className="px-6 py-4 flex items-center justify-between hover:bg-zinc-50">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-zinc-400" />
                <div>
                  <p className="text-sm font-medium text-zinc-900">{r.name}</p>
                  <p className="text-xs text-zinc-500">Generated {r.generated}</p>
                </div>
              </div>
              <button
                onClick={() => exportCSV(reportType, dateRange)}
                className="text-sky-600 hover:text-sky-800">
                <Download className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FleetReports;
