import { User, WorkflowRequest, WorkflowStatus, SalvageRequest, UserRole } from '../types';
import { supabase } from '../supabase/client';

const WEBHOOK_URL = 'https://hook.eu2.make.com/auxwo8ivmlye45wqwguiwthp78mwpiyc';

export type WebhookActionType = 'APPROVAL' | 'DECLINE' | 'REJECTION' | 'ACCEPTANCE' | 'SALVAGE_DECISION';

type ApproverFieldKey = `approver${number}`;

type WebhookPayload = {
    actionType: WebhookActionType;
    requestNumber: string;
    previousStatus: WorkflowStatus;
    newStatus: WorkflowStatus;
    actor: {
        name: string;
        email: string;
        role: string;
    };
    comment?: string | null;
    timestamp: string;
    workflowId: string;
} & Partial<Record<ApproverFieldKey, string>>;

/**
 * Determines the email addresses of the next users in the workflow based on the new status.
 * @param newStatus The status the workflow is transitioning TO.
 * @param request The workflow request object, must contain requester_id.
 * @returns A promise that resolves to an array of email addresses.
 */
async function getNextApproverEmails(
    newStatus: WorkflowStatus,
    request: Pick<WorkflowRequest, 'requester_id'>
): Promise<string[]> {
    let targetRoles: UserRole[] = [];
    let targetUserId: string | null = null;

    switch (newStatus) {
        case WorkflowStatus.REQUEST_SUBMITTED:
            targetRoles = [UserRole.StockController, UserRole.OperationsManager, UserRole.Admin];
            break;
        case WorkflowStatus.AWAITING_EQUIP_MANAGER:
            targetRoles = [UserRole.EquipmentManager, UserRole.OperationsManager, UserRole.Admin];
            break;
        case WorkflowStatus.AWAITING_PICKING:
            targetRoles = [UserRole.StockController, UserRole.OperationsManager, UserRole.Admin];
            break;
        case WorkflowStatus.PICKED_AND_LOADED:
            targetRoles = [UserRole.Driver, UserRole.Security];
            break;
        case WorkflowStatus.DISPATCHED:
        case WorkflowStatus.EPOD_CONFIRMED:
            targetUserId = request.requester_id;
            break;
        case WorkflowStatus.REQUEST_DECLINED:
             targetUserId = request.requester_id;
            break;
        case WorkflowStatus.REJECTED_AT_DELIVERY:
            targetRoles = [UserRole.StockController, UserRole.OperationsManager, UserRole.Admin];
            break;
        case WorkflowStatus.COMPLETED:
            return [];
        default:
            return [];
    }

    if (targetUserId) {
        const { data, error } = await supabase
            .from('en_users')
            .select('email')
            .eq('id', targetUserId)
            .eq('status', 'Active')
            .single();
            
        if (error || !data) {
            console.error(`Webhook: Could not find active user with ID ${targetUserId}`, error);
            return [];
        }
        return [data.email];
    }

    if (targetRoles.length > 0) {
        const { data, error } = await supabase
            .from('en_users')
            .select('email')
            .in('role', targetRoles)
            .eq('status', 'Active');
            
        if (error || !data) {
            console.error(`Webhook: Could not find active users for roles ${targetRoles.join(', ')}`, error);
            return [];
        }
        return data.map(user => user.email);
    }
    
    return [];
}


/**
 * Determines the email addresses for the next approvers in the salvage workflow.
 * @param newStatus The status the salvage request is transitioning TO.
 * @returns A promise that resolves to an array of email addresses.
 */
async function getNextApproverEmailsForSalvage(newStatus: WorkflowStatus): Promise<string[]> {
    let targetRoles: UserRole[] = [];

    switch (newStatus) {
        case WorkflowStatus.SALVAGE_TO_BE_REPAIRED:
        case WorkflowStatus.SALVAGE_TO_BE_SCRAPPED:
            targetRoles = [UserRole.EquipmentManager, UserRole.OperationsManager, UserRole.Admin];
            break;
        case WorkflowStatus.SALVAGE_REPAIR_CONFIRMED:
        case WorkflowStatus.SALVAGE_SCRAP_CONFIRMED:
            targetRoles = [UserRole.StockController, UserRole.OperationsManager, UserRole.Admin];
            break;
        default:
            return [];
    }
    
    if (targetRoles.length > 0) {
        const { data, error } = await supabase
            .from('en_users')
            .select('email')
            .in('role', targetRoles)
            .eq('status', 'Active');
        if (error || !data) {
            console.error('Error fetching salvage user emails by role for webhook:', error);
            return [];
        }
        return data.map(user => user.email);
    }
    
    return [];
}


// A helper function to check if the object is a WorkflowRequest
function isWorkflowRequest(req: any): req is Pick<WorkflowRequest, 'id' | 'requestNumber' | 'currentStatus' | 'requester_id'> {
    return 'requestNumber' in req && 'currentStatus' in req && 'requester_id' in req;
}

export const sendApprovalWebhook = async (
    actionType: WebhookActionType,
    request: Pick<WorkflowRequest, 'id' | 'requestNumber' | 'currentStatus' | 'requester_id'> | SalvageRequest,
    newStatus: WorkflowStatus,
    user: User,
    comment?: string | null
): Promise<void> => {
    
    let nextApprovers: string[] = [];
    if (isWorkflowRequest(request)) {
        nextApprovers = await getNextApproverEmails(newStatus, request);
    } else {
        nextApprovers = await getNextApproverEmailsForSalvage(newStatus);
    }

    const basePayload = {
        actionType,
        requestNumber: isWorkflowRequest(request) ? request.requestNumber : `SALVAGE-${request.partNumber}`,
        previousStatus: isWorkflowRequest(request) ? request.currentStatus : request.status,
        newStatus,
        actor: {
            name: user.name,
            email: user.email,
            role: user.role,
        },
        comment: comment,
        timestamp: new Date().toISOString(),
        workflowId: request.id,
    };

    const approverFields = nextApprovers.reduce<Partial<Record<ApproverFieldKey, string>>>((fields, email, index) => {
        if (email) {
            fields[`approver${index + 1}` as ApproverFieldKey] = email;
        }
        return fields;
    }, {});

    const payload: WebhookPayload = {
        ...basePayload,
        ...approverFields,
    };

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Webhook failed with status ${response.status}: ${errorText}`);
        } else {
            console.log(`Webhook for ${actionType} on ${payload.requestNumber} sent successfully.`);
        }
    } catch (error) {
        console.error('Error sending webhook notification:', error);
    }
};
