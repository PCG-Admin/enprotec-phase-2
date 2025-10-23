import React, { useState, useCallback } from 'react';
import Card from './Card';
import { generateReportSummary } from '../services/geminiService';
import { supabase } from '../supabase/client';
import { WorkflowRequest, StockItem, User, UserRole, departmentToStoreMap, Store } from '../types';

interface ReportsProps {
    user: User;
}

const Reports: React.FC<ReportsProps> = ({ user }) => {
  const [summary, setSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleGenerateSummary = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setSummary('');
    try {
      const isAdmin = user.role === UserRole.Admin;
      const userStores = user.departments || [];
      
      let workflowsQuery = supabase.from('en_workflows_view').select('*');
      if (!isAdmin && userStores.length > 0) {
        workflowsQuery = workflowsQuery.in('department', userStores);
      }

      const visibleStores = userStores.map(dep => departmentToStoreMap[dep as Store]).filter(Boolean);
      let stockQuery = supabase.from('en_stock_view').select('*');
      if (!isAdmin && visibleStores.length > 0) {
        stockQuery = stockQuery.in('store', visibleStores);
      }
      
      const [workflowsRes, stockRes] = await Promise.all([
        workflowsQuery,
        stockQuery,
      ]);

      if (workflowsRes.error) throw new Error('Failed to fetch workflow data for report.');
      if (stockRes.error) throw new Error('Failed to fetch stock data for report.');

      const result = await generateReportSummary(
        (workflowsRes.data as unknown as WorkflowRequest[]) || [],
        (stockRes.data as unknown as StockItem[]) || []
      );
      setSummary(result);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return (
    <div className="space-y-6">
      <Card title="Reporting & Analytics">
        <p className="text-zinc-400">
          Generate reports and gain insights into your operational efficiency, stock levels, and procurement costs.
        </p>
      </Card>

      <Card title="AI-Powered Operational Summary">
        <div className="space-y-4">
            <p className="text-zinc-400">
                Click the button below to use Gemini AI to generate a real-time summary of your current operations based on active workflows and stock levels in your departments.
            </p>
            <button
                onClick={handleGenerateSummary}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-sky-500 text-white font-semibold rounded-md hover:bg-sky-400 disabled:bg-zinc-600 disabled:text-zinc-400 disabled:cursor-not-allowed transition-colors"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                    </>
                ) : (
                    'Generate AI Summary'
                )}
            </button>
            {error && <div className="p-4 bg-red-900/50 text-red-300 border border-red-800 rounded-md">{error}</div>}
            {summary && (
                <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-md">
                    <h4 className="font-bold text-zinc-100 mb-2">Summary:</h4>
                    <div className="prose prose-sm max-w-none text-zinc-300 whitespace-pre-wrap">{summary}</div>
                </div>
            )}
        </div>
      </Card>
    </div>
  );
};

export default Reports;