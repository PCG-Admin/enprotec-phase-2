import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { StockItem, StoreType, FormType, User, Department, departmentToStoreMap } from '../types';

interface StockManagementProps {
    openForm: (type: FormType, context?: any) => void;
    user: User;
}

const getStoreBadge = (store: StoreType) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full inline-block";
    switch(store) {
        case StoreType.OEM: return <span className={`${baseClasses} bg-sky-100 text-sky-800`}>{store}</span>
        case StoreType.Operations: return <span className={`${baseClasses} bg-indigo-100 text-indigo-800`}>{store}</span>
        case StoreType.Projects: return <span className={`${baseClasses} bg-rose-100 text-rose-800`}>{store}</span>
        case StoreType.SalvageYard: return <span className={`${baseClasses} bg-amber-100 text-amber-800`}>{store}</span>
        default: return null;
    }
}

const StockManagement: React.FC<StockManagementProps> = ({ openForm, user }) => {
    const [stock, setStock] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeStore, setActiveStore] = useState<StoreType | 'All'>('All');
    
    const fetchStock = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.from('en_stock_view').select('*');
            if (error) throw error;
            setStock((data as any) || []);
        } catch (err) {
            setError('Failed to fetch stock data.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStock();
    }, []);

    const isLowStock = (item: StockItem) => item.quantityOnHand < item.minStockLevel;
    
    const visibleStores = useMemo(() => {
        if (user.role === 'Admin' || !user.departments || user.departments.length === 0) {
            return Object.values(StoreType);
        }
        const stores = user.departments.map(dep => departmentToStoreMap[dep as Department]).filter(Boolean);
        return [...new Set(stores)]; // Remove duplicates
    }, [user]);

    const tabs: (StoreType | 'All')[] = ['All', ...visibleStores.sort()];
    
    useEffect(() => {
        // If the current active store is not in the visible tabs, reset to 'All'
        if (!tabs.includes(activeStore)) {
            setActiveStore('All');
        }
    }, [tabs, activeStore]);


    const filteredStock = useMemo(() => {
        return stock
            .filter(item => activeStore === 'All' ? visibleStores.includes(item.store) : item.store === activeStore)
            .filter(item => 
                item.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                item.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [searchTerm, activeStore, stock, visibleStores]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-2xl font-bold text-zinc-900 self-start md:self-center">Stores & Inventory</h1>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-full md:w-64 relative">
                        <input 
                            type="text" 
                            placeholder="Search in this store..." 
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
                        Receive Stock
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-zinc-200">
                <div className="border-b border-zinc-200">
                    <nav className="flex flex-wrap space-x-1 p-1.5">
                        {tabs.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveStore(tab)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                    activeStore === tab 
                                    ? 'bg-sky-500 text-white' 
                                    : 'text-zinc-600 hover:bg-zinc-100'
                                }`}
                            >
                                {tab === 'All' ? 'All Stores' : tab}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-zinc-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Part Number</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Store</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">Qty on Hand</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">Min Stock</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Location</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                             {loading && (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 px-6 text-zinc-500">Loading inventory...</td>
                                </tr>
                              )}
                              {error && (
                                 <tr>
                                    <td colSpan={8} className="text-center py-12 px-6 text-red-600">{error}</td>
                                </tr>
                              )}
                            {!loading && !error && filteredStock.map((item: StockItem) => (
                                <tr key={item.id} className={`border-b border-zinc-200 ${isLowStock(item) ? 'bg-red-50' : ''} hover:bg-zinc-50 transition-colors`}>
                                    <td className="px-6 py-4 whitespace-nowrap font-mono text-zinc-900">{item.partNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-zinc-700">{item.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{getStoreBadge(item.store)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center font-semibold text-zinc-900">{item.quantityOnHand}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-zinc-500">{item.minStockLevel}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-zinc-700">{item.location}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {isLowStock(item) ? (
                                            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Low Stock</span>
                                        ) : (
                                            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">OK</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        {item.store !== StoreType.SalvageYard && (
                                            <button 
                                                onClick={() => openForm('SalvageBooking', item)}
                                                className="text-amber-600 hover:text-amber-500 text-xs font-semibold"
                                            >
                                                Book to Salvage
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredStock.length === 0 && !loading && (
                        <div className="text-center py-12 px-6">
                            <p className="text-zinc-500">No stock items match your criteria.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StockManagement;