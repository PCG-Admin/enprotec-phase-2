import { User, WorkflowRequest, WorkflowStatus, SalvageRequest, UserRole } from '../types';
import { supabase } from '../supabase/client';

const WEBHOOK_URL = 'https://hook.eu2.make.com/auxwo8ivmlye45wqwguiwthp78mwpiyc';
const DENIAL_WEBHOOK_URL = 'https://hook.eu2.make.com/gew2qe8azxbg884131aa8ynd8gcycrmj';

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

type DenialWebhookPayload = {
    requesterName: string;
    requesterEmail: string;
    subject: string;
    body: string;
};

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
            targetRoles = [UserRole.StockController, UserRole.Storeman, UserRole.OperationsManager, UserRole.Admin];
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

export const sendDenialWebhook = async (request: WorkflowRequest, comment: string | null): Promise<void> => {
    try {
        const { data: requester, error } = await supabase
            .from('en_users')
            .select('email, name')
            .eq('id', request.requester_id)
            .single();

        if (error || !requester?.email || !requester?.name) {
            console.error('Denial webhook: could not load requester email/name', error);
            return;
        }

        const subject = `${request.requestNumber} Denied`;
        const safeComment = comment && comment.trim().length > 0 ? comment.trim() : 'No additional comments were provided.';
        const body = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7fb;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.08);">
            <tr>
              <td style="background:#0f172a;color:#ffffff;padding:20px 24px;font-size:20px;font-weight:700;">
                ${subject}
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 12px 0;color:#0f172a;font-size:16px;">Hi ${requester.name},</p>
                <p style="margin:0 0 16px 0;color:#334155;font-size:14px;line-height:1.6;">
                  Your request <strong>${request.requestNumber}</strong> for <strong>${request.projectCode}</strong> has been <span style="color:#dc2626;font-weight:700;">denied</span>.
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px 0;">
                  <tr>
                    <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                      <p style="margin:0 0 8px 0;color:#0f172a;font-size:14px;font-weight:700;">Comments</p>
                      <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">${safeComment}</p>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px 0;color:#0f172a;font-size:14px;font-weight:700;">Summary</p>
                <ul style="margin:0 0 16px 18px;color:#475569;font-size:14px;line-height:1.6;padding:0;">
                  <li><strong>Request #:</strong> ${request.requestNumber}</li>
                  <li><strong>Site/Project:</strong> ${request.projectCode || 'N/A'}</li>
                  <li><strong>Department/Store:</strong> ${request.department}</li>
                  <li><strong>Priority:</strong> ${request.priority}</li>
                  <li><strong>Status:</strong> Denied</li>
                </ul>
                <p style="margin:0;color:#94a3b8;font-size:12px;">This is an automated notification.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();

        const payload: DenialWebhookPayload = {
            requesterName: requester.name,
            requesterEmail: requester.email,
            subject,
            body,
        };

        const response = await fetch(DENIAL_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error(`Denial webhook failed with status ${response.status}`);
        }
    } catch (err) {
        console.error('Error sending denial webhook:', err);
    }
};
