import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabase/client';
import { WorkflowRequest, User, WorkflowStatus } from '../types';
import Card from './Card';
import { sendApprovalWebhook } from '../services/webhookService';

const getAttachments = (req: WorkflowRequest) => {
    if (req.attachments && req.attachments.length > 0) {
        return req.attachments;
    }
    return req.attachmentUrl ? [{ id: 'legacy-attachment', url: req.attachmentUrl, fileName: 'Attachment' }] : [];
};

interface MyDeliveriesProps {
    user: User;
    onDataChange: () => void;
    dataVersion: number;
}

const MyDeliveries: React.FC<MyDeliveriesProps> = ({ user, onDataChange, dataVersion }) => {
    const [requests, setRequests] = useState<WorkflowRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [rejectionComment, setRejectionComment] = useState('');
    const [rejectingId, setRejectingId] = useState<string | null>(null);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('en_workflows_view')
                .select('*')
                .eq('currentStatus', WorkflowStatus.EPOD_CONFIRMED)
                .eq('requester_id', user.id) // Filter for the logged-in user's requests
                .order('createdAt', { ascending: true });

            if (error) throw error;
            setRequests((data as unknown as WorkflowRequest[]) || []);
        } catch (err) {
            setError('Failed to fetch your deliveries.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests, dataVersion]);

    const handleAccept = async (requestId: string) => {
        setUpdatingId(requestId);
        const requestToUpdate = requests.find(r => r.id === requestId);
        if (!requestToUpdate) {
            console.error("Could not find request to accept.");
            setUpdatingId(null);
            return;
        }

        try {
            const newStatus = WorkflowStatus.COMPLETED;
            const { error } = await supabase
                .from('en_workflow_requests')
                .update({ current_status: newStatus })
                .eq('id', requestId);
            
            if (error) throw error;

            await sendApprovalWebhook('ACCEPTANCE', requestToUpdate, newStatus, user);

            setRequests(prev => prev.filter(req => req.id !== requestId));
            onDataChange();
        } catch (err) {
            alert('Failed to accept delivery.');
            console.error(err);
        } finally {
            setUpdatingId(null);
        }
    };
    
    const handleReject = async (requestId: string) => {
        if (!rejectionComment.trim()) {
            alert("Please provide a reason for rejection.");
            return;
        }
        setUpdatingId(requestId);
        const requestToUpdate = requests.find(r => r.id === requestId);
        if (!requestToUpdate) {
            console.error("Could not find request to reject.");
            setUpdatingId(null);
            return;
        }

        try {
            const newStatus = WorkflowStatus.REJECTED_AT_DELIVERY;
            const { error } = await supabase
                .from('en_workflow_requests')
                .update({ 
                    current_status: newStatus,
                    rejection_comment: rejectionComment.trim()
                })
                .eq('id', requestId);
            
            if (error) throw error;
            
            await sendApprovalWebhook('REJECTION', requestToUpdate, newStatus, user, rejectionComment.trim());
            
            setRequests(prev => prev.filter(req => req.id !== requestId));
            onDataChange();
            setRejectingId(null);
            setRejectionComment('');
        } catch (err) {
            alert('Failed to reject delivery.');
            console.error(err);
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-zinc-900">My Deliveries</h1>
                <p className="text-zinc-500 mt-1">{requests.length} deliveries awaiting your confirmation.</p>
            </div>
            
            {loading && <p className="text-zinc-500">Loading your deliveries...</p>}
            {error && <p className="text-red-600">{error}</p>}
            
            {!loading && !error && requests.length === 0 && (
                 <div className="text-center p-12 bg-white rounded-lg border border-zinc-200">
                    <h2 className="text-xl font-semibold text-zinc-900">No Pending Deliveries</h2>
                    <p className="mt-2 text-zinc-500">You have no deliveries that require your acceptance at this time.</p>
                </div>
            )}
            
            <div className="space-y-4">
                {requests.map(req => {
                    const attachments = getAttachments(req);
                    return (
                    // FIX: Added a `title` prop to the `Card` component to satisfy its required props. An empty string is used to prevent the card's default header from rendering, as this component uses a custom header as a child.
                    <Card key={req.id} title="" padding="p-0">
                         <div className="flex justify-between items-start p-4 border-b border-zinc-200">
                            <div className="flex-grow">
                                <h3 className="font-bold text-lg text-zinc-900">{req.requestNumber}</h3>
                                <p className="text-sm text-zinc-700 mt-1">Project: {req.projectCode}</p>
                                <p className="text-sm text-zinc-500 mt-2">Items from this request have been delivered. Please inspect the items and confirm receipt.</p>
                            </div>
                            {attachments.length > 0 && (
                                <div className="ml-4 flex-shrink-0 flex flex-wrap gap-2 justify-end">
                                    {attachments.map(att => (
                                        <a
                                            key={att.id}
                                            href={att.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-shrink-0"
                                            title={att.fileName || 'View attachment'}
                                        >
                                            <img
                                                src={att.url}
                                                alt={att.fileName || 'Attachment'}
                                                className="h-20 w-20 rounded-md object-cover border border-zinc-200 hover:ring-2 hover:ring-sky-500 transition-all"
                                            />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                         <div className="overflow-x-auto">
                            <table className="min-w-full bg-white text-sm">
                                <thead className="bg-zinc-50">
                                     <tr>
                                        <th className="py-2 px-4 text-left text-xs font-semibold text-zinc-500 uppercase">Part #</th>
                                        <th className="py-2 px-4 text-left text-xs font-semibold text-zinc-500 uppercase">Description</th>
                                        <th className="py-2 px-4 text-center text-xs font-semibold text-zinc-500 uppercase">Qty Delivered</th>
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
                        
                        {rejectingId === req.id && (
                            <div className="p-4 border-t border-zinc-200 bg-zinc-50">
                                <label htmlFor="rejectionComment" className="block text-sm font-medium text-zinc-700 mb-2">Reason for Rejection (Required)</label>
                                <textarea
                                    id="rejectionComment"
                                    value={rejectionComment}
                                    onChange={(e) => setRejectionComment(e.target.value)}
                                    rows={3}
                                    className="w-full p-2 bg-white border border-zinc-300 rounded-md focus:ring-2 focus:ring-sky-500"
                                    placeholder="e.g., Incorrect part delivered, item is damaged..."
                                />
                                <div className="flex justify-end gap-2 mt-2">
                                    <button onClick={() => setRejectingId(null)} className="px-3 py-1 text-sm bg-zinc-200 rounded hover:bg-zinc-300">Cancel</button>
                                    <button onClick={() => handleReject(req.id)} className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">Submit Rejection</button>
                                </div>
                            </div>
                        )}

                        <div className="p-4 bg-zinc-50/50 border-t border-zinc-200 flex justify-end items-center gap-3">
                            <button
                                onClick={() => setRejectingId(req.id)}
                                disabled={updatingId === req.id || rejectingId === req.id}
                                className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 disabled:bg-zinc-300 transition-colors"
                            >
                                Reject
                            </button>
                            <button
                                onClick={() => handleAccept(req.id)}
                                disabled={updatingId === req.id || rejectingId === req.id}
                                className="px-4 py-2 bg-emerald-500 text-white font-semibold rounded-md hover:bg-emerald-600 disabled:bg-zinc-300 transition-colors"
                            >
                                {updatingId === req.id ? 'Accepting...' : 'Accept Delivery'}
                            </button>
                        </div>
                    </Card>
                )})}
            </div>
        </div>
    );
};

export default MyDeliveries;
