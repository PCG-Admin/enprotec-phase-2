import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase/client';
import type { Database } from '../supabase/database.types';
import type { User } from '../types';

type VehicleRow = Database['public']['Tables']['en_inspection_report_vehicles']['Row'];
type InspectionRow = Database['public']['Tables']['en_inspection_report_inspections']['Row'];

interface FleetDashboardProps {
  user: User;
}

interface VehicleWithInsights extends VehicleRow {
  lastInspection?: {
    inspection_date: string | null;
    overall_status: string | null;
    odometer: number | null;
  };
}

const SERVICE_GRACE_KM = 500;
const HIGH_MILEAGE_THRESHOLD = 200000;
const LICENSE_WARNING_DAYS = 30;

const FleetDashboard: React.FC<FleetDashboardProps> = () => {
  const [vehicles, setVehicles] = useState<VehicleWithInsights[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [{ data: vehicleData, error: vehicleError }, { data: inspectionData, error: inspectionError }] =
          await Promise.all([
            supabase
              .from('en_inspection_report_vehicles')
              .select('*')
              .order('registration_number', { ascending: true }),
            supabase
              .from('en_inspection_report_inspections')
              .select('id, vehicle_id, inspection_date, overall_status, odometer')
              .not('vehicle_id', 'is', null)
              .order('inspection_date', { ascending: false }),
          ]);

        if (vehicleError) throw vehicleError;
        if (inspectionError) throw inspectionError;

        const lastInspectionByVehicle = new Map<string, InspectionRow>();

        (inspectionData ?? []).forEach(inspection => {
          if (!inspection.vehicle_id) return;
          if (!lastInspectionByVehicle.has(inspection.vehicle_id)) {
            lastInspectionByVehicle.set(inspection.vehicle_id, inspection);
          }
        });

        if (isMounted) {
          const enhancedVehicles: VehicleWithInsights[] = (vehicleData ?? []).map(vehicle => ({
            ...vehicle,
            lastInspection: vehicle.id
              ? lastInspectionByVehicle.has(vehicle.id)
                ? lastInspectionByVehicle.get(vehicle.id)
                : undefined
              : undefined,
          }));

          setVehicles(enhancedVehicles);
        }
      } catch (fetchError: any) {
        console.error(fetchError);
        if (isMounted) {
          setError(fetchError.message ?? 'Failed to load fleet insights.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const totalVehicles = vehicles.length;

    const dueForService = vehicles.filter(vehicle => {
      if (vehicle.current_odometer == null || vehicle.next_service_km == null) return false;
      return vehicle.current_odometer >= vehicle.next_service_km;
    });

    const serviceSoon = vehicles.filter(vehicle => {
      if (vehicle.current_odometer == null || vehicle.next_service_km == null) return false;
      return (
        vehicle.current_odometer < vehicle.next_service_km &&
        vehicle.current_odometer >= vehicle.next_service_km - SERVICE_GRACE_KM
      );
    });

    const highMileage = vehicles.filter(vehicle => {
      if (vehicle.current_odometer == null) return false;
      return vehicle.current_odometer >= HIGH_MILEAGE_THRESHOLD;
    });

    const licenseDue = vehicles.filter(vehicle => {
      if (!vehicle.license_expiry) return false;
      const expiry = new Date(vehicle.license_expiry);
      const now = new Date();
      const diff = expiry.getTime() - now.getTime();
      const days = diff / (1000 * 60 * 60 * 24);
      return days <= LICENSE_WARNING_DAYS;
    });

    return {
      totalVehicles,
      dueForService,
      serviceSoon,
      highMileage,
      licenseDue,
    };
  }, [vehicles]);

  const vehiclesNeedingAttention = useMemo(() => {
    return vehicles.filter(vehicle => {
      const serviceDue =
        vehicle.current_odometer != null &&
        vehicle.next_service_km != null &&
        vehicle.current_odometer >= vehicle.next_service_km;

      const licenseDue =
        vehicle.license_expiry != null &&
        new Date(vehicle.license_expiry).getTime() - Date.now() <= LICENSE_WARNING_DAYS * 24 * 60 * 60 * 1000;

      const failedLastInspection =
        vehicle.lastInspection?.overall_status &&
        vehicle.lastInspection.overall_status.toLowerCase() === 'fail';

      return serviceDue || licenseDue || failedLastInspection;
    });
  }, [vehicles]);

  const renderSummaryCard = (
    title: string,
    value: number,
    description: string,
    accentClass: string
  ) => (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
      <p className={`mt-3 text-3xl font-bold ${accentClass}`}>{value}</p>
      <p className="mt-2 text-sm text-zinc-500">{description}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-zinc-200 bg-white">
        <span className="text-sm text-zinc-500">Loading fleet insights...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-wide text-sky-600">Fleet Overview</p>
        <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">Inspection & Maintenance Dashboard</h1>
        <p className="text-sm text-zinc-500">
          Monitor service readiness, mileage, and compliance of your fleet at a glance.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {renderSummaryCard(
          'Total Vehicles',
          metrics.totalVehicles,
          'Active vehicles currently tracked in the fleet.',
          'text-zinc-900'
        )}
        {renderSummaryCard(
          'Service Overdue',
          metrics.dueForService.length,
          'Vehicles with odometer readings beyond scheduled service.',
          'text-red-600'
        )}
        {renderSummaryCard(
          'Service Approaching',
          metrics.serviceSoon.length,
          `Within ${SERVICE_GRACE_KM} km of next service interval.`,
          'text-amber-600'
        )}
        {renderSummaryCard(
          'License Expiring Soon',
          metrics.licenseDue.length,
          `Expiring within ${LICENSE_WARNING_DAYS} days.`,
          'text-sky-600'
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Vehicles Requiring Attention</h2>
            <p className="text-sm text-zinc-500">
              Prioritise these vehicles for servicing, documentation, or follow-up inspections.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 font-medium text-red-600">
              Service
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-600">
              License
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 font-medium text-sky-600">
              Inspection
            </span>
          </div>
        </div>

        {vehiclesNeedingAttention.length === 0 ? (
          <p className="mt-6 text-sm text-emerald-600">All vehicles are compliant and within service thresholds.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-600">Vehicle</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-600">Odometer</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-600">Next Service</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-600">License Expiry</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-600">Last Inspection</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-600">Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {vehiclesNeedingAttention.map(vehicle => {
                  const registration = vehicle.registration_number;
                  const makeModel = [vehicle.make, vehicle.model].filter(Boolean).join(' ');
                  const lastInspectionDate = vehicle.lastInspection?.inspection_date
                    ? new Date(vehicle.lastInspection.inspection_date).toLocaleDateString()
                    : 'No inspection';

                  const flags: string[] = [];
                  if (
                    vehicle.current_odometer != null &&
                    vehicle.next_service_km != null &&
                    vehicle.current_odometer >= vehicle.next_service_km
                  ) {
                    flags.push('Service');
                  }
                  if (
                    vehicle.license_expiry &&
                    new Date(vehicle.license_expiry).getTime() - Date.now() <= LICENSE_WARNING_DAYS * 86400000
                  ) {
                    flags.push('License');
                  }
                  if (
                    vehicle.lastInspection?.overall_status &&
                    vehicle.lastInspection.overall_status.toLowerCase() === 'fail'
                  ) {
                    flags.push('Inspection');
                  }

                  return (
                    <tr key={vehicle.id}>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-zinc-900">{registration}</span>
                          {makeModel && <span className="text-xs text-zinc-500">{makeModel}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {vehicle.current_odometer?.toLocaleString() ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {vehicle.next_service_km?.toLocaleString() ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {vehicle.license_expiry
                          ? new Date(vehicle.license_expiry).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{lastInspectionDate}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {flags.map(flag => {
                            const badgeClasses =
                              flag === 'Service'
                                ? 'bg-red-100 text-red-600'
                                : flag === 'License'
                                ? 'bg-amber-100 text-amber-600'
                                : 'bg-sky-100 text-sky-600';
                            return (
                              <span
                                key={flag}
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses}`}
                              >
                                {flag}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Mileage Distribution</h2>
        <p className="mt-1 text-sm text-zinc-500">
          High-mileage vehicles may require additional inspection and maintenance.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-medium text-zinc-700">High Mileage Vehicles</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">{metrics.highMileage.length}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
              ≥ {HIGH_MILEAGE_THRESHOLD.toLocaleString()} km
            </p>

            <ul className="mt-4 space-y-3 text-sm text-zinc-600">
              {metrics.highMileage.slice(0, 5).map(vehicle => (
                <li key={vehicle.id} className="flex justify-between">
                  <span>{vehicle.registration_number}</span>
                  <span className="font-medium text-zinc-900">
                    {vehicle.current_odometer?.toLocaleString()} km
                  </span>
                </li>
              ))}
              {metrics.highMileage.length === 0 && (
                <li className="text-xs text-emerald-600">No vehicles exceed the high mileage threshold.</li>
              )}
            </ul>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-medium text-zinc-700">Recent Inspections</p>
            <ul className="mt-4 space-y-3 text-sm text-zinc-600">
              {vehicles
                .filter(vehicle => vehicle.lastInspection)
                .slice(0, 6)
                .map(vehicle => (
                  <li key={`${vehicle.id}-inspection`} className="flex flex-col gap-1 rounded-md border border-zinc-200 bg-white px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-zinc-900">{vehicle.registration_number}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          vehicle.lastInspection?.overall_status?.toLowerCase() === 'pass'
                            ? 'bg-emerald-100 text-emerald-600'
                            : vehicle.lastInspection?.overall_status?.toLowerCase() === 'fail'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {vehicle.lastInspection?.overall_status ?? 'Pending'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>
                        {vehicle.lastInspection?.inspection_date
                          ? new Date(vehicle.lastInspection.inspection_date).toLocaleDateString()
                          : 'No date'}
                      </span>
                      <span>
                        Odo:{' '}
                        {vehicle.lastInspection?.odometer != null
                          ? `${vehicle.lastInspection?.odometer?.toLocaleString()} km`
                          : 'Unknown'}
                      </span>
                    </div>
                  </li>
                ))}
              {vehicles.filter(vehicle => vehicle.lastInspection).length === 0 && (
                <li className="text-xs text-zinc-500">
                  No inspection records available yet. Capture an inspection to populate this section.
                </li>
              )}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FleetDashboard;
