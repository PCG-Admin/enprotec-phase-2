import * as React from 'react';
import {
  ClipboardList, CheckCircle, AlertCircle, XCircle,
  Plus, Search, X, Camera, MapPin, ChevronRight, ChevronLeft,
  Trash2, Loader2, Printer,
} from 'lucide-react';
import {
  getInspections, createInspection, deleteInspection,
} from '../../supabase/services/inspections.service';
import { getVehicles } from '../../supabase/services/vehicles.service';
import { createCost } from '../../supabase/services/costs.service';
import type { InspectionRow } from '../../supabase/database.types';
import type { VehicleRow } from '../../supabase/database.types';
import type { User } from '../../types';
import { UserRole } from '../../types';

// ─── Types ───────────────────────────────────────────────────────────────────

type YesNo = 'Yes' | 'No' | '';
type Condition = 'Good' | 'Damaged' | 'Not Working' | 'N/A' | '';

interface WeekRow {
  id: string;
  weekLabel: string;
  operationalHours: string;
  checklistsCompleted: YesNo;
  findingsOnChecklists: YesNo;
  findingsCommunicated: YesNo;
}

interface ChecklistFinding {
  id: string;
  date: string;
  description: string;
  remedialAction: string;
}

interface Breakdown {
  id: string;
  description: string;
  durationHrs: string;
  spareParts: string;
  costToRepair: string;
}

interface WheelCheck {
  tyreThreadCondition: Condition;
  bubblesOrDamage: YesNo;
  allWheelNutsInPlace: YesNo;
  photo: string;
}

interface EquipmentChecks {
  // Windscreen
  windscreenCondition: Condition;
  windscreenPhoto: string;
  // Wipers
  wipersCondition: Condition;
  // Wheels
  leftFrontWheel: WheelCheck;
  rightFrontWheel: WheelCheck;
  leftRearWheel: WheelCheck;
  rightRearWheel: WheelCheck;
  // Headlights
  headlightsBothWorking: YesNo;
  headlightsFreeFromDamage: YesNo;
  headlightsLensesClear: YesNo;
  // Taillights
  taillightsBothWorking: YesNo;
  taillightsFreeFromDamage: YesNo;
  taillightsLensesClear: YesNo;
  // Indicators & Hazards
  leftIndicatorWorking: YesNo;
  rightIndicatorWorking: YesNo;
  hazardsWorking: YesNo;
  // Hooter
  hooterWorking: YesNo;
  // Emergency Kit
  fireExtinguisher: YesNo;
  stopBlock: YesNo;
  // Fluids
  engineOilLevel: YesNo;
  oilLeaks: YesNo;
  coolantLevel: YesNo;
  coolantLeaks: YesNo;
  hydraulicsOilPhoto: string;
  hydraulicsNote: string;
  // Engine
  fanBelt: Condition;
  alternatorBelt: Condition;
  waterHoses: Condition;
  radiatorLevel: Condition;
  engineOilLevelEngine: Condition;
  batteryWaterLevel: Condition;
  fuelLeaks: string;
  engineTemperature: Condition;
  // General
  suspension: YesNo;
  brakes: YesNo;
  clutch: YesNo;
  airConditioner: YesNo;
  rearViewMirrors: YesNo;
  seatbelts: YesNo;
}

interface Deviation {
  id: string;
  item: string;
  deviation: string;
}

interface GeneratorEquipmentChecks {
  // Fluids
  engineOilLevelOk: YesNo;
  oilLeaks: YesNo;
  coolantLevelOk: YesNo;
  coolantLeaks: YesNo;
  // Fuel
  fuelGaugePhoto: string;
  fuelLevel: string;
  // Engine
  fanBelt: string;
  alternatorBelt: string;
  waterHoses: string;
  radiatorLevel: string;
  engineOilLevelEngine: string;
  batteryWaterLevel: string;
  fuelLeaks: string;
  temperature: string;
}

interface InspectionRecord {
  id: string;
  // Header
  previousInspectionDate: string;
  inspectionDate: string;
  inspectedBy: string;
  siteAllocation: string;
  vehicleMakeModel: string;
  registrationNumber: string;
  currentHours: string;
  lastServiceHours: string;
  lastServiceDate: string;
  nextServiceHours: string;
  nextServiceDate: string;
  previousLoadTestDate: string;
  nextLoadTestDate: string;
  totalMaintenanceCost: string;
  avgMonthlyMaintenanceCost: string;
  // Visual
  vehicleFrontPhoto: string;
  vehicleLeftPhoto: string;
  vehicleRightPhoto: string;
  vehicleBackPhoto: string;
  interiorPhoto: string;
  serialNumberPhoto: string;
  serialNumberText: string;
  serviceSticker: string;
  serviceStickerDate: string;
  // Sections
  weeklyUse: WeekRow[];
  checklistFindings: ChecklistFinding[];
  monthlyBreakdowns: Breakdown[];
  equipment: EquipmentChecks;
  generatorEquipment: GeneratorEquipmentChecks;
  deviations: Deviation[];
  // Type
  inspectionType: 'General' | 'Forklift' | 'Generator';
  // Outcome
  result: 'pass' | 'fail' | 'requires_attention';
}

// ─── Default state helpers ───────────────────────────────────────────────────

const defaultWheelCheck = (): WheelCheck => ({
  tyreThreadCondition: 'Good',
  bubblesOrDamage: 'No',
  allWheelNutsInPlace: 'Yes',
  photo: '',
});

const defaultEquipment = (): EquipmentChecks => ({
  windscreenCondition: 'Good',
  windscreenPhoto: '',
  wipersCondition: 'Good',
  leftFrontWheel: defaultWheelCheck(),
  rightFrontWheel: defaultWheelCheck(),
  leftRearWheel: defaultWheelCheck(),
  rightRearWheel: defaultWheelCheck(),
  headlightsBothWorking: 'Yes',
  headlightsFreeFromDamage: 'Yes',
  headlightsLensesClear: 'Yes',
  taillightsBothWorking: 'Yes',
  taillightsFreeFromDamage: 'Yes',
  taillightsLensesClear: 'Yes',
  leftIndicatorWorking: 'Yes',
  rightIndicatorWorking: 'Yes',
  hazardsWorking: 'Yes',
  hooterWorking: 'Yes',
  fireExtinguisher: 'Yes',
  stopBlock: 'Yes',
  engineOilLevel: 'Yes',
  oilLeaks: 'No',
  coolantLevel: 'Yes',
  coolantLeaks: 'No',
  hydraulicsOilPhoto: '',
  hydraulicsNote: '',
  fanBelt: 'Good',
  alternatorBelt: 'Good',
  waterHoses: 'Good',
  radiatorLevel: 'Good',
  engineOilLevelEngine: 'Good',
  batteryWaterLevel: 'Good',
  fuelLeaks: 'None',
  engineTemperature: 'Good',
  suspension: 'Yes',
  brakes: 'Yes',
  clutch: 'Yes',
  airConditioner: 'Yes',
  rearViewMirrors: 'Yes',
  seatbelts: 'Yes',
});

const defaultGeneratorEquipment = (): GeneratorEquipmentChecks => ({
  engineOilLevelOk: 'Yes',
  oilLeaks: 'No',
  coolantLevelOk: 'Yes',
  coolantLeaks: 'No',
  fuelGaugePhoto: '',
  fuelLevel: '',
  fanBelt: 'Ok',
  alternatorBelt: 'Ok',
  waterHoses: 'Ok',
  radiatorLevel: 'Ok',
  engineOilLevelEngine: 'Ok',
  batteryWaterLevel: 'Ok',
  fuelLeaks: 'None',
  temperature: 'Ok',
});

const newWeekRow = (): WeekRow => ({
  id: Date.now().toString(),
  weekLabel: '',
  operationalHours: '',
  checklistsCompleted: 'Yes',
  findingsOnChecklists: 'No',
  findingsCommunicated: 'No',
});

const defaultForm = (): Omit<InspectionRecord, 'id' | 'result'> => ({
  previousInspectionDate: '',
  inspectionDate: new Date().toISOString().split('T')[0],
  inspectedBy: '',
  siteAllocation: '',
  vehicleMakeModel: '',
  registrationNumber: '',
  currentHours: '',
  lastServiceHours: '',
  lastServiceDate: '',
  nextServiceHours: '',
  nextServiceDate: '',
  previousLoadTestDate: '',
  nextLoadTestDate: '',
  totalMaintenanceCost: '',
  avgMonthlyMaintenanceCost: '',
  vehicleFrontPhoto: '',
  vehicleLeftPhoto: '',
  vehicleRightPhoto: '',
  vehicleBackPhoto: '',
  interiorPhoto: '',
  serialNumberPhoto: '',
  serialNumberText: '',
  serviceSticker: '',
  serviceStickerDate: '',
  inspectionType: 'General',
  generatorEquipment: defaultGeneratorEquipment(),
  weeklyUse: [newWeekRow()],
  checklistFindings: [],
  monthlyBreakdowns: [],
  equipment: defaultEquipment(),
  deviations: [],
});

