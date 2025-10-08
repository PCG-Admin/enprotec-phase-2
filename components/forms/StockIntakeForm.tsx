import React, { useState, useEffect, useMemo } from 'react';
import Card from '../Card';
import { StoreType, User, WorkflowRequest, UserRole, Department, departmentToStoreMap } from '../../types';
import { supabase } from '../../supabase/client';
import { Database } from '../../supabase/database.types';
import Select from 'react-select';

type StockItemRow = Database['public']['Tables']['en_stock_items']['Row'];
type InventoryRow = Database['public']['Tables']['en_inventory']['Row'];


interface StockIntakeFormProps {
    user: User;
    onSuccess: () => void;
    onCancel: () => void;
    returnWorkflow?: WorkflowRequest | null;
}

type IntakeType = 'existing' | 'new' | 'return';

const customSelectStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: '#ffffff', // white
    borderColor: state.isFocused ? '#0ea5e9' : '#d4d4d8', // sky-500, zinc-300
    boxShadow: state.isFocused ? '0 0 0 1px #0ea5e9' : 'none',
    '&:hover': {
      borderColor: '#a1a1aa', // zinc-400
    },
  }),
  menu: (provided: any) => ({
    ...provided,
    backgroundColor: '#ffffff', // white
    border: '1px solid #e4e4e7', // zinc-200
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? '#0ea5e9' // sky-500
      : state.isFocused
      ? '#f4f4f5' // zinc-100
      : '#ffffff', // white
    color: state.isSelected ? '#ffffff' : '#18181b', // white, zinc-900
    '&:active': {
      backgroundColor: '#0284c7', // sky-600
    },
  }),
  singleValue: (provided: any) => ({
    ...provided,
    color: '#18181b', // zinc-900
  }),
  input: (provided: any) => ({
    ...provided,
    color: '#18181b', // zinc-900
  }),
  placeholder: (provided: any) => ({
    ...provided,
    color: '#71717a', // zinc-500
  }),
};

const FormRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 items-center">{children}</div>
);

const FormLabel: React.FC<{ htmlFor: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="font-medium text-zinc-700 text-sm">{children}</label>
);

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input {...props} className="md:col-span-2 p-2 bg-white border border-zinc-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-zinc-900 placeholder:text-zinc-400 disabled:bg-zinc-100" />
);

const FormSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select {...props} className="md:col-span-2 p-2 bg-white border border-zinc-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-zinc-900 disabled:bg-zinc-100" />
);

const FormTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
    <textarea {...props} className="md:col-span-2 p-2 bg-white border border-zinc-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-zinc-900 placeholder:text-zinc-400 disabled:bg-zinc-100" />
);

