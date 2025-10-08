import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabase/client';
import { StockReceipt, FormType, User, UserRole, departmentToStoreMap, Department, StoreType } from '../types';

interface StockReceiptsProps {
    openForm: (type: FormType) => void;
    user: User;
}

const StockReceipts: React.FC<StockReceiptsProps> = ({ openForm, user }) => {
    const [receipts, setReceipts] = useState<StockReceipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchReceipts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let query = supabase
                .from('en_stock_receipts_view')
                .select('*');

            if (user.role !== UserRole.Admin && user.departments && user.departments.length > 0) {
                const visibleStores = user.departments.map(dep => departmentToStoreMap[dep as Department]).filter(Boolean);
                if (visibleStores.length > 0) {
                    query = query.in('store', visibleStores);
                }
            }
            
            const { data, error } = await query.order('receivedAt', { ascending: false });
            
            if (error) throw error;
            setReceipts((data as any[]) || []);
        } catch (err) {
            setError('Failed to fetch stock receipts.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchReceipts();
    }, [fetchReceipts]);

    const filteredReceipts = useMemo(() => {
        if (!searchTerm) return receipts;
        return receipts.filter(r =>
            (r.partNumber && r.partNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (r.deliveryNotePO && r.deliveryNotePO.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (r.receivedBy && r.receivedBy.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [receipts, searchTerm]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">Stock Receipts History</h1>
                    <p className="text-zinc-500 mt-1">{filteredReceipts.length} receipt(s) found.</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-full md:w-64 relative">
                        <input 
                            type="text" 
                            placeholder="Search receipts..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-2 pl-10 bg-white border border-zinc-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-zinc-900"
                        />
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <button
                        onClick={() => openForm('StockIntake')}
                        className="flex-shrink-0 px-4 py-2 bg-sky-500 text-white font-semibold rounded-md hover:bg-sky-600 transition-colors"
                    >
                        New Receipt
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-zinc-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-zinc-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Part Number</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">Qty Received</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Received By</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Delivery Note / PO #</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Comments</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan={7} className="text-center py-12 px-6 text-zinc-500">Loading receipts...</td></tr>
                            )}
                            {error && (
                                <tr><td colSpan={7} className="text-center py-12 px-6 text-red-600">{error}</td></tr>
                            )}
                            {!loading && !error && filteredReceipts.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-12 px-6 text-zinc-500">{searchTerm ? 'No results found.' : 'No stock receipts recorded yet.'}</td></tr>
                            )}
                            {!loading && !error && filteredReceipts.map((receipt) => (
                                <tr key={receipt.id} className="border-b border-zinc-200 hover:bg-zinc-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-zinc-500">{new Date(receipt.receivedAt).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap font-mono text-zinc-900">{receipt.partNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-zinc-700">{receipt.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center font-semibold text-sky-600">{receipt.quantityReceived}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-zinc-700">{receipt.receivedBy}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-zinc-700">{receipt.deliveryNotePO}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-zinc-500 text-xs">{receipt.comments}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StockReceipts;