// ─── Mock list data ───────────────────────────────────────────────────────────

const mockInspections: InspectionRecord[] = [
  {
    id: '1', previousInspectionDate: '2025-05-26', inspectionDate: '2025-06-26',
    inspectedBy: 'Brian Marabe', siteAllocation: 'Grootegeluk Mine',
    vehicleMakeModel: 'JLG 4017RS', registrationNumber: 'N/A', currentHours: '3684',
    lastServiceHours: '3667', lastServiceDate: '2025-05-20',
    nextServiceHours: '4667', nextServiceDate: '2026-06-20',
    previousLoadTestDate: '2025-06', nextLoadTestDate: '2026-06',
    totalMaintenanceCost: '62160.23', avgMonthlyMaintenanceCost: '1036.00',
    vehicleFrontPhoto: '', vehicleLeftPhoto: '', vehicleRightPhoto: '', vehicleBackPhoto: '',
    interiorPhoto: '', serialNumberPhoto: '', serialNumberText: 'QH621',
    serviceSticker: '', serviceStickerDate: '2025-05-20',
    weeklyUse: [], checklistFindings: [], monthlyBreakdowns: [],
    equipment: defaultEquipment(),
    deviations: [
      { id: '1', item: 'Hydraulic lock', deviation: 'Door lock key not in place' },
      { id: '2', item: 'Reverse camera', deviation: 'Not working' },
      { id: '3', item: 'Aircon', deviation: 'Not working' },
      { id: '4', item: 'Front wiper', deviation: 'Not working' },
      { id: '5', item: 'Hydraulic chain boom', deviation: 'No grease on chain, dry (need to be greased)' },
    ],
    result: 'requires_attention',
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

const YesNoSelect: React.FC<{ value: YesNo; onChange: (v: YesNo) => void; invertColor?: boolean }> = ({ value, onChange, invertColor }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value as YesNo)}
    className={`border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 ${
      value === 'Yes'
        ? invertColor ? 'bg-green-50 text-green-800' : 'bg-green-50 text-green-800'
        : value === 'No'
        ? invertColor ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        : ''
    }`}
  >
    <option value="">—</option>
    <option value="Yes">Yes</option>
    <option value="No">No</option>
  </select>
);

const ConditionSelect: React.FC<{ value: Condition; onChange: (v: Condition) => void }> = ({ value, onChange }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value as Condition)}
    className={`border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 ${
      value === 'Good' ? 'bg-green-50 text-green-800'
        : value === 'Damaged' ? 'bg-yellow-50 text-yellow-800'
        : value === 'Not Working' ? 'bg-red-50 text-red-800'
        : ''
    }`}
  >
    <option value="">—</option>
    <option value="Good">Good</option>
    <option value="Damaged">Damaged</option>
    <option value="Not Working">Not Working</option>
    <option value="N/A">N/A</option>
  </select>
);

