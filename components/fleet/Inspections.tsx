import * as React from 'react';
import {
  ClipboardList, CheckCircle, AlertCircle, XCircle,
  Plus, Search, X, Camera, MapPin, ChevronRight, ChevronLeft,
  Trash2, Loader2,
} from 'lucide-react';
import {
  getInspections, createInspection, deleteInspection,
} from '../../supabase/services/inspections.service';
import { getVehicles } from '../../supabase/services/vehicles.service';
import type { InspectionRow } from '../../supabase/database.types';
import type { VehicleRow } from '../../supabase/database.types';

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
  deviations: Deviation[];
  // Type
  inspectionType: 'General' | 'Forklift';
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

const TABS = [
  { id: 0, label: 'Vehicle Info' },
  { id: 1, label: 'Weekly Use' },
  { id: 2, label: 'Findings & Breakdowns' },
  { id: 3, label: 'Visual Inspection' },
  { id: 4, label: 'Equipment Checks' },
  { id: 5, label: 'Deviations & Submit' },
];

const Inspections: React.FC = () => {
  const [inspections, setInspections] = React.useState<InspectionRecord[]>([]);
  const [vehicles, setVehicles]       = React.useState<VehicleRow[]>([]);
  const [loadingList, setLoadingList] = React.useState(true);
  const [submitting, setSubmitting]   = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState(0);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<'All' | 'General' | 'Forklift'>('All');
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
        inspection_type: form.inspectionType === 'Forklift' ? 'Forklift Inspection' : 'Monthly Inspection',
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
      setForm(defaultForm());
      setActiveTab(0);
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

  const filteredInspections = inspections.filter(i => {
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

      {/* Inspection Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Inspection Type</label>
        <div className="flex gap-3">
          {(['General', 'Forklift'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => set('inspectionType', t)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                form.inspectionType === t
                  ? t === 'Forklift'
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
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
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Checklists Completed?</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Findings?</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Findings Addressed?</th>
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
                {(['checklistsCompleted', 'findingsOnChecklists', 'findingsCommunicated'] as const).map((f) => (
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

  const renderTab3 = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Take photos of each angle of the vehicle and relevant identifiers.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {([
          ['Vehicle Front', 'vehicleFrontPhoto'],
          ['Vehicle Left', 'vehicleLeftPhoto'],
          ['Vehicle Right', 'vehicleRightPhoto'],
          ['Vehicle Back', 'vehicleBackPhoto'],
          ['Interior', 'interiorPhoto'],
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

  const renderTab4 = () => {
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
          onClick={() => setShowForm(true)}
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
          <div className="flex gap-2">
            {(['All', 'General', 'Forklift'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap ${
                  typeFilter === t
                    ? t === 'Forklift'
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : t === 'General'
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-gray-700 border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
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
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      (insp.inspectionType ?? 'General') === 'Forklift'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {insp.inspectionType ?? 'General'}
                    </span>
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
                    <button onClick={() => handleDeleteInspection(insp.id)} className="text-red-500 hover:text-red-700" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Inspections;
