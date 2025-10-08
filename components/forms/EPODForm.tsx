import React, { useState } from 'react';
import Card from '../Card';
import { User, WorkflowRequest, WorkflowStatus } from '../../types';
import { supabase } from '../../supabase/client';
import { sendApprovalWebhook } from '../../services/webhookService';

interface EPODFormProps {
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

const EPODForm: React.FC<EPODFormProps> = ({ user, workflow, onSuccess, onCancel }) => {
    const [recipientName, setRecipientName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!workflow) {
            setError("No associated workflow request found.");
            return;
        }

        setLoading(true);

        try {
            const newStatus = WorkflowStatus.EPOD_CONFIRMED;
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
                `Delivery confirmed by recipient: ${recipientName}.`
            );
            
            onSuccess();

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred during confirmation.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card title="Electronic Proof of Delivery (EPOD)">
            <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Section 1: Delivery Information */}
                <fieldset className="space-y-4">
                    <legend className="text-lg font-semibold text-zinc-900 border-b border-zinc-200 pb-2 mb-4 w-full">Delivery Confirmation</legend>
                    <FormRow>
                        <FormLabel htmlFor="workflowNumber">Internal Request #</FormLabel>
                        <FormInput id="workflowNumber" type="text" value={workflow?.requestNumber || ''} readOnly />
                    </FormRow>
                    <div className="md:col-span-3">
                        <p className="text-sm font-medium text-zinc-700">Items Delivered:</p>
                        <ul className="text-sm list-disc list-inside text-zinc-600">
                            {workflow?.items.map(item => (
                                <li key={item.partNumber}>{item.quantityRequested} x {item.description} ({item.partNumber})</li>
                            ))}
                        </ul>
                    </div>
                </fieldset>

                {/* Section 2: Condition Assessment */}
                 <fieldset className="space-y-4">
                    <legend className="text-lg font-semibold text-zinc-900 border-b border-zinc-200 pb-2 mb-4 w-full">Condition Assessment</legend>
                    <FormRow>
                        <FormLabel htmlFor="condition">Items Condition</FormLabel>
                        <div className="md:col-span-2 flex items-center space-x-6">
                            <label className="flex items-center">
                                <input type="radio" name="condition" value="good" className="h-4 w-4 text-sky-600 bg-zinc-100 border-zinc-300 focus:ring-sky-500" defaultChecked />
                                <span className="ml-2 text-zinc-800">All Good</span>
                            </label>
                             <label className="flex items-center">
                                <input type="radio" name="condition" value="damaged" className="h-4 w-4 text-sky-600 bg-zinc-100 border-zinc-300 focus:ring-sky-500" />
                                <span className="ml-2 text-zinc-800">Damaged / Discrepancy</span>
                            </label>
                        </div>
                    </FormRow>
                </fieldset>

                {/* Section 3: Recipient Confirmation */}
                 <fieldset className="space-y-4">
                     <legend className="text-lg font-semibold text-zinc-900 border-b border-zinc-200 pb-2 mb-4 w-full">Recipient Confirmation</legend>
                    <FormRow>
                        <FormLabel htmlFor="recipientName">Recipient Name</FormLabel>
                        <FormInput id="recipientName" type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Enter full name of recipient" required />
                    </FormRow>
                    <FormRow>
                        <FormLabel htmlFor="deliveryPhoto">Attach Proof Photo</FormLabel>
                        <FormInput id="deliveryPhoto" type="file" className="md:col-span-2 file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200"/>
                    </FormRow>
                     <div>
                         <FormLabel htmlFor="recipientSignature">Recipient Signature</FormLabel>
                        <div className="mt-2 border border-zinc-300 rounded-md bg-zinc-100 h-24 flex items-center justify-center text-zinc-400 text-sm">
                            Signature Area
                        </div>
                    </div>
                </fieldset>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex justify-end items-center gap-3 pt-4 border-t border-zinc-200">
                    <button type="button" onClick={onCancel} className="px-6 py-2 bg-zinc-200 text-zinc-800 font-semibold rounded-md hover:bg-zinc-300 transition-colors">
                        Cancel
                    </button>
                     <button type="submit" disabled={loading || !workflow} className="px-6 py-2 bg-sky-500 text-white font-semibold rounded-md hover:bg-sky-600 disabled:bg-zinc-300 transition-colors">
                        {loading ? 'Confirming...' : 'Confirm Delivery'}
                    </button>
                </div>
            </form>
        </Card>
    );
};

export default EPODForm;