const StockIntakeForm: React.FC<StockIntakeFormProps> = ({ user, onSuccess, onCancel, returnWorkflow }) => {
    const [intakeType, setIntakeType] = useState<IntakeType>(returnWorkflow ? 'return' : 'existing');
    
    const [availableStockItems, setAvailableStockItems] = useState<StockItemRow[]>([]);
    const [stockOptions, setStockOptions] = useState<{value: string, label: string}[]>([]);
    const [stockLoading, setStockLoading] = useState(true);

    const [selectedStockItemId, setSelectedStockItemId] = useState('');
    const [partNumber, setPartNumber] = useState('');
    const [description, setDescription] = useState('');
    const [minStockLevel, setMinStockLevel] = useState('0');

    const [quantity, setQuantity] = useState('');
    const [store, setStore] = useState<StoreType | ''>(returnWorkflow ? StoreType.Operations : '');
    const [location, setLocation] = useState('');
    const [deliveryNotePO, setDeliveryNotePO] = useState('');
    const [comments, setComments] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const visibleStores = useMemo(() => {
        if (user.role === UserRole.Admin || !user.departments || user.departments.length === 0) {
            return Object.values(StoreType);
        }
        return user.departments.map(dep => departmentToStoreMap[dep as Department]).filter(Boolean);
    }, [user]);

    useEffect(() => {
        if (visibleStores.length === 1 && !isReturnMode) {
            setStore(visibleStores[0]);
        }
    }, [visibleStores]);

    useEffect(() => {
        const fetchStockItems = async () => {
            setStockLoading(true);
            const { data, error } = await supabase.from('en_stock_items').select('*').order('part_number');
            if (error) {
                console.error("Failed to fetch stock items", error);
                setError("Could not load existing stock items.");
            } else {
                const stockData = data || [];
                setAvailableStockItems(stockData);
                const options = stockData.map(item => ({
                    value: item.id,
                    label: `${item.part_number} - ${item.description}`
                }));
                setStockOptions(options);

                if(returnWorkflow) {
                    const firstItem = returnWorkflow.items[0];
                    if(firstItem) {
                        const returnedStockItem = stockData.find(s => s.part_number === firstItem.partNumber);
                        if(returnedStockItem) {
                             setSelectedStockItemId(returnedStockItem.id);
                             setQuantity(String(returnWorkflow.items.reduce((sum, item) => sum + item.quantityRequested, 0)));
                             setDeliveryNotePO(`RETURN from ${returnWorkflow.requestNumber}`);
                             setComments(`Rejected by ${returnWorkflow.requester}: ${returnWorkflow.rejectionComment}`);
                             setLocation('Awaiting placement');
                        }
                    }
                }
            }
            setStockLoading(false);
        };
        fetchStockItems();
    }, [returnWorkflow]);

    useEffect(() => {
        if (intakeType === 'existing' || intakeType === 'return') {
            const selectedItem = availableStockItems.find(item => item.id === selectedStockItemId);
            if (selectedItem) {
                setPartNumber(selectedItem.part_number);
                setDescription(selectedItem.description || '');
                setMinStockLevel(String(selectedItem.min_stock_level));
            }
        } else if (intakeType === 'new') {
            setSelectedStockItemId('');
            setPartNumber('');
            setDescription('');
            setMinStockLevel('0');
        }
    }, [intakeType, selectedStockItemId, availableStockItems]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!store) {
            setError("Please select a store.");
            return;
        }
        setLoading(true);
        setError('');

        try {
            let stockItemId: string;

            if (intakeType === 'existing' || intakeType === 'return') {
                if (!selectedStockItemId) throw new Error("Please select an existing part.");
                stockItemId = selectedStockItemId;
            } else { // New part
                const { data: existingPart, error: fetchError } = await supabase
                    .from('en_stock_items')
                    .select('id')
                    .eq('part_number', partNumber)
                    .single();

                if (existingPart) throw new Error(`Part number "${partNumber}" already exists in the system. Use the 'Existing Part' option instead.`);
                if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

                const { data: newStockItem, error: insertError } = await supabase
                    .from('en_stock_items')
                    .insert({ 
                        part_number: partNumber, 
                        description: description,
                        min_stock_level: parseInt(minStockLevel, 10),
                    })
                    .select('id')
                    .single();

                if (insertError) throw insertError;
                if (!newStockItem) throw new Error("Could not create new stock item.");
                stockItemId = newStockItem.id;
            }

            const quantityReceived = parseInt(quantity, 10);
            
            const { error: receiptError } = await supabase.from('en_stock_receipts').insert({
                stock_item_id: stockItemId,
                quantity_received: quantityReceived,
                received_by_id: user.id,
                delivery_note_po: deliveryNotePO,
                comments: comments,
                store: store,
            });
            if (receiptError) throw receiptError;

            const { data: inventoryItem, error: inventoryFetchError } = await supabase
                .from('en_inventory')
                .select('id, quantity_on_hand')
                .eq('stock_item_id', stockItemId)
                .eq('store', store)
                .single();

            if (inventoryFetchError && inventoryFetchError.code !== 'PGRST116') {
                throw inventoryFetchError;
            }

            if (inventoryItem) {
                const newQuantity = (inventoryItem as InventoryRow).quantity_on_hand + quantityReceived;
                const { error: updateError } = await supabase
                    .from('en_inventory')
                    .update({ quantity_on_hand: newQuantity, location: location })
                    .eq('id', (inventoryItem as InventoryRow).id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('en_inventory')
                    .insert({
                        stock_item_id: stockItemId,
                        store,
                        quantity_on_hand: quantityReceived,
                        location,
                    });
                if (insertError) throw insertError;
            }

            onSuccess();

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    
    const isReturnMode = intakeType === 'return';
    
    const renderPartFields = () => {
        if (intakeType === 'existing' || isReturnMode) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 items-center">
                    <FormLabel htmlFor="partNumberSelect">Part</FormLabel>
                    <div className="md:col-span-2">
                        <Select
                            id="partNumberSelect"
                            options={stockOptions}
                            value={stockOptions.find(opt => opt.value === selectedStockItemId) || null}
                            onChange={(selectedOption) => setSelectedStockItemId(selectedOption ? selectedOption.value : '')}
                            isLoading={stockLoading}
                            isDisabled={stockLoading || isReturnMode}
                            placeholder={stockLoading ? 'Loading stock...' : 'Select or search for a part...'}
                            styles={customSelectStyles}
                            required
                        />
                    </div>
                </div>
            );
        }

        // New Part Fields
        return (
            <>
                <FormRow>
                    <FormLabel htmlFor="partNumber">Part Number</FormLabel>
                    <FormInput id="partNumber" type="text" value={partNumber} onChange={e => setPartNumber(e.target.value)} placeholder="e.g., OEM-5566" required />
                </FormRow>
                 <FormRow>
                    <FormLabel htmlFor="description">Description</FormLabel>
                    <FormInput id="description" type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Secondary Gearbox Assembly" required />
                </FormRow>
                <FormRow>
                    <FormLabel htmlFor="minStockLevel">Minimum Stock Level</FormLabel>
                    <FormInput id="minStockLevel" type="number" min="0" value={minStockLevel} onChange={e => setMinStockLevel(e.target.value)} placeholder="Default: 0" required />
                </FormRow>
            </>
        );
    };

    return (
        <Card title={isReturnMode ? "Book Return into Stock" : "Receive New Stock / Stock Intake"}>
            <form className="space-y-6" onSubmit={handleSubmit}>
                <fieldset className="space-y-4">
                    <legend className="text-lg font-semibold text-zinc-900 border-b border-zinc-200 pb-2 mb-4 w-full">Receipt Details</legend>
                    {!isReturnMode && (
                        <FormRow>
                            <FormLabel htmlFor="intakeType">Intake Type</FormLabel>
                             <div className="md:col-span-2 flex items-center space-x-4 p-1 bg-zinc-200 rounded-md">
                                <button
                                    type="button"
                                    onClick={() => setIntakeType('existing')}
                                    className={`flex-1 py-1.5 text-sm font-semibold rounded ${intakeType === 'existing' ? 'bg-sky-500 text-white' : 'text-zinc-700 hover:bg-zinc-300'}`}
                                >
                                    Existing Part
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIntakeType('new')}
                                    className={`flex-1 py-1.5 text-sm font-semibold rounded ${intakeType === 'new' ? 'bg-sky-500 text-white' : 'text-zinc-700 hover:bg-zinc-300'}`}
                                >
                                    New Part
                                </button>
                            </div>
                        </FormRow>
                    )}
                     <FormRow>
                        <FormLabel htmlFor="deliveryNotePO">Delivery Note / PO #</FormLabel>
                        <FormInput id="deliveryNotePO" type="text" value={deliveryNotePO} onChange={e => setDeliveryNotePO(e.target.value)} placeholder="e.g., DN-12345 or PO-67890" required disabled={isReturnMode} />
                    </FormRow>
                </fieldset>

                <fieldset className="space-y-4">
                    <legend className="text-lg font-semibold text-zinc-900 border-b border-zinc-200 pb-2 mb-4 w-full">Item Details</legend>
                    {renderPartFields()}
                    <FormRow>
                        <FormLabel htmlFor="quantity">Quantity Received</FormLabel>
                        <FormInput id="quantity" type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g., 10" required disabled={isReturnMode} />
                    </FormRow>
                </fieldset>

                <fieldset className="space-y-4">
                    <legend className="text-lg font-semibold text-zinc-900 border-b border-zinc-200 pb-2 mb-4 w-full">Storage & Notes</legend>
                    <FormRow>
                        <FormLabel htmlFor="store">Assign to Store</FormLabel>
                        <FormSelect id="store" value={store} onChange={e => setStore(e.target.value as StoreType)} required disabled={isReturnMode || visibleStores.length === 1}>
                            <option value="">{visibleStores.length === 0 ? 'No stores available' : 'Select a store...'}</option>
                            {visibleStores.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </FormSelect>
                    </FormRow>
                     <FormRow>
                        <FormLabel htmlFor="location">Location in Store</FormLabel>
                        <FormInput id="location" type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g., Aisle 5, Bin C3" required disabled={isReturnMode}/>
                    </FormRow>
                    <FormRow>
                        <FormLabel htmlFor="comments">Comments / Notes</FormLabel>
                        <FormTextarea id="comments" value={comments} onChange={e => setComments(e.target.value)} placeholder="e.g., Box was damaged, partial delivery, etc." disabled={isReturnMode} />
                    </FormRow>
                </fieldset>

                <fieldset className="space-y-4">
                    <legend className="text-lg font-semibold text-zinc-900 border-b border-zinc-200 pb-2 mb-4 w-full">Confirmation</legend>
                    <FormRow>
                        <FormLabel htmlFor="receivedBy">Received By</FormLabel>
                        <FormInput id="receivedBy" type="text" value={user.name} readOnly />
                    </FormRow>
                </fieldset>
                
                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex justify-end items-center gap-3 pt-4 border-t border-zinc-200">
                    <button type="button" onClick={onCancel} className="px-6 py-2 bg-zinc-200 text-zinc-800 font-semibold rounded-md hover:bg-zinc-300 transition-colors">
                        Cancel
                    </button>
                     <button type="submit" disabled={loading} className="px-6 py-2 bg-sky-500 text-white font-semibold rounded-md hover:bg-sky-600 disabled:bg-zinc-300 transition-colors">
                        {loading ? 'Processing...' : (isReturnMode ? 'Confirm Return to Stock' : 'Add to Inventory')}
                    </button>
                </div>
            </form>
        </Card>
    );
};

export default StockIntakeForm;