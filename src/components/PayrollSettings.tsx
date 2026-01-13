import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Save, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function PayrollSettings() {
    const [startDay, setStartDay] = useState<number>(26);
    const [endDay, setEndDay] = useState<number>(25);
    const [enableTax, setEnableTax] = useState<boolean>(true);
    const [paidLeaves, setPaidLeaves] = useState<number>(1);

    // Payslip Design State
    const [companyLogo, setCompanyLogo] = useState('');
    const [companyAddress, setCompanyAddress] = useState('123 Innovation Drive\nHyderabad, India 500081\ncontact@hrms.com');
    const [footerNote, setFooterNote] = useState('This payslip is system generated and does not require a physical signature.');
    const [showId, setShowId] = useState(true);
    const [showTax, setShowTax] = useState(true);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { success, error: toastError } = useToast();

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('system_settings')
                .select('key, value')
                .in('key', [
                    'payroll_start_day',
                    'payroll_end_day',
                    'payroll_tax_enabled',
                    'payroll_paid_leaves_per_month',
                    'company_logo',
                    'company_address',
                    'payslip_footer',
                    'payslip_show_id',
                    'payslip_show_tax'
                ]);

            if (error) throw error;

            if (data) {
                const start = data.find(s => s.key === 'payroll_start_day');
                const end = data.find(s => s.key === 'payroll_end_day');
                const tax = data.find(s => s.key === 'payroll_tax_enabled');
                const leaves = data.find(s => s.key === 'payroll_paid_leaves_per_month');
                const logo = data.find(s => s.key === 'company_logo');
                const address = data.find(s => s.key === 'company_address');
                const footer = data.find(s => s.key === 'payslip_footer');
                const showIdSetting = data.find(s => s.key === 'payslip_show_id');
                const showTaxSetting = data.find(s => s.key === 'payslip_show_tax');

                if (start) setStartDay(Number(start.value));
                if (end) setEndDay(Number(end.value));
                if (tax) setEnableTax(tax.value === 'true');
                if (leaves) setPaidLeaves(Number(leaves.value));
                if (logo) setCompanyLogo(logo.value);
                if (address) setCompanyAddress(address.value);
                if (footer) setFooterNote(footer.value);
                if (showIdSetting) setShowId(showIdSetting.value === 'true');
                if (showTaxSetting) setShowTax(showTaxSetting.value === 'true');
            }
        } catch (error) {
            console.error('Error fetching payroll settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (startDay < 1 || startDay > 31 || endDay < 1 || endDay > 31) {
            toastError("Days must be between 1 and 31");
            return;
        }

        setSaving(true);
        try {
            const updates = [
                { key: 'payroll_start_day', value: String(startDay), description: 'Day of previous month when payroll cycle starts' },
                { key: 'payroll_end_day', value: String(endDay), description: 'Day of current month when payroll cycle ends' },
                { key: 'payroll_tax_enabled', value: String(enableTax), description: 'Enable/Disable income tax calculation' },
                { key: 'payroll_paid_leaves_per_month', value: String(paidLeaves), description: 'Number of paid leaves allowed per month' },
                { key: 'company_logo', value: companyLogo, description: 'URL of company logo for payslips' },
                { key: 'company_address', value: companyAddress, description: 'Company address for payslips' },
                { key: 'payslip_footer', value: footerNote, description: 'Footer text for payslips' },
                { key: 'payslip_show_id', value: String(showId), description: 'Show employee ID on payslip' },
                { key: 'payslip_show_tax', value: String(showTax), description: 'Show tax row on payslip' }
            ];

            const { error } = await supabase
                .from('system_settings')
                .upsert(updates);

            if (error) throw error;

            success('Payroll cycle settings updated successfully');
        } catch (error: any) {
            console.error('Error saving settings:', error);
            toastError(error.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-8 h-[200px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
    );

    return (
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden relative transition-colors">
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 dark:bg-purple-900/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

            <div className="p-8 relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg shadow-green-500/20">
                                <Calendar className="w-5 h-5 text-white" />
                            </div>
                            Payroll Configuration
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-1">Manage payroll cycles and payslip settings</p>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* 1. Cycle Settings (span 4/12) */}
                        <div className="lg:col-span-4 flex flex-col gap-6">
                            <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex-1">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
                                    Cycle Duration
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Start Day */}
                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 group hover:border-purple-200 dark:hover:border-purple-500/30 transition-all">
                                        <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 text-center">
                                            Start (Prev)
                                        </label>
                                        <div className="flex items-center justify-between gap-1">
                                            <button
                                                onClick={() => setStartDay(Math.max(1, startDay - 1))}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800 transition-all active:scale-95"
                                            >
                                                -
                                            </button>
                                            <div className="font-bold text-3xl text-gray-900 dark:text-white tabular-nums tracking-tight">
                                                {startDay}
                                            </div>
                                            <button
                                                onClick={() => setStartDay(Math.min(31, startDay + 1))}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800 transition-all active:scale-95"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    {/* End Day */}
                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 group hover:border-purple-200 dark:hover:border-purple-500/30 transition-all">
                                        <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 text-center">
                                            End (Curr)
                                        </label>
                                        <div className="flex items-center justify-between gap-1">
                                            <button
                                                onClick={() => setEndDay(Math.max(1, endDay - 1))}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800 transition-all active:scale-95"
                                            >
                                                -
                                            </button>
                                            <div className="font-bold text-3xl text-gray-900 dark:text-white tabular-nums tracking-tight">
                                                {endDay}
                                            </div>
                                            <button
                                                onClick={() => setEndDay(Math.min(31, endDay + 1))}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800 transition-all active:scale-95"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 p-4 rounded-xl bg-gradient-to-tr from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 border border-purple-100 dark:border-white/5">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-semibold text-purple-900 dark:text-purple-100 uppercase tracking-wider mb-1">Preview</p>
                                            <p className="text-sm text-purple-700 dark:text-purple-300">
                                                The current cycle runs from <span className="font-semibold">Nov {startDay}</span> to <span className="font-semibold">Dec {endDay}</span>.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Policies (span 4/12) */}
                        <div className="lg:col-span-4 flex flex-col gap-6">
                            <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex-1">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-teal-500 rounded-full"></span>
                                    Policies
                                </h3>

                                <div className="space-y-6">
                                    {/* Tax Toggle */}
                                    <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">Income Tax</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Automated tax deduction</div>
                                            </div>
                                            <button
                                                onClick={() => setEnableTax(!enableTax)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${enableTax ? 'bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]' : 'bg-gray-200 dark:bg-gray-700'}`}
                                            >
                                                <span
                                                    className={`${enableTax ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition shadow-sm`}
                                                />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Paid Leaves */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Paid Leaves / Month</label>
                                        <div className="flex items-center gap-3">
                                            <div className="relative flex-1">
                                                <input
                                                    type="number"
                                                    value={paidLeaves}
                                                    onChange={(e) => setPaidLeaves(Number(e.target.value))}
                                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-bold text-lg"
                                                />
                                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                                    <span className="text-sm font-medium text-gray-400">Days</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 ml-1">
                                            * Leaves exceeding this quota will follow the Loss of Pay (LOP) policy.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Payslip Design (span 4/12) */}
                        <div className="lg:col-span-4 flex flex-col gap-6">
                            <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex-1">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
                                    Payslip Design
                                </h3>

                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors cursor-pointer"
                                            onClick={() => setShowTax(!showTax)}>
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${showTax ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                                {showTax && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 select-none">Show Tax Breakdown</span>
                                        </div>

                                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => {
                                                if (companyLogo) setCompanyLogo('');
                                                else setCompanyLogo('https://placehold.co/100x40');
                                            }}>
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${companyLogo !== '' ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                                    {companyLogo !== '' && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                </div>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 select-none">Include Company Logo</span>
                                            </div>
                                            {companyLogo !== '' && (
                                                <div className="mt-3 ml-8">
                                                    <input
                                                        type="text"
                                                        value={companyLogo}
                                                        onChange={(e) => setCompanyLogo(e.target.value)}
                                                        className="w-full bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-600 focus:border-indigo-500 text-xs py-1.5 px-2 text-gray-700 dark:text-gray-300 outline-none transition-colors"
                                                        placeholder="Enter Logo URL..."
                                                        autoFocus
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Details</label>
                                        <div className="space-y-3">
                                            <textarea
                                                value={companyAddress}
                                                onChange={(e) => setCompanyAddress(e.target.value)}
                                                rows={2}
                                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none placeholder:text-gray-400"
                                                placeholder="Company Address"
                                            />
                                            <textarea
                                                value={footerNote}
                                                onChange={(e) => setFooterNote(e.target.value)}
                                                rows={2}
                                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 text-xs text-gray-600 dark:text-gray-300 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none placeholder:text-gray-400"
                                                placeholder="Payslip Footer Note"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800/50">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center justify-center px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl hover:scale-[1.02] transform transition-all font-bold text-sm shadow-xl shadow-gray-900/10 dark:shadow-white/5 disabled:opacity-70 disabled:hover:scale-100"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                    Saving Config...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5 mr-3" />
                                    Save Configuration
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
