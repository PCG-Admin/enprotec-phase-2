import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase/client';
import { WorkflowRequest, User, WorkflowStatus, FormType, UserRole } from '../types';
import Card from './Card';

interface ReturnsProps {
    user: User;
    openForm: (form: FormType, workflow: WorkflowRequest) => void;
}

const Returns: React.FC<ReturnsProps> = ({ user, openForm }) => {
    const [requests, setRequests] = useState<WorkflowRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const canManageIntake = useMemo(
        () => [UserRole.Admin, UserRole.StockController, UserRole.EquipmentManager].includes(user.role),
        [user.role]
    );

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let query = supabase
                .from('en_workflows_view')
                .select('*')
                .eq('currentStatus', WorkflowStatus.REJECTED_AT_DELIVERY);

            if (user.role !== UserRole.Admin && user.departments && user.departments.length > 0) {
                query = query.in('department', user.departments);
            }

            const { data, error } = await query.order('createdAt', { ascending: true });

            if (error) throw error;
            setRequests((data as unknown as WorkflowRequest[]) || []);
        } catch (err) {
            setError('Failed to fetch returns.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-zinc-900">Rejected Returns</h1>
                <p className="text-zinc-500 mt-1">{requests.length} rejected deliveries require processing.</p>
            </div>
            
            {loading && <p className="text-zinc-500">Loading returns...</p>}
            {error && <p className="text-red-600">{error}</p>}
            
            {!loading && !error && requests.length === 0 && (
                 <div className="text-center p-12 bg-white rounded-lg border border-zinc-200">
                    <h2 className="text-xl font-semibold text-zinc-900">No Pending Returns</h2>
                    <p className="mt-2 text-zinc-500">There are no rejected deliveries waiting to be booked back into stock.</p>
                </div>
            )}
            
            <div className="space-y-4">
                {requests.map(req => (
                    <Card key={req.id} title={`Return for: ${req.requestNumber}`} padding="p-0">
                        <div className="p-4 border-b border-zinc-200">
                             <p className="text-sm text-zinc-700"><strong>Reason for Rejection:</strong> {req.rejectionComment || 'No comment provided.'}</p>
                             <p className="text-xs text-zinc-500 mt-1">Rejected by {req.requester} for site {req.projectCode}</p>
                        </div>
                         <div className="overflow-x-auto">
                            <table className="min-w-full bg-white text-sm">
                                <thead className="bg-zinc-50">
                                     <tr>
                                        <th className="py-2 px-4 text-left text-xs font-semibold text-zinc-500 uppercase">Part #</th>
                                        <th className="py-2 px-4 text-left text-xs font-semibold text-zinc-500 uppercase">Description</th>
                                        <th className="py-2 px-4 text-center text-xs font-semibold text-zinc-500 uppercase">Qty to Return</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200">
                                    {req.items.map(item => (
                                        <tr key={item.partNumber}>
                                            <td className="py-2 px-4 font-mono text-zinc-800">{item.partNumber}</td>
                                            <td className="py-2 px-4 text-zinc-700">{item.description}</td>
                                            <td className="py-2 px-4 text-center font-semibold text-zinc-900">{item.quantityRequested}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {canManageIntake && (
                            <div className="p-4 bg-zinc-50/50 border-t border-zinc-200 flex justify-end items-center">
                                <button
                                    onClick={() => openForm('ReturnIntake', req)}
                                    className="px-4 py-2 bg-sky-500 text-white font-semibold rounded-md hover:bg-sky-600"
                                >
                                    Book Back into Stock
                                </button>
                            </div>
                        )}
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default Returns;
