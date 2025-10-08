import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/client';
import { WorkflowRequest, Priority, User, UserRole } from '../types';
import WorkflowStatusIndicator from './WorkflowStatusIndicator';
import WorkflowDetailModal from './WorkflowDetailModal';

interface WorkflowListProps {
  user: User;
}

const getPriorityBadgeStyle = (priority: Priority) => {
    switch(priority) {
        case Priority.Critical: return 'bg-red-100 text-red-800 border-red-200';
        case Priority.High: return 'bg-orange-100 text-orange-800 border-orange-200';
        case Priority.Medium: return 'bg-amber-100 text-amber-800 border-amber-200';
        case Priority.Low: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        default: return 'bg-zinc-100 text-zinc-800 border-zinc-200';
    }
}

const WorkflowList: React.FC<WorkflowListProps> = ({ user }) => {
  const [workflows, setWorkflows] = useState<WorkflowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowRequest | null>(null);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('en_workflows_view').select('*');

      // Filter by department unless the user is an Admin
      if (user.role !== UserRole.Admin && user.departments && user.departments.length > 0) {
        query = query.in('department', user.departments);
      }
      
      const { data, error } = await query.order('createdAt', { ascending: false });

      if (error) throw error;
      setWorkflows((data as unknown as WorkflowRequest[]) || []);
    } catch (err) {
      setError('Failed to fetch workflows.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  return (
    <>
      <div className="bg-white rounded-lg border border-zinc-200">
        <div className="p-6 border-b border-zinc-200">
            <h2 className="text-lg font-semibold text-zinc-900">All Workflow Requests</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Request #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Requester</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                    <td colSpan={6} className="text-center py-12 px-6 text-zinc-500">Loading workflows...</td>
                </tr>
              )}
              {error && (
                 <tr>
                    <td colSpan={6} className="text-center py-12 px-6 text-red-600">{error}</td>
                </tr>
              )}
              {!loading && !error && workflows.length === 0 && (
                <tr>
                    <td colSpan={6} className="text-center py-12 px-6 text-zinc-500">No workflow requests found.</td>
                </tr>
              )}
              {!loading && !error && workflows.map((wf: WorkflowRequest) => (
                <tr key={wf.id} className="border-b border-zinc-200 hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-zinc-900">{wf.requestNumber}</div>
                    <div className="text-zinc-500">{wf.projectCode}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-zinc-700">{wf.department}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-zinc-700">{wf.requester}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getPriorityBadgeStyle(wf.priority)}`}>
                          {wf.priority}
                      </span>
                  </td>
                  <td className="px-6 py-4">
                    <WorkflowStatusIndicator steps={wf.steps} currentStep={wf.currentStatus} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button 
                      onClick={() => setSelectedWorkflow(wf)}
                      className="text-sky-600 hover:text-sky-500 font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selectedWorkflow && (
        <WorkflowDetailModal 
          user={user}
          workflow={selectedWorkflow} 
          onClose={() => setSelectedWorkflow(null)} 
          onUpdate={() => {
            setSelectedWorkflow(null);
            fetchWorkflows();
          }}
        />
      )}
    </>
  );
};

export default WorkflowList;