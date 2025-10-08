// FIX: Replaced placeholder content with a functional React component.
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { Site, SiteStatus } from '../types';

const getStatusBadge = (status: SiteStatus) => {
    const baseClasses = "px-2.5 py-1 text-xs font-semibold rounded-full";
     switch(status) {
        case SiteStatus.Active: return <span className={`${baseClasses} bg-emerald-100 text-emerald-800`}>Active</span>
        case SiteStatus.Frozen: return <span className={`${baseClasses} bg-zinc-100 text-zinc-800`}>Frozen</span>
        default: return null;
    }
}

const Sites: React.FC = () => {
    const [sites, setSites] = useState<Site[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSites = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data, error } = await supabase.from('en_sites').select('*').order('name');
                if (error) throw error;
                setSites((data as any) || []);
            } catch (err) {
                setError('Failed to fetch sites.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchSites();
    }, []);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-zinc-900">Sites</h1>
            <div className="bg-white rounded-lg border border-zinc-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-zinc-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Site Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan={2} className="text-center py-12 px-6 text-zinc-500">Loading sites...</td></tr>
                            )}
                            {error && (
                                <tr><td colSpan={2} className="text-center py-12 px-6 text-red-600">{error}</td></tr>
                            )}
                            {!loading && !error && sites.length === 0 && (
                                <tr><td colSpan={2} className="text-center py-12 px-6 text-zinc-500">No sites found.</td></tr>
                            )}
                            {!loading && !error && sites.map((site) => (
                                <tr key={site.id} className="border-b border-zinc-200 hover:bg-zinc-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-zinc-900">{site.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(site.status)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Sites;
