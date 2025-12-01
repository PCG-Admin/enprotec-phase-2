import { WorkflowStatus } from '../types';

export interface NextStepInfo {
  title: string;
  actor: string;
}

const NEXT_STEP_MAP: Partial<Record<WorkflowStatus, NextStepInfo>> = {
  [WorkflowStatus.REQUEST_SUBMITTED]: {
    title: 'Stock Control Review',
    actor: 'Stock Controller',
  },
  [WorkflowStatus.AWAITING_EQUIP_MANAGER]: {
    title: 'Equipment Manager Approval',
    actor: 'Equipment Manager',
  },
  [WorkflowStatus.AWAITING_PICKING]: {
    title: 'Picking & Loading',
    actor: 'Stores Team',
  },
  [WorkflowStatus.PICKED_AND_LOADED]: {
    title: 'Gate Release & Dispatch',
    actor: 'Security / Driver',
  },
  [WorkflowStatus.DISPATCHED]: {
    title: 'Delivery Confirmation (EPOD)',
    actor: 'Driver / Site',
  },
  [WorkflowStatus.EPOD_CONFIRMED]: {
    title: 'Requester Acceptance',
    actor: 'Requester',
  },
  [WorkflowStatus.REJECTED_AT_DELIVERY]: {
    title: 'Return to Stock',
    actor: 'Stock Controller',
  },
  [WorkflowStatus.REQUEST_DECLINED]: {
    title: 'Request Closed',
    actor: 'N/A',
  },
  [WorkflowStatus.COMPLETED]: {
    title: 'Completed',
    actor: 'N/A',
  },
};

export const getNextStepInfo = (status: WorkflowStatus): NextStepInfo | null =>
  NEXT_STEP_MAP[status] ?? null;