/** Resize + compress an image file to JPEG, max 1024px on longest side */
const compressImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1024;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else                { width  = Math.round((width  * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = reject;
      img.src = ev.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const PhotoUpload: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => {
  const [processing, setProcessing] = React.useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    try {
      const compressed = await compressImage(file);
      onChange(compressed);
    } finally {
      setProcessing(false);
      e.target.value = '';   // allow re-selecting same file
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-blue-400 transition-colors">
      {value ? (
        <div className="relative">
          <img src={value} alt={label} className="max-h-32 mx-auto rounded object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 shadow"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <label className="cursor-pointer flex flex-col items-center gap-1">
          {processing ? (
            <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
          ) : (
            <Camera className="h-6 w-6 text-gray-400" />
          )}
          <p className="text-xs text-gray-500 leading-tight">
            {processing ? 'Processing…' : label}
          </p>
          {!processing && (
            <p className="text-[10px] text-gray-400">Tap to take photo or choose from gallery</p>
          )}
          {/* No `capture` attribute — mobile OS shows native picker (camera + gallery) and handles permissions */}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </label>
      )}
    </div>
  );
};

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <div className="bg-blue-700 text-white px-4 py-2 rounded font-semibold text-sm tracking-wide mt-6 mb-3">
    {title}
  </div>
);

const CheckRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
    <span className="text-sm text-gray-700 flex-1">{label}</span>
    <div className="flex-shrink-0 ml-4">{children}</div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

/** Opens a formatted print window for the given inspection record */
const printInspection = async (insp: InspectionRecord) => {
  /* Fetch Enprotec logo → base64 so it renders in the new window */
  let logoSrc = '';
  try {
    const resp = await fetch('/BR002-Full%20colour%20w%20slogan%20Landscape-2500px-Rev03%20(1).jpg');
    if (resp.ok) {
      const blob = await resp.blob();
      logoSrc = await new Promise<string>(res => {
        const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(blob);
      });
    }
  } catch { /* logo unavailable */ }

  /* ── helpers ── */
  const ph = (src: string, label: string) => src
    ? `<div class="photo-cell"><img src="${src}" class="photo-img" alt="${label}"/><p class="photo-label">${label}</p></div>`
    : `<div class="photo-cell no-photo-cell"><p class="photo-label">${label}</p><p class="photo-none">No photo</p></div>`;

  const chk = (label: string, val: string) => {
    const cls = (val === 'Yes' || val === 'Good' || val === 'Ok' || val === 'None')
      ? 'chk-pass' : (val === 'No' || val === 'Damaged' || val === 'Not Working') ? 'chk-fail' : 'chk-na';
    return `<tr><td>${label}</td><td class="${cls}">${val || '—'}</td></tr>`;
  };

  const typeLabel  = insp.inspectionType === 'Forklift' ? 'FORKLIFT' : insp.inspectionType === 'Generator' ? 'GENERATOR' : 'VEHICLE';
  const fullTitle  = `MONTHLY ${typeLabel} INSPECTION REPORT`;
  const entityWord = insp.inspectionType === 'Generator' ? 'Generator' : 'Vehicle';
  const isGen      = insp.inspectionType === 'Generator';
  const logoHtml   = logoSrc ? `<img src="${logoSrc}" class="logo-img" alt="Enprotec"/>` : `<div class="logo-text">ENPROTEC</div>`;
  const resultClass = insp.result === 'pass' ? 'result-pass' : insp.result === 'fail' ? 'result-fail' : 'result-attention';
  const resultLabel = insp.result === 'requires_attention' ? 'REQUIRES ATTENTION' : insp.result.toUpperCase();

  /* ── row builders ── */
  const weeklyRows = (insp.weeklyUse ?? []).map(w =>
    `<tr><td>${w.weekLabel||'—'}</td><td>${w.operationalHours||'—'}</td>${!isGen ? `<td>${w.checklistsCompleted||'—'}</td><td>${w.findingsOnChecklists||'—'}</td><td>${w.findingsCommunicated||'—'}</td>` : ''}</tr>`
  ).join('') || `<tr><td colspan="${isGen?2:5}" class="empty-row">No weekly data</td></tr>`;

  const findingRows = (insp.checklistFindings ?? []).map((f, i) =>
    `<tr><td>${i+1}</td><td>${f.date||'—'}</td><td>${f.description||'—'}</td><td>${f.remedialAction||'—'}</td></tr>`
  ).join('') || '<tr><td colspan="4" class="empty-row">No findings recorded</td></tr>';

  const breakdownRows = (insp.monthlyBreakdowns ?? []).map((b, i) =>
    `<tr><td>${i+1}</td><td>${b.description||'—'}</td><td>${b.durationHrs||'—'}</td><td>${b.spareParts||'—'}</td><td>${b.costToRepair||'—'}</td></tr>`
  ).join('') || '<tr><td colspan="5" class="empty-row">No breakdowns recorded</td></tr>';

  const devRows = (insp.deviations ?? []).map((d, i) =>
    `<tr><td>${i+1}</td><td>${d.item}</td><td>${d.deviation}</td></tr>`
  ).join('') || '<tr><td colspan="3" class="empty-row">No deviations recorded</td></tr>';

  /* ── equipment checks HTML ── */
  const e = insp.equipment;
  const g = insp.generatorEquipment;

  const wheelHtml = (label: string, w: typeof e.leftFrontWheel) => `
    <div class="wheel-card">
      <div class="wheel-title">${label}</div>
      ${ph(w.photo, label + ' photo')}
      <table style="margin-top:6px">
        ${chk('Tyre Thread', w.tyreThreadCondition)}
        ${chk('Bubbles / Damage', w.bubblesOrDamage)}
        ${chk('All Nuts In Place', w.allWheelNutsInPlace)}
      </table>
    </div>`;

  const equipChecksHtml = isGen ? `
    <h2>6. Generator Equipment Checks</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div>
        <h3 class="sub-h">Fluids</h3>
        <table>
          ${chk('Engine Oil Level OK', g.engineOilLevelOk)}
          ${chk('Oil Leaks', g.oilLeaks)}
          ${chk('Coolant Level OK', g.coolantLevelOk)}
          ${chk('Coolant Leaks', g.coolantLeaks)}
        </table>
        <h3 class="sub-h">Engine</h3>
        <table>
          ${chk('Fan Belt', g.fanBelt)}
          ${chk('Alternator Belt', g.alternatorBelt)}
          ${chk('Water Hoses', g.waterHoses)}
          ${chk('Radiator Level', g.radiatorLevel)}
          ${chk('Engine Oil Level', g.engineOilLevelEngine)}
          ${chk('Battery Water Level', g.batteryWaterLevel)}
          ${chk('Fuel Leaks', g.fuelLeaks)}
          ${chk('Temperature', g.temperature)}
        </table>
      </div>
      <div>
        <h3 class="sub-h">Fuel Gauge</h3>
        <p style="font-size:10px;color:#555;margin-bottom:4px">Level: <strong>${g.fuelLevel || '—'}</strong></p>
        ${g.fuelGaugePhoto ? `<img src="${g.fuelGaugePhoto}" style="max-width:100%;max-height:180px;object-fit:contain;border:1px solid #e5e7eb;border-radius:4px"/>` : '<div class="no-photo-cell" style="height:120px">No fuel gauge photo</div>'}
      </div>
    </div>
  ` : `
    <h2>6. Equipment Checks</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div>
        <h3 class="sub-h">Windscreen &amp; Wipers</h3>
        <table>
          ${chk('Windscreen Condition', e.windscreenCondition)}
          ${chk('Wipers Condition', e.wipersCondition)}
        </table>
        ${e.windscreenPhoto ? `<img src="${e.windscreenPhoto}" style="max-width:100%;max-height:120px;object-fit:contain;margin-top:6px;border:1px solid #e5e7eb;border-radius:4px"/>` : ''}

        <h3 class="sub-h" style="margin-top:10px">Lights &amp; Signals</h3>
        <table>
          ${chk('Headlights Working', e.headlightsBothWorking)}
          ${chk('Headlights Damage-Free', e.headlightsFreeFromDamage)}
          ${chk('Headlight Lenses Clear', e.headlightsLensesClear)}
          ${chk('Taillights Working', e.taillightsBothWorking)}
          ${chk('Taillights Damage-Free', e.taillightsFreeFromDamage)}
          ${chk('Taillight Lenses Clear', e.taillightsLensesClear)}
          ${chk('Left Indicator', e.leftIndicatorWorking)}
          ${chk('Right Indicator', e.rightIndicatorWorking)}
          ${chk('Hazards', e.hazardsWorking)}
          ${chk('Hooter', e.hooterWorking)}
        </table>

        <h3 class="sub-h" style="margin-top:10px">Emergency Kit</h3>
        <table>
          ${chk('Fire Extinguisher', e.fireExtinguisher)}
          ${chk('Stop Block', e.stopBlock)}
        </table>

        <h3 class="sub-h" style="margin-top:10px">General</h3>
        <table>
          ${chk('Suspension', e.suspension)}
          ${chk('Brakes', e.brakes)}
          ${chk('Clutch', e.clutch)}
          ${chk('Air Conditioner', e.airConditioner)}
          ${chk('Rear View Mirrors', e.rearViewMirrors)}
          ${chk('Seatbelts', e.seatbelts)}
        </table>
      </div>
      <div>
        <h3 class="sub-h">Fluids</h3>
        <table>
          ${chk('Engine Oil Level', e.engineOilLevel)}
          ${chk('Oil Leaks', e.oilLeaks)}
          ${chk('Coolant Level', e.coolantLevel)}
          ${chk('Coolant Leaks', e.coolantLeaks)}
        </table>
        <p style="font-size:10px;margin-top:6px;color:#555">Hydraulics Note: ${e.hydraulicsNote || '—'}</p>
        ${e.hydraulicsOilPhoto ? `<img src="${e.hydraulicsOilPhoto}" style="max-width:100%;max-height:120px;object-fit:contain;margin-top:6px;border:1px solid #e5e7eb;border-radius:4px"/>` : ''}

        <h3 class="sub-h" style="margin-top:10px">Engine</h3>
        <table>
          ${chk('Fan Belt', e.fanBelt)}
          ${chk('Alternator Belt', e.alternatorBelt)}
          ${chk('Water Hoses', e.waterHoses)}
          ${chk('Radiator Level', e.radiatorLevel)}
          ${chk('Engine Oil Level', e.engineOilLevelEngine)}
          ${chk('Battery Water Level', e.batteryWaterLevel)}
          ${chk('Fuel Leaks', e.fuelLeaks)}
          ${chk('Engine Temperature', e.engineTemperature)}
        </table>
      </div>
    </div>

    <h3 class="sub-h">Wheels</h3>
    <div class="wheel-grid">
      ${wheelHtml('Left Front', e.leftFrontWheel)}
      ${wheelHtml('Right Front', e.rightFrontWheel)}
      ${wheelHtml('Left Rear', e.leftRearWheel)}
      ${wheelHtml('Right Rear', e.rightRearWheel)}
    </div>
  `;

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><title>${fullTitle}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;background:#fff}

  /* cover */
  .cover-header{display:flex;align-items:stretch;border-bottom:3px solid #1d4ed8}
  .cover-left{flex:1;padding:20px 24px;display:flex;flex-direction:column;justify-content:center;gap:10px}
  .logo-img{max-width:220px;max-height:80px;object-fit:contain}
  .logo-text{font-size:28px;font-weight:900;color:#1d4ed8;letter-spacing:2px}
  .company-line{font-size:10px;color:#6b7280}
  .title-block h1{font-size:19px;font-weight:800;color:#1d4ed8;text-transform:uppercase;line-height:1.2}
  .title-block .subtitle{font-size:10px;color:#6b7280;margin-top:3px}
  .cover-right{width:260px;flex-shrink:0;overflow:hidden}
  .front-photo{width:100%;height:100%;min-height:200px;object-fit:cover;display:block}
  .no-photo-cover{width:100%;min-height:200px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:13px;text-align:center;padding:16px}

  /* result banner */
  .result-banner{padding:8px 24px;display:flex;align-items:center;gap:12px;font-size:12px;font-weight:700}
  .result-pass{background:#d1fae5;color:#065f46}
  .result-fail{background:#fee2e2;color:#991b1b}
  .result-attention{background:#fef3c7;color:#92400e}
  .result-banner .badge{display:inline-block;padding:3px 14px;border-radius:20px;font-size:12px;font-weight:800;border:2px solid currentColor}

  /* content */
  .content{padding:16px 24px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #d1d5db;border-radius:4px;margin-bottom:16px;overflow:hidden}
  .info-grid .lbl{background:#f9fafb;font-weight:700;padding:5px 10px;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb}
  .info-grid .val{padding:5px 10px;border-bottom:1px solid #e5e7eb}
  h2{background:#1d4ed8;color:#fff;padding:6px 12px;font-size:12px;font-weight:700;margin:18px 0 8px;border-radius:3px;text-transform:uppercase}
  .sub-h{font-size:11px;font-weight:700;color:#374151;background:#f3f4f6;padding:4px 8px;border-left:3px solid #1d4ed8;margin-bottom:4px}
  table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:10.5px}
  th,td{border:1px solid #d1d5db;padding:5px 8px;text-align:left}
  th{background:#f3f4f6;font-weight:700;font-size:10px;text-transform:uppercase}
  .empty-row{text-align:center;color:#9ca3af;font-style:italic}

  /* check colours */
  .chk-pass{color:#065f46;background:#d1fae5;font-weight:600}
  .chk-fail{color:#991b1b;background:#fee2e2;font-weight:600}
  .chk-na{color:#6b7280}

  /* photos */
  .photo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}
  .photo-cell{border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;text-align:center}
  .photo-img{width:100%;height:140px;object-fit:cover;display:block}
  .photo-label{font-size:9px;font-weight:700;text-transform:uppercase;color:#6b7280;padding:4px;background:#f9fafb}
  .photo-none{font-size:9px;color:#9ca3af;padding:8px 0}
  .no-photo-cell{background:#f9fafb;height:140px;display:flex;flex-direction:column;align-items:center;justify-content:center}

  /* wheels */
  .wheel-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
  .wheel-card{border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;padding:6px}
  .wheel-title{font-size:10px;font-weight:700;color:#1d4ed8;margin-bottom:4px;text-align:center}
  .wheel-card .photo-img{height:100px}
  .wheel-card .photo-cell{margin-bottom:4px}

  .footer{margin-top:24px;border-top:1px solid #e5e7eb;padding-top:8px;font-size:9px;color:#9ca3af;text-align:center}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.cover-header{page-break-inside:avoid}}
</style>
</head><body>

<!-- Cover -->
<div class="cover-header">
  <div class="cover-left">
    ${logoHtml}
    <p class="company-line">enquiries@enprotec.com &nbsp;|&nbsp; www.enprotec.com</p>
    <div class="title-block">
      <h1>${fullTitle}</h1>
      <p class="subtitle">Inspection Date: ${insp.inspectionDate||'—'} &nbsp;|&nbsp; Site: ${insp.siteAllocation||'—'}</p>
    </div>
  </div>
  <div class="cover-right">
    ${insp.vehicleFrontPhoto
      ? `<img src="${insp.vehicleFrontPhoto}" class="front-photo" alt="${entityWord} front"/>`
      : `<div class="no-photo-cover">${entityWord} front photo not captured</div>`}
  </div>
</div>

<!-- Result Banner -->
<div class="result-banner ${resultClass}">
  <span>Inspection Result:</span>
  <span class="badge">${resultLabel}</span>
  <span style="margin-left:auto;font-weight:400">Inspected by: ${insp.inspectedBy||'—'}</span>
</div>

<div class="content">

  <!-- 1. Header Info -->
  <div class="info-grid">
    <div class="lbl">Previous Inspection Date</div><div class="val">${insp.previousInspectionDate||'—'}</div>
    <div class="lbl">Inspection Date</div><div class="val">${insp.inspectionDate||'—'}</div>
    <div class="lbl">Inspected By</div><div class="val">${insp.inspectedBy||'—'}</div>
    <div class="lbl">Site Allocation</div><div class="val">${insp.siteAllocation||'—'}</div>
    <div class="lbl">${entityWord} Make &amp; Model</div><div class="val">${insp.vehicleMakeModel||'—'}</div>
    <div class="lbl">Registration / Serial</div><div class="val">${insp.registrationNumber||'—'}</div>
    <div class="lbl">Current Hours / ODO</div><div class="val">${insp.currentHours||'—'}</div>
    <div class="lbl">Last Service (Hours)</div><div class="val">${insp.lastServiceHours||'—'}</div>
    <div class="lbl">Last Service (Date)</div><div class="val">${insp.lastServiceDate||'—'}</div>
    <div class="lbl">Next Service (Hours)</div><div class="val">${insp.nextServiceHours||'—'}</div>
    <div class="lbl">Next Service (Date)</div><div class="val">${insp.nextServiceDate||'—'}</div>
    <div class="lbl">Total Maintenance Cost</div><div class="val">R ${insp.totalMaintenanceCost||'0'}</div>
    <div class="lbl">Avg Monthly Maint. Cost</div><div class="val">R ${insp.avgMonthlyMaintenanceCost||'0'}</div>
    <div class="lbl">Serial Number</div><div class="val">${insp.serialNumberText||'—'}</div>
    <div class="lbl">Service Sticker</div><div class="val">${insp.serviceSticker||'—'} ${insp.serviceStickerDate ? '· '+insp.serviceStickerDate : ''}</div>
  </div>

  <!-- 2. Visual Photos -->
  <h2>2. Visual Inspection Photos</h2>
  <div class="photo-grid">
    ${ph(insp.vehicleFrontPhoto,  entityWord+' Front')}
    ${ph(insp.vehicleLeftPhoto,   entityWord+' Left')}
    ${ph(insp.vehicleRightPhoto,  entityWord+' Right')}
    ${ph(insp.vehicleBackPhoto,   entityWord+' Back')}
    ${ph(insp.interiorPhoto,      'Interior')}
    ${ph(insp.serialNumberPhoto,  'Serial Number Plate')}
  </div>

  <!-- 3. Weekly Use -->
  <h2>3. Weekly Use</h2>
  <table>
    <thead><tr><th>Week</th><th>Operational Hours</th>${!isGen ? '<th>Checklists Done?</th><th>Findings?</th><th>Findings Addressed?</th>' : ''}</tr></thead>
    <tbody>${weeklyRows}</tbody>
  </table>

  <!-- 4. Checklist Findings -->
  <h2>4. Checklist Findings</h2>
  <table>
    <thead><tr><th>#</th><th>Date</th><th>Description</th><th>Remedial Action</th></tr></thead>
    <tbody>${findingRows}</tbody>
  </table>

  <!-- 5. Monthly Breakdowns -->
  <h2>5. Monthly Breakdowns</h2>
  <table>
    <thead><tr><th>#</th><th>Description</th><th>Duration (Hrs)</th><th>Spare Parts</th><th>Cost (ZAR)</th></tr></thead>
    <tbody>${breakdownRows}</tbody>
  </table>

  <!-- 6. Equipment Checks -->
  ${equipChecksHtml}

  <!-- 7. Deviations -->
  <h2>7. Deviations / Defects</h2>
  <table>
    <thead><tr><th>No</th><th>Item</th><th>Deviation / Finding</th></tr></thead>
    <tbody>${devRows}</tbody>
  </table>

  <div class="footer">
    Generated by Enprotec Fleet Management System &nbsp;|&nbsp; ${new Date().toLocaleString('en-ZA')}
  </div>
</div>

<script>
  (function(){
    var imgs=Array.from(document.images),done=0,total=imgs.length;
    if(!total){window.print();return;}
    function tick(){done++;if(done>=total)window.print();}
    imgs.forEach(function(i){if(i.complete)done++;else{i.onload=tick;i.onerror=tick;}});
    if(done>=total)window.print();
  })();
</script>
</body></html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
};

const TABS = [
  { id: 0, label: 'Vehicle Info' },
  { id: 1, label: 'Weekly Use' },
  { id: 2, label: 'Findings & Breakdowns' },
  { id: 3, label: 'Visual Inspection' },
  { id: 4, label: 'Equipment Checks' },
  { id: 5, label: 'Deviations & Submit' },
];

const Inspections: React.FC<{ user: User | null }> = ({ user }) => {
  const isDriver = user?.role === UserRole.Driver;
  const [inspections, setInspections] = React.useState<InspectionRecord[]>([]);
  const [vehicles, setVehicles]       = React.useState<VehicleRow[]>([]);
  const [loadingList, setLoadingList] = React.useState(true);
  const [submitting, setSubmitting]   = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [breakdownCostModal, setBreakdownCostModal] = React.useState<{ vehicleId: string; vehicleReg: string; breakdowns: Breakdown[] } | null>(null);
  const [savingCosts, setSavingCosts] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState(0);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<'All' | 'General' | 'Forklift' | 'Generator'>('All');
  const [form, setForm] = React.useState(defaultForm());

  React.useEffect(() => {
    Promise.all([getInspections(), getVehicles()])
      .then(([rows, vehs]) => {
        setVehicles(vehs);
        setInspections(rows.map((r): InspectionRecord => ({
          id: r.id,
          ...((r.answers as Omit<InspectionRecord, 'id' | 'result'>) ?? defaultForm()),
          result: (r.status as InspectionRecord['result']) ?? 'pass',
        })));
      })
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, []);

  const set = (field: keyof typeof form, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const setEquip = (field: keyof EquipmentChecks, value: unknown) =>
    setForm(prev => ({ ...prev, equipment: { ...prev.equipment, [field]: value } }));

  const setGenEquip = (field: keyof GeneratorEquipmentChecks, value: unknown) =>
    setForm(prev => ({ ...prev, generatorEquipment: { ...prev.generatorEquipment, [field]: value } }));

  const setWheel = (wheel: 'leftFrontWheel' | 'rightFrontWheel' | 'leftRearWheel' | 'rightRearWheel', field: keyof WheelCheck, value: unknown) =>
    setForm(prev => ({
      ...prev,
      equipment: {
        ...prev.equipment,
        [wheel]: { ...prev.equipment[wheel], [field]: value },
      },
    }));

  // Auto-compute deviations from equipment checks
  const computedDeviations = React.useMemo((): Deviation[] => {
    const d: Deviation[] = [];
    const e = form.equipment;
    const add = (item: string, deviation: string) =>
      d.push({ id: `auto-${item}`, item, deviation });

    if (e.windscreenCondition && e.windscreenCondition !== 'Good') add('Windscreen', e.windscreenCondition);
    if (e.wipersCondition && e.wipersCondition !== 'Good') add('Wipers', e.wipersCondition);

    const wheels: [string, WheelCheck][] = [
      ['Left Front Wheel', e.leftFrontWheel], ['Right Front Wheel', e.rightFrontWheel],
      ['Left Rear Wheel', e.leftRearWheel], ['Right Rear Wheel', e.rightRearWheel],
    ];
    for (const [name, w] of wheels) {
      if (w.tyreThreadCondition && w.tyreThreadCondition !== 'Good') add(`${name} – Tyre`, w.tyreThreadCondition);
      if (w.bubblesOrDamage === 'Yes') add(`${name} – Damage`, 'Bubbles or damage present');
      if (w.allWheelNutsInPlace === 'No') add(`${name} – Wheel Nuts`, 'Not all wheel nuts in place');
    }

    if (e.headlightsBothWorking === 'No') add('Headlights', 'Both headlights not working');
    if (e.headlightsFreeFromDamage === 'No') add('Headlights', 'Headlights damaged');
    if (e.headlightsLensesClear === 'No') add('Headlights', 'Lenses not clear');
    if (e.taillightsBothWorking === 'No') add('Taillights', 'Both taillights not working');
    if (e.taillightsFreeFromDamage === 'No') add('Taillights', 'Taillights damaged');
    if (e.taillightsLensesClear === 'No') add('Taillights', 'Taillights lenses not clear');
    if (e.leftIndicatorWorking === 'No') add('Left Indicator', 'Not working');
    if (e.rightIndicatorWorking === 'No') add('Right Indicator', 'Not working');
    if (e.hazardsWorking === 'No') add('Hazards', 'Not working');
    if (e.hooterWorking === 'No') add('Hooter', 'Not working / volume inadequate');
    if (e.fireExtinguisher === 'No') add('Fire Extinguisher', 'Missing or expired');
    if (e.stopBlock === 'No') add('Stop Block', 'Missing');
    if (e.engineOilLevel === 'No') add('Engine Oil', 'Oil level not in order');
    if (e.oilLeaks === 'Yes') add('Engine Oil', 'Oil leaks present');
    if (e.coolantLevel === 'No') add('Coolant', 'Coolant level not in order');
    if (e.coolantLeaks === 'Yes') add('Coolant', 'Coolant leaks present');
    if (e.fanBelt && e.fanBelt !== 'Good') add('Fan Belt', e.fanBelt);
    if (e.alternatorBelt && e.alternatorBelt !== 'Good') add('Alternator Belt', e.alternatorBelt);
    if (e.waterHoses && e.waterHoses !== 'Good') add('Water Hoses', e.waterHoses);
    if (e.radiatorLevel && e.radiatorLevel !== 'Good') add('Radiator Level', e.radiatorLevel);
    if (e.fuelLeaks && e.fuelLeaks !== 'None' && e.fuelLeaks !== '') add('Fuel Leaks', e.fuelLeaks);
    if (e.suspension === 'No') add('Suspension', 'Not in good condition');
    if (e.brakes === 'No') add('Brakes', 'Not in good condition');
    if (e.clutch === 'No') add('Clutch', 'Not in good condition');
    if (e.airConditioner === 'No') add('Air Conditioner', 'Not working');
    if (e.rearViewMirrors === 'No') add('Rear View Mirrors', 'Not all mirrors in good condition');
    if (e.seatbelts === 'No') add('Seatbelts', 'Not in good condition');

    // Generator-specific deviations
    if (form.inspectionType === 'Generator') {
      const g = form.generatorEquipment;
      if (g.engineOilLevelOk === 'No') add('Engine Oil', 'Oil level not in order');
      if (g.oilLeaks === 'Yes')         add('Engine Oil', 'Oil leaks present');
      if (g.coolantLevelOk === 'No')    add('Coolant', 'Coolant level not in order');
      if (g.coolantLeaks === 'Yes')     add('Coolant', 'Coolant leaks present');
      if (g.fanBelt !== 'Ok' && g.fanBelt !== 'N/A')           add('Fan Belt', g.fanBelt);
      if (g.alternatorBelt !== 'Ok' && g.alternatorBelt !== 'N/A') add('Alternator Belt', g.alternatorBelt);
      if (g.waterHoses !== 'Ok' && g.waterHoses !== 'N/A')    add('Water Hoses', g.waterHoses);
      if (g.radiatorLevel !== 'Ok' && g.radiatorLevel !== 'N/A') add('Radiator Level', g.radiatorLevel);
      if (g.engineOilLevelEngine !== 'Ok' && g.engineOilLevelEngine !== 'N/A') add('Engine Oil Level', g.engineOilLevelEngine);
      if (g.batteryWaterLevel !== 'Ok' && g.batteryWaterLevel !== 'N/A') add('Battery Water Level', g.batteryWaterLevel);
      if (g.temperature !== 'Ok' && g.temperature !== 'N/A')  add('Temperature', g.temperature);
      if (g.fuelLeaks && g.fuelLeaks !== 'None' && g.fuelLeaks !== '') add('Fuel Leaks', g.fuelLeaks);
    }

    // Merge with manual deviations
    return [...d, ...form.deviations.filter(md => !md.id.startsWith('auto-'))];
  }, [form.equipment, form.deviations]);

  const computeResult = (): InspectionRecord['result'] => {
    const failKeywords = ['Not Working', 'damaged', 'missing', 'expired'];
    const hasFailure = computedDeviations.some(d =>
      failKeywords.some(kw => d.deviation.toLowerCase().includes(kw.toLowerCase()))
    );
    if (hasFailure) return computedDeviations.length > 3 ? 'fail' : 'requires_attention';
    return computedDeviations.length > 0 ? 'requires_attention' : 'pass';
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = computeResult();
      const formWithDeviations = { ...form, deviations: computedDeviations };
      const vehicle = vehicles.find(v => v.registration === form.registrationNumber);
      const payload = {
        vehicle_id: vehicle?.id ?? form.registrationNumber,
        vehicle_reg: form.registrationNumber || null,
        inspector_id: null as string | null,
        inspector_name: form.inspectedBy || null,
        inspection_type: form.inspectionType,
        started_at: form.inspectionDate ? new Date(form.inspectionDate).toISOString() : new Date().toISOString(),
        completed_at: new Date().toISOString(),
        status: result,
        answers: formWithDeviations as any,
        notes: computedDeviations.map(d => `${d.item}: ${d.deviation}`).join('; ') || null,
        odometer: form.currentHours ? parseInt(form.currentHours) || null : null,
        hour_meter: null as number | null,
        signature_url: null as string | null,
        template_id: null as string | null,
      };
      const saved = await createInspection(payload);
      const record: InspectionRecord = {
        id: saved.id,
        ...(formWithDeviations),
        result,
      };
      setInspections(prev => [record, ...prev]);
      setShowForm(false);
      setActiveTab(0);

      // T47/T48: offer to log breakdown costs as cost entries
      const breakdownsWithCost = form.monthlyBreakdowns.filter(b => b.costToRepair && parseFloat(b.costToRepair) > 0);
      if (breakdownsWithCost.length > 0 && vehicle) {
        setBreakdownCostModal({ vehicleId: vehicle.id, vehicleReg: form.registrationNumber, breakdowns: breakdownsWithCost });
      } else {
        setForm(defaultForm());
      }
    } catch (e: any) {
      alert('Failed to save inspection: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInspection = async (id: string) => {
    if (!confirm('Delete this inspection?')) return;
    try {
      await deleteInspection(id);
      setInspections(prev => prev.filter(i => i.id !== id));
    } catch (e: any) {
      alert('Delete failed: ' + e.message);
    }
  };

  // For drivers: match against slash-separated assigned_driver e.g. "Dumisane/Jabu/Sam"
  const visibleVehicles = isDriver
    ? vehicles.filter(v =>
        v.assigned_driver
          ?.split('/')
          .map(n => n.trim().toLowerCase())
          .includes(user?.name?.toLowerCase() ?? '')
      )
    : vehicles;

  // For drivers: only show inspections for their assigned vehicles
  const assignedRegs = new Set(visibleVehicles.map(v => v.registration));
  const filteredInspections = inspections.filter(i => {
    if (isDriver && !assignedRegs.has(i.registrationNumber)) return false;
    if (typeFilter !== 'All' && (i.inspectionType ?? 'General') !== typeFilter) return false;
    return (
      i.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.vehicleMakeModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.inspectedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.siteAllocation.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const ResultBadge: React.FC<{ result: InspectionRecord['result'] }> = ({ result }) => {
    const cfg = {
      pass: { cls: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3 mr-1" />, label: 'Pass' },
      fail: { cls: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3 mr-1" />, label: 'Fail' },
      requires_attention: { cls: 'bg-yellow-100 text-yellow-800', icon: <AlertCircle className="h-3 w-3 mr-1" />, label: 'Requires Attention' },
    };
    const { cls, icon, label } = cfg[result];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
        {icon}{label}
      </span>
    );
  };

  // ── Render tabs ─────────────────────────────────────────────────────────────

  const renderTab0 = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 flex items-center"><MapPin className="h-4 w-4 mr-1" /> GPS timestamp will be captured on submission.</p>

      {/* Driver: vehicle quick-select */}
      {isDriver && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Vehicle
            {visibleVehicles.length === 0 && (
              <span className="ml-2 text-orange-500 text-xs font-normal">(no vehicle assigned yet — contact your admin)</span>
            )}
          </label>
          <select
            value={form.registrationNumber}
            onChange={e => {
              const pool = visibleVehicles.length > 0 ? visibleVehicles : vehicles;
              const v = pool.find(v => v.registration === e.target.value);
              if (v) { set('registrationNumber', v.registration); set('vehicleMakeModel', `${v.make} ${v.model}`.trim()); }
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select vehicle…</option>
            {(visibleVehicles.length > 0 ? visibleVehicles : vehicles).map(v => (
              <option key={v.id} value={v.registration}>{v.registration} — {v.make} {v.model}</option>
            ))}
          </select>
        </div>
      )}

      {/* Inspection Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Inspection Type</label>
        <div className="flex flex-wrap gap-3">
          {([
            { t: 'General',   active: 'bg-blue-600 border-blue-600 text-white' },
            { t: 'Forklift',  active: 'bg-orange-500 border-orange-500 text-white' },
            { t: 'Generator', active: 'bg-green-600 border-green-600 text-white' },
          ] as const).map(({ t, active }) => (
            <button
              key={t}
              type="button"
              onClick={() => set('inspectionType', t)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                form.inspectionType === t ? active : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {([
          ['Previous Inspection Date', 'previousInspectionDate', 'date'],
          ['Inspection Date *', 'inspectionDate', 'date'],
          ['Inspected By *', 'inspectedBy', 'text'],
          ['Site Allocation', 'siteAllocation', 'text'],
          ['Vehicle Make & Model *', 'vehicleMakeModel', 'text'],
          ['Registration Number *', 'registrationNumber', 'text'],
          ['Current Hours / Odometer', 'currentHours', 'text'],
          ['Last Service (Hours)', 'lastServiceHours', 'text'],
          ['Last Service (Date)', 'lastServiceDate', 'date'],
          ['Next Service (Hours)', 'nextServiceHours', 'text'],
          ['Next Service (Date)', 'nextServiceDate', 'date'],
          ['Previous Load Test Date', 'previousLoadTestDate', 'text'],
          ['Next Load Test Date', 'nextLoadTestDate', 'text'],
          ['Total Maintenance Cost (R)', 'totalMaintenanceCost', 'text'],
          ['Avg Monthly Maintenance Cost (R)', 'avgMonthlyMaintenanceCost', 'text'],
          ['Serial Number', 'serialNumberText', 'text'],
          ['Service Sticker Date', 'serviceStickerDate', 'date'],
        ] as [string, keyof typeof form, string][]).map(([label, field, type]) => (
          <div key={field}>
            <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
            <input
              type={type}
              value={form[field] as string}
              onChange={(e) => set(field, e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>
    </div>
  );

  const renderTab1 = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">Track weekly operational hours and pre-use checklist compliance.</p>
        <button
          type="button"
          onClick={() => set('weeklyUse', [...form.weeklyUse, newWeekRow()])}
          className="flex items-center text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-1" /> Add Week
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Week</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Operational Hours</th>
              {form.inspectionType !== 'Generator' && <>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Checklists Completed?</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Findings?</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Findings Addressed?</th>
              </>}
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {form.weeklyUse.map((row, idx) => (
              <tr key={row.id} className="bg-white">
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={row.weekLabel}
                    onChange={(e) => {
                      const updated = [...form.weeklyUse];
                      updated[idx] = { ...row, weekLabel: e.target.value };
                      set('weeklyUse', updated);
                    }}
                    placeholder="e.g. Dec 26-30"
                    className="w-28 border rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={row.operationalHours}
                    onChange={(e) => {
                      const updated = [...form.weeklyUse];
                      updated[idx] = { ...row, operationalHours: e.target.value };
                      set('weeklyUse', updated);
                    }}
                    placeholder="e.g. 3Hrs"
                    className="w-20 border rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                {form.inspectionType !== 'Generator' && (['checklistsCompleted', 'findingsOnChecklists', 'findingsCommunicated'] as const).map((f) => (
                  <td key={f} className="px-3 py-2">
                    <YesNoSelect
                      value={row[f]}
                      onChange={(v) => {
                        const updated = [...form.weeklyUse];
                        updated[idx] = { ...row, [f]: v };
                        set('weeklyUse', updated);
                      }}
                    />
                  </td>
                ))}
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => set('weeklyUse', form.weeklyUse.filter((_, i) => i !== idx))}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {form.weeklyUse.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400 text-sm">No weeks added yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTab2 = () => (
    <div className="space-y-6">
      {/* 1.1 Pre-use Inspection Checklist Findings */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800">1.1 Pre-Use Inspection Checklist Findings</h3>
          <button
            type="button"
            onClick={() => set('checklistFindings', [...form.checklistFindings, { id: Date.now().toString(), date: '', description: '', remedialAction: '' }])}
            className="flex items-center text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Finding
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-2 italic">** Attach relevant pre-use inspection checklist and proof of close-out **</p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-8">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Finding Description</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Remedial Action Taken</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {form.checklistFindings.map((row, idx) => (
                <tr key={row.id} className="bg-white">
                  <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <input type="date" value={row.date}
                      onChange={(e) => { const u = [...form.checklistFindings]; u[idx] = { ...row, date: e.target.value }; set('checklistFindings', u); }}
                      className="border rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" value={row.description} placeholder="Describe finding..."
                      onChange={(e) => { const u = [...form.checklistFindings]; u[idx] = { ...row, description: e.target.value }; set('checklistFindings', u); }}
                      className="w-full border rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" value={row.remedialAction} placeholder="Action taken..."
                      onChange={(e) => { const u = [...form.checklistFindings]; u[idx] = { ...row, remedialAction: e.target.value }; set('checklistFindings', u); }}
                      className="w-full border rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => set('checklistFindings', form.checklistFindings.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {form.checklistFindings.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400 text-sm">No findings logged</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Monthly Breakdowns */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800">2. Monthly Breakdowns</h3>
          <button
            type="button"
            onClick={() => set('monthlyBreakdowns', [...form.monthlyBreakdowns, { id: Date.now().toString(), description: '', durationHrs: '', spareParts: '', costToRepair: '' }])}
            className="flex items-center text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Breakdown
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-2 italic">** Attach relevant breakdown report and proof of close-out **</p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-8">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Breakdown Description</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Duration (Hrs)</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Spare Parts Needed</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Cost to Repair (R)</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {form.monthlyBreakdowns.map((row, idx) => (
                <tr key={row.id} className="bg-white">
                  <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                  {(['description', 'durationHrs', 'spareParts', 'costToRepair'] as const).map((f) => (
                    <td key={f} className="px-3 py-2">
                      <input type="text" value={row[f]}
                        onChange={(e) => { const u = [...form.monthlyBreakdowns]; u[idx] = { ...row, [f]: e.target.value }; set('monthlyBreakdowns', u); }}
                        className="w-full border rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500" />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => set('monthlyBreakdowns', form.monthlyBreakdowns.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {form.monthlyBreakdowns.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400 text-sm">No breakdowns this month</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTab3 = () => {
    const isGen = form.inspectionType === 'Generator';
    const prefix = isGen ? 'Machine' : 'Vehicle';
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Take photos of each angle of the {isGen ? 'generator' : 'vehicle'} and relevant identifiers.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {([
            [`${prefix} Front`, 'vehicleFrontPhoto'],
            [`${prefix} Left`,  'vehicleLeftPhoto'],
            [`${prefix} Right`, 'vehicleRightPhoto'],
            [`${prefix} Back`,  'vehicleBackPhoto'],
            ['Interior',        'interiorPhoto'],
            ['Serial Number Plate', 'serialNumberPhoto'],
            ['Service Sticker', 'serviceSticker'],
          ] as [string, keyof typeof form][]).map(([label, field]) => (
            <PhotoUpload
              key={field}
              label={label}
              value={form[field] as string}
              onChange={(v) => set(field, v)}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderWheelSection = (label: string, wheel: 'leftFrontWheel' | 'rightFrontWheel' | 'leftRearWheel' | 'rightRearWheel') => (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <PhotoUpload label="Photo" value={form.equipment[wheel].photo} onChange={(v) => setWheel(wheel, 'photo', v)} />
      </div>
      <CheckRow label="Tyre Thread Condition">
        <ConditionSelect value={form.equipment[wheel].tyreThreadCondition} onChange={(v) => setWheel(wheel, 'tyreThreadCondition', v)} />
      </CheckRow>
      <CheckRow label="Any bubbles or other damage?">
        <YesNoSelect value={form.equipment[wheel].bubblesOrDamage} onChange={(v) => setWheel(wheel, 'bubblesOrDamage', v)} />
      </CheckRow>
      <CheckRow label="All Wheel Nuts In Place">
        <YesNoSelect value={form.equipment[wheel].allWheelNutsInPlace} onChange={(v) => setWheel(wheel, 'allWheelNutsInPlace', v)} />
      </CheckRow>
    </div>
  );

  const renderTab4Generator = () => {
    const g = form.generatorEquipment;
    const okOptions = ['Ok', 'Not Ok', 'N/A'];
    const OkSelect: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
      <select value={value} onChange={e => onChange(e.target.value)}
        className="border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500">
        {okOptions.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
    return (
      <div className="space-y-2">
        <SectionHeader title="Fluids" />
        <CheckRow label="Engine oil level in order">
          <YesNoSelect value={g.engineOilLevelOk} onChange={v => setGenEquip('engineOilLevelOk', v)} />
        </CheckRow>
        <CheckRow label="Any oil leaks">
          <YesNoSelect value={g.oilLeaks} onChange={v => setGenEquip('oilLeaks', v)} />
        </CheckRow>
        <CheckRow label="Coolant level in order">
          <YesNoSelect value={g.coolantLevelOk} onChange={v => setGenEquip('coolantLevelOk', v)} />
        </CheckRow>
        <CheckRow label="Any coolant leaks">
          <YesNoSelect value={g.coolantLeaks} onChange={v => setGenEquip('coolantLeaks', v)} />
        </CheckRow>

        <SectionHeader title="Fuel Gauge" />
        <div className="flex items-start gap-3 py-2 border-b border-gray-100">
          <span className="text-sm text-gray-700 flex-1">Fuel Gauge Photo</span>
          <div className="w-24"><PhotoUpload label="Gauge photo" value={g.fuelGaugePhoto} onChange={v => setGenEquip('fuelGaugePhoto', v)} /></div>
        </div>
        <CheckRow label="Fuel Level">
          <input type="text" value={g.fuelLevel} onChange={e => setGenEquip('fuelLevel', e.target.value)}
            placeholder="e.g. Half Tank, Full"
            className="border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 w-40" />
        </CheckRow>

        <SectionHeader title="Engine" />
        {([
          ['Fan belt',            'fanBelt'],
          ['Alternator belt',     'alternatorBelt'],
          ['Water hoses',         'waterHoses'],
          ['Radiator level',      'radiatorLevel'],
          ['Engine oil level',    'engineOilLevelEngine'],
          ['Battery water level', 'batteryWaterLevel'],
          ['Temperature',         'temperature'],
        ] as [string, keyof GeneratorEquipmentChecks][]).map(([label, field]) => (
          <CheckRow key={field} label={label}>
            <OkSelect value={g[field] as string} onChange={v => setGenEquip(field, v)} />
          </CheckRow>
        ))}
        <CheckRow label="Fuel leaks">
          <input type="text" value={g.fuelLeaks} onChange={e => setGenEquip('fuelLeaks', e.target.value)}
            placeholder="None / describe..."
            className="border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 w-40" />
        </CheckRow>
      </div>
    );
  };

  const renderTab4 = () => {
    if (form.inspectionType === 'Generator') return renderTab4Generator();
    const e = form.equipment;
    return (
      <div className="space-y-2">

        <SectionHeader title="Windscreen & Wipers" />
        <CheckRow label="Windscreen Condition">
          <div className="flex items-center gap-2">
            <ConditionSelect value={e.windscreenCondition} onChange={(v) => setEquip('windscreenCondition', v)} />
            <div className="w-16"><PhotoUpload label="Photo" value={e.windscreenPhoto} onChange={(v) => setEquip('windscreenPhoto', v)} /></div>
          </div>
        </CheckRow>
        <CheckRow label="Wipers effectively wipe windscreen">
          <ConditionSelect value={e.wipersCondition} onChange={(v) => setEquip('wipersCondition', v)} />
        </CheckRow>

        <SectionHeader title="Wheels" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {renderWheelSection('Left Front Wheel (Passenger Side)', 'leftFrontWheel')}
          {renderWheelSection('Right Front Wheel (Driver Side)', 'rightFrontWheel')}
          {renderWheelSection('Left Rear Wheel (Passenger Side)', 'leftRearWheel')}
          {renderWheelSection('Right Rear Wheel (Driver Side)', 'rightRearWheel')}
        </div>

        <SectionHeader title="Lighting" />
        {[
          ['Both headlights and high beams working', 'headlightsBothWorking'],
          ['Headlights free from damage', 'headlightsFreeFromDamage'],
          ['Headlight lenses clear', 'headlightsLensesClear'],
          ['Both taillights and brake lights working', 'taillightsBothWorking'],
          ['Taillights free from damage', 'taillightsFreeFromDamage'],
          ['Taillight lenses clear', 'taillightsLensesClear'],
          ['Left indicator (front and rear) working', 'leftIndicatorWorking'],
          ['Right indicator (front and rear) working', 'rightIndicatorWorking'],
          ['Hazards working', 'hazardsWorking'],
        ].map(([label, field]) => (
          <CheckRow key={field} label={label}>
            <YesNoSelect value={e[field as keyof EquipmentChecks] as YesNo} onChange={(v) => setEquip(field as keyof EquipmentChecks, v)} />
          </CheckRow>
        ))}

        <SectionHeader title="Hooter & Emergency Kit" />
        <CheckRow label="Hooter working and volume adequate">
          <YesNoSelect value={e.hooterWorking} onChange={(v) => setEquip('hooterWorking', v)} />
        </CheckRow>
        <CheckRow label="Fire extinguisher present and valid">
          <YesNoSelect value={e.fireExtinguisher} onChange={(v) => setEquip('fireExtinguisher', v)} />
        </CheckRow>
        <CheckRow label="Stop block present">
          <YesNoSelect value={e.stopBlock} onChange={(v) => setEquip('stopBlock', v)} />
        </CheckRow>

        <SectionHeader title="Fluids" />
        <CheckRow label="Engine oil level in order">
          <YesNoSelect value={e.engineOilLevel} onChange={(v) => setEquip('engineOilLevel', v)} />
        </CheckRow>
        <CheckRow label="Any oil leaks">
          <YesNoSelect value={e.oilLeaks} onChange={(v) => setEquip('oilLeaks', v)} />
        </CheckRow>
        <CheckRow label="Coolant level in order">
          <YesNoSelect value={e.coolantLevel} onChange={(v) => setEquip('coolantLevel', v)} />
        </CheckRow>
        <CheckRow label="Any coolant leaks">
          <YesNoSelect value={e.coolantLeaks} onChange={(v) => setEquip('coolantLeaks', v)} />
        </CheckRow>
        <div className="flex items-start gap-3 py-2 border-b border-gray-100">
          <span className="text-sm text-gray-700 flex-1">Hydraulics Oil – Gauge Photo</span>
          <div className="flex items-center gap-2">
            <div className="w-24"><PhotoUpload label="Gauge photo" value={e.hydraulicsOilPhoto} onChange={(v) => setEquip('hydraulicsOilPhoto', v)} /></div>
            <input type="text" value={e.hydraulicsNote} onChange={(e) => setEquip('hydraulicsNote', e.target.value)}
              placeholder="Note (e.g. Door locked, key lost)"
              className="border rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 w-40" />
          </div>
        </div>

        <SectionHeader title="Engine" />
        {[
          ['Fan belt', 'fanBelt'], ['Alternator belt', 'alternatorBelt'],
          ['Water hoses', 'waterHoses'], ['Radiator level', 'radiatorLevel'],
          ['Engine oil level', 'engineOilLevelEngine'], ['Battery water level', 'batteryWaterLevel'],
          ['Engine temperature', 'engineTemperature'],
        ].map(([label, field]) => (
          <CheckRow key={field} label={label}>
            <ConditionSelect value={e[field as keyof EquipmentChecks] as Condition} onChange={(v) => setEquip(field as keyof EquipmentChecks, v)} />
          </CheckRow>
        ))}
        <CheckRow label="Fuel leaks">
          <input type="text" value={e.fuelLeaks} onChange={(ev) => setEquip('fuelLeaks', ev.target.value)}
            placeholder="None / describe..."
            className="border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 w-32" />
        </CheckRow>

        <SectionHeader title="General" />
        {[
          ['Suspension in good condition', 'suspension'],
          ['Brakes in good condition', 'brakes'],
          ['Clutch in good condition and easily engages gear', 'clutch'],
          ['Air conditioner working', 'airConditioner'],
          ['All 3 rear view mirrors in good condition', 'rearViewMirrors'],
          ['All seatbelts and seatbelt latches in good condition', 'seatbelts'],
        ].map(([label, field]) => (
          <CheckRow key={field} label={label}>
            <YesNoSelect value={e[field as keyof EquipmentChecks] as YesNo} onChange={(v) => setEquip(field as keyof EquipmentChecks, v)} />
          </CheckRow>
        ))}
      </div>
    );
  };

  const renderTab5 = () => {
    const manualDeviations = form.deviations.filter(d => !d.id.startsWith('auto-'));
    return (
      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-gray-800">1.2 Deviations</h3>
            <button
              type="button"
              onClick={() => set('deviations', [...form.deviations, { id: Date.now().toString(), item: '', deviation: '' }])}
              className="flex items-center text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1" /> Add Manual
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">Items flagged by equipment checks appear automatically. Add additional deviations manually below.</p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-8">No</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Deviation</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 w-16">Source</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {computedDeviations.map((dev, idx) => {
                  const isAuto = dev.id.startsWith('auto-');
                  return (
                    <tr key={dev.id} className={isAuto ? 'bg-yellow-50' : 'bg-white'}>
                      <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                      <td className="px-3 py-2">
                        {isAuto ? <span className="text-gray-700">{dev.item}</span> : (
                          <input type="text" value={dev.item}
                            onChange={(e) => { const u = form.deviations.map(d => d.id === dev.id ? { ...d, item: e.target.value } : d); set('deviations', u); }}
                            className="w-full border rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500" />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isAuto ? <span className="text-gray-700">{dev.deviation}</span> : (
                          <input type="text" value={dev.deviation}
                            onChange={(e) => { const u = form.deviations.map(d => d.id === dev.id ? { ...d, deviation: e.target.value } : d); set('deviations', u); }}
                            className="w-full border rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500" />
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${isAuto ? 'bg-yellow-200 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                          {isAuto ? 'Auto' : 'Manual'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {!isAuto && (
                          <button type="button" onClick={() => set('deviations', form.deviations.filter(d => d.id !== dev.id))} className="text-red-500 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {computedDeviations.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-green-600 text-sm font-medium">No deviations found — vehicle is in good condition</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Outcome preview */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Inspection Outcome Preview</p>
          <div className="flex items-center gap-3">
            {(() => {
              const r = computeResult();
              const cfg = {
                pass: { cls: 'bg-green-100 border-green-300 text-green-800', label: 'PASS — No deviations detected' },
                requires_attention: { cls: 'bg-yellow-100 border-yellow-300 text-yellow-800', label: `REQUIRES ATTENTION — ${computedDeviations.length} deviation(s) found` },
                fail: { cls: 'bg-red-100 border-red-300 text-red-800', label: `FAIL — ${computedDeviations.length} deviation(s) found` },
              };
              return <div className={`border rounded-lg px-4 py-3 font-semibold text-sm ${cfg[r].cls}`}>{cfg[r].label}</div>;
            })()}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => { setShowForm(false); setForm(defaultForm()); setActiveTab(0); }}
            className="flex-1 border border-gray-300 py-2 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit Inspection
          </button>
        </div>
      </div>
    );
  };

  const tabContent = [renderTab0, renderTab1, renderTab2, renderTab3, renderTab4, renderTab5];

  // ── Main list view ──────────────────────────────────────────────────────────

  if (showForm) {
    return (
      <div className="space-y-0">
        {/* Form header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Inspection</h1>
            <p className="text-sm text-gray-500">{TABS[activeTab].label}</p>
          </div>
          <button onClick={() => { setShowForm(false); setForm(defaultForm()); setActiveTab(0); }} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex overflow-x-auto gap-1 mb-4 bg-gray-100 p-1 rounded-lg">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="bg-white rounded-lg shadow p-6 min-h-[400px]">
          {tabContent[activeTab]()}
        </div>

        {/* Nav buttons */}
        <div className="flex justify-between mt-4">
          <button
            type="button"
            onClick={() => setActiveTab(t => Math.max(0, t - 1))}
            disabled={activeTab === 0}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </button>
          {activeTab < TABS.length - 1 ? (
            <button
              type="button"
              onClick={() => setActiveTab(t => Math.min(TABS.length - 1, t + 1))}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Inspections</h1>
        <button
          onClick={() => {
            const base = defaultForm();
            if (isDriver && user) {
              base.inspectedBy = user.name;
              const v = visibleVehicles[0];
              if (v) { base.registrationNumber = v.registration; base.vehicleMakeModel = `${v.make} ${v.model}`.trim(); }
            }
            setForm(base);
            setShowForm(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Inspection
        </button>
      </div>

      {/* Search + Type filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by vehicle, registration, inspector, or site..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {([
              { t: 'All',       active: 'bg-gray-700 border-gray-700 text-white' },
              { t: 'General',   active: 'bg-blue-600 border-blue-600 text-white' },
              { t: 'Forklift',  active: 'bg-orange-500 border-orange-500 text-white' },
              { t: 'Generator', active: 'bg-green-600 border-green-600 text-white' },
            ] as const).map(({ t, active }) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t as typeof typeFilter)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap ${
                  typeFilter === t ? active : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-full"><ClipboardList className="h-6 w-6 text-blue-600" /></div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Inspections</p>
              <p className="text-2xl font-bold text-gray-900">{inspections.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-full"><CheckCircle className="h-6 w-6 text-green-600" /></div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pass</p>
              <p className="text-2xl font-bold text-gray-900">{inspections.filter(i => i.result === 'pass').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-full"><AlertCircle className="h-6 w-6 text-yellow-600" /></div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Attention / Fail</p>
              <p className="text-2xl font-bold text-gray-900">{inspections.filter(i => i.result !== 'pass').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loadingList ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-500">Loading inspections…</span>
          </div>
        ) : filteredInspections.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No inspections found</h3>
            <p className="mt-1 text-gray-500">{searchTerm ? 'Try adjusting your search' : 'Start by creating a new inspection'}</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Site</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inspected By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deviations</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInspections.map((insp) => (
                <tr key={insp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const t = insp.inspectionType ?? 'General';
                      const cls = t === 'Forklift' ? 'bg-orange-100 text-orange-800'
                                : t === 'Generator' ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800';
                      return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{t}</span>;
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{insp.vehicleMakeModel}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{insp.registrationNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{insp.inspectionDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{insp.siteAllocation}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{insp.currentHours}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{insp.inspectedBy}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{insp.deviations?.length || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><ResultBadge result={insp.result} /></td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <button onClick={() => printInspection(insp)} className="text-blue-500 hover:text-blue-700" title="Download / Print PDF">
                        <Printer className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteInspection(insp.id)} className="text-red-500 hover:text-red-700" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── T47/T48: Log breakdown costs modal ── */}
      {breakdownCostModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Log Breakdown Costs?</h3>
                <p className="text-xs text-gray-500 mt-0.5">The following breakdown costs can be saved as cost entries for {breakdownCostModal.vehicleReg}.</p>
              </div>
              <button onClick={() => { setBreakdownCostModal(null); setForm(defaultForm()); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-2 max-h-60 overflow-y-auto">
              {breakdownCostModal.breakdowns.map(b => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b border-gray-100 text-sm">
                  <span className="text-gray-700 flex-1">{b.description || 'Breakdown'}</span>
                  <span className="font-semibold text-gray-900 ml-4">R {parseFloat(b.costToRepair).toLocaleString('en-ZA')}</span>
                </div>
              ))}
              <p className="text-sm font-bold text-gray-900 pt-1">
                Total: R {breakdownCostModal.breakdowns.reduce((s, b) => s + (parseFloat(b.costToRepair) || 0), 0).toLocaleString('en-ZA')}
              </p>
            </div>
            <div className="px-5 py-4 flex gap-3 justify-end border-t">
              <button
                onClick={() => { setBreakdownCostModal(null); setForm(defaultForm()); }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Skip
              </button>
              <button
                disabled={savingCosts}
                onClick={async () => {
                  setSavingCosts(true);
                  try {
                    const today = new Date().toISOString().slice(0, 10);
                    for (const b of breakdownCostModal.breakdowns) {
                      await createCost({
                        vehicle_id: breakdownCostModal.vehicleId,
                        vehicle_registration: breakdownCostModal.vehicleReg || null,
                        date: today,
                        category: 'Maintenance',
                        amount: parseFloat(b.costToRepair) || 0,
                        description: b.description || 'Breakdown repair',
                        supplier: null,
                        invoice_number: null,
                        receipt_url: null,
                        rto_number: null,
                        po_number: null,
                        quote_number: null,
                        km_reading: null,
                        created_by: null,
                      });
                    }
                    setBreakdownCostModal(null);
                    setForm(defaultForm());
                  } catch (e: any) {
                    alert('Failed to save costs: ' + e.message);
                  } finally {
                    setSavingCosts(false);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {savingCosts ? 'Saving…' : 'Save as Cost Entries'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inspections;
