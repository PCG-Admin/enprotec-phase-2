import React, { useState, useEffect } from 'react';
import Card from '../Card';
import { User, WorkflowRequest, WorkflowStatus } from '../../types';
import { supabase } from '../../supabase/client';
import CommentSection from '../CommentSection';
import { sendApprovalWebhook } from '../../services/webhookService';

interface GateReleaseFormProps {
    user: User;
    workflow: WorkflowRequest | null;
    onSuccess: () => void;
    onCancel: () => void;
}

const FormRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 items-center">{children}</div>
);

const FormLabel: React.FC<{ htmlFor: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="font-medium text-zinc-700 text-sm">{children}</label>
);

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input {...props} className="md:col-span-2 p-2 bg-white border border-zinc-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-zinc-900 placeholder:text-zinc-400" />
);

const GateReleaseForm: React.FC<GateReleaseFormProps> = ({ user, workflow, onSuccess, onCancel }) => {
    const [driverName, setDriverName] = useState('');
    const [vehicleReg, setVehicleReg] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (workflow?.requester) {
            // A simple assumption that the requester might be the driver in some cases
            // Can be made more sophisticated if driver info is stored separately
        }
    }, [workflow]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!workflow) {
            setError("No associated workflow request found.");
            return;
        }

        setLoading(true);

        try {
            const newStatus = WorkflowStatus.DISPATCHED;
            const { error: updateError } = await supabase
                .from('en_workflow_requests')
                .update({ current_status: newStatus })
                .eq('id', workflow.id);

            if (updateError) throw updateError;

            await sendApprovalWebhook(
                'APPROVAL', 
                workflow, 
                newStatus, 
                user, 
                `Dispatched by ${driverName} in vehicle ${vehicleReg}.`
            );
            
            onSuccess();

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred during dispatch.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card title="New Gate Release / Dispatch Form">
            <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Section 1: Vehicle & Driver Information */}
                <fieldset className="space-y-4">
                    <legend className="text-lg font-semibold text-zinc-900 border-b border-zinc-200 pb-2 mb-4 w-full">Dispatch Information</legend>
                    <FormRow>
                        <FormLabel htmlFor="destinationSite">Destination Site / Project</FormLabel>
                        <FormInput id="destinationSite" type="text" value={workflow?.projectCode || ''} readOnly />
                    </FormRow>
                    <FormRow>
                        <FormLabel htmlFor="driverName">Driver Name</FormLabel>
                        <FormInput id="driverName" type="text" value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Enter driver's full name" required />
                    </FormRow>
                    <FormRow>
                        <FormLabel htmlFor="vehicleReg">Vehicle Registration</FormLabel>
                        <FormInput id="vehicleReg" type="text" value={vehicleReg} onChange={e => setVehicleReg(e.target.value)} placeholder="e.g., AB12 CDE" required />
                    </FormRow>
                </fieldset>

                {/* Section 2: Items Being Released */}
                 <fieldset className="space-y-4">
                    <legend className="text-lg font-semibold text-zinc-900 border-b border-zinc-200 pb-2 mb-4 w-full">Items Being Released</legend>
                    <div className="p-4 border border-zinc-200 rounded-md bg-zinc-50/50 space-y-2">
                         <FormRow>
                            <FormLabel htmlFor="workflowNumber">Internal Request #</FormLabel>
                            <FormInput id="workflowNumber" type="text" value={workflow?.requestNumber || ''} readOnly />
                        </FormRow>
                        <div className="md:col-span-3">
                            <ul className="text-sm list-disc list-inside text-zinc-700">
                                {workflow?.items.map(item => (
                                    <li key={item.partNumber}>{item.quantityRequested} x {item.description} ({item.partNumber})</li>
                                ))}
                            </ul>
                        </div>
                     </div>
                </fieldset>
                
                 {/* Section: Comments */}
                {workflow && (
                    <fieldset className="space-y-4">
                        <legend className="text-lg font-semibold text-zinc-900 border-b border-zinc-200 pb-2 mb-4 w-full">Comments & History</legend>
                        <CommentSection workflowId={workflow.id} user={user} />
                    </fieldset>
                )}


                {/* Section 3: Authorization */}
                 <fieldset className="space-y-4">
                     <legend className="text-lg font-semibold text-zinc-900 border-b border-zinc-200 pb-2 mb-4 w-full">Authorization Signatures</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                             <FormLabel htmlFor="driverSignature">Driver Signature</FormLabel>
                            <div className="mt-2 border border-zinc-300 rounded-md bg-zinc-100 h-24 flex items-center justify-center text-zinc-400 text-sm">
                                Signature Area
                            </div>
                        </div>
                         <div>
                             <FormLabel htmlFor="gateSignature">Gate/Security Signature</FormLabel>
                             <div className="mt-2 border border-zinc-300 rounded-md bg-zinc-100 h-24 flex items-center justify-center text-zinc-400 text-sm">
                                Signature Area
                             </div>
                        </div>
                    </div>
                </fieldset>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex justify-end items-center gap-3 pt-4 border-t border-zinc-200">
                    <button type="button" onClick={onCancel} className="px-6 py-2 bg-zinc-200 text-zinc-800 font-semibold rounded-md hover:bg-zinc-300 transition-colors">
                        Cancel
                    </button>
                     <button type="submit" disabled={loading || !workflow} className="px-6 py-2 bg-sky-500 text-white font-semibold rounded-md hover:bg-sky-600 disabled:bg-zinc-300 transition-colors">
                        {loading ? 'Dispatching...' : 'Dispatch Items'}
                    </button>
                </div>
            </form>
        </Card>
    );
};

export default GateReleaseForm;