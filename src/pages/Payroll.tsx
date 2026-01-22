import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Payroll } from '../types';
import { useAuth } from '../context/AuthContext';
import { Download, Plus, X, IndianRupee, Search, Save, Trash2, RotateCcw, ShieldCheck } from 'lucide-react';
import jsPDF from 'jspdf';
import { getImageDetails } from '../utils/export';
import autoTable from 'jspdf-autotable';
import { useToast } from '../context/ToastContext';
import { sendEmail } from '../lib/email';
import digicultLogo from '../assets/digicult.png';
import { toLocalISOString } from '../utils/date';
import PayrollPreviewModal from '../components/PayrollPreviewModal';
import { logAction } from '../lib/logger';

export default function PayrollPage() {
    const { user, profile } = useAuth();
    const [payrolls, setPayrolls] = useState<Payroll[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showSalaryModal, setShowSalaryModal] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [generatingAll, setGeneratingAll] = useState(false);
    const [updatingSalary, setUpdatingSalary] = useState<string | null>(null);
    const { success, error: toastError } = useToast();

    // Form state
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [baseSalary, setBaseSalary] = useState('');
    const [hra, setHra] = useState('');
    const [allowances, setAllowances] = useState('');
    const [deductions, setDeductions] = useState('');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [employees, setEmployees] = useState<any[]>([]);
    const [salarySearch, setSalarySearch] = useState('');
    const [editedSalaries, setEditedSalaries] = useState<Record<string, string>>({});

    // Auto-populate salary when employee selected
    useEffect(() => {
        if (selectedEmployee) {
            const emp = employees.find(e => e.id === selectedEmployee);
            if (emp && emp.salary_record) {
                setBaseSalary(emp.salary_record.amount.toString());
                // Calculate default HRA (e.g., 40% of basic)
                setHra(Math.round(emp.salary_record.amount * 0.4).toString());
            } else {
                setBaseSalary('');
                setHra('');
            }
        }
    }, [selectedEmployee, employees]);

    useEffect(() => {
        fetchPayrolls();
        if (profile?.role === 'hr') {
            fetchEmployees();
        }
    }, [user, profile]);

    const fetchEmployees = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email, salary_record:salaries(amount)')
                .is('deleted_at', null)
                .order('full_name');

            if (error) throw error;
            setEmployees(data || []);
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const fetchPayrolls = async () => {
        try {
            let query = supabase
                .from('payroll')
                .select('*, profiles:user_id(full_name, email)')
                .eq('is_current', true) // Only show the latest versions
                .order('year', { ascending: false })
                .order('month', { ascending: false });

            if (profile?.role !== 'hr') {
                query = query.eq('user_id', user?.id);
            }

            const { data, error } = await query;
            if (error) throw error;
            // @ts-ignore
            setPayrolls(data || []);
        } catch (error) {
            console.error('Error fetching payrolls:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePayroll = async (e: React.FormEvent) => {
        e.preventDefault();
        setGenerating(true);

        try {
            // 1. Call the atomic RPC to generate payroll (this handles versioning/superseding)
            const { data: rpcResult, error: rpcError } = await supabase.rpc('generate_payroll_batch', {
                payroll_records: [{
                    user_id: selectedEmployee
                    // Server will fetch the latest Salary from profile and calculate LOP/Tax
                }],
                target_month: month,
                target_year: year
            });

            if (rpcError) throw rpcError;
            if (!rpcResult?.success) throw new Error(rpcResult?.error || 'Failed to generate payroll');

            success('Payroll generated successfully!');

            // Reset form
            setSelectedEmployee('');
            setBaseSalary('');
            setHra('');
            setAllowances('');
            setDeductions('');
            setShowModal(false);
            fetchPayrolls();
        } catch (error: any) {
            console.error('Error generating payroll:', error);
            toastError(`Error: ${error?.message || 'Unknown error occurred'}`);
        } finally {
            setGenerating(false);
        }
    };

    const handleUpdateSalary = async (userId: string, targetNetSalaryStr: string) => {
        setUpdatingSalary(userId);
        try {
            const targetNetSalary = parseFloat(targetNetSalaryStr);
            if (isNaN(targetNetSalary)) return;

            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            // Notify server to generate/update payroll for this user with a specific target
            const { data: rpcResult, error: rpcError } = await supabase.rpc('generate_payroll_batch', {
                payroll_records: [{
                    user_id: userId,
                    target_net_salary: targetNetSalary
                }],
                target_month: currentMonth,
                target_year: currentYear
            });

            if (rpcError) throw rpcError;
            if (!rpcResult?.success) throw new Error(rpcResult?.error || 'Failed to update salary');

            success('Revised salary updated successfully via server-side calculation');

            // Refresh lists
            await fetchEmployees();
            await fetchPayrolls();

            setEditedSalaries(prev => {
                const newState = { ...prev };
                delete newState[userId];
                return newState;
            });

            // Audit Log
            await logAction(user?.id || '', 'SALARY_UPDATED', 'payroll', {
                target_user_id: userId,
                new_net_salary: targetNetSalary,
                mode: 'allowances_adjustment',
                timestamp: new Date().toISOString()
            });
        } catch (error: any) {
            console.error('Error updating salary:', error);
            toastError('Failed to update salary');
        } finally {
            setUpdatingSalary(null);
        }
    };

    const handleResetSalary = async (userId: string) => {
        if (!window.confirm('Are you sure you want to completely RESET (Clear) both the Current Base Salary and Revised additions for this employee? This will set values to 0.')) return;

        setUpdatingSalary(userId);
        try {
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            // 1. Reset Profile Salary (Current Salary)
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ salary: 0 })
                .eq('id', userId);

            if (profileError) throw profileError;

            // 2. Reset Payroll Record via RPC (this handles versioning)
            const { data: rpcResult, error: rpcError } = await supabase.rpc('generate_payroll_batch', {
                payroll_records: [{
                    user_id: userId,
                    base_salary: 0,
                    hra: 0,
                    allowances: 0,
                    deductions: 0,
                    metadata: {}
                }],
                target_month: currentMonth,
                target_year: currentYear
            });

            if (rpcError) throw rpcError;
            if (!rpcResult?.success) throw new Error(rpcResult?.error || 'Failed to reset values');

            // 3. Clear local state
            setEditedSalaries(prev => {
                const newState = { ...prev };
                delete newState[userId];
                return newState;
            });

            // Audit Log
            await logAction(user?.id || '', 'SALARY_RESET', 'payroll', {
                target_user_id: userId,
                reason: 'Manual Reset to 0',
                timestamp: new Date().toISOString()
            });

            success('Salary data completely reset to 0');
            await fetchEmployees(); // Refresh Current Salary column
            await fetchPayrolls(); // Refresh Payroll table

        } catch (error: any) {
            console.error('Error resetting salary:', error);
            toastError('Failed to reset salary');
        } finally {
            setUpdatingSalary(null);
        }
    };

    const getMonthName = (month: number) => {
        return new Date(0, month - 1).toLocaleString('default', { month: 'long' });
    };

    const calculateNetSalary = (p: Payroll) => {
        return p.base_salary + p.hra + p.allowances - p.deductions;
    };

    const [previewData, setPreviewData] = useState<any>(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    const handlePreparePayroll = async () => {
        if (!window.confirm(`Are you sure you want to generate payroll for ALL employees for ${month}/${year}?`)) return;

        setGeneratingAll(true);
        try {
            // 1. Check Pending Items
            const { count: pendingLeaves, error: pendingLeaveError } = await supabase
                .from('leave_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            if (pendingLeaveError) throw pendingLeaveError;

            const { count: pendingAttendance, error: pendingAttError } = await supabase
                .from('attendance_logs')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            if (pendingAttError) throw pendingAttError;

            if ((pendingLeaves || 0) > 0 || (pendingAttendance || 0) > 0) {
                toastError(`Cannot generate payroll: Found ${pendingLeaves} pending leaves and ${pendingAttendance} pending attendance logs. Please resolve them first.`);
                return;
            }

            // 2. Fetch Employees
            const { data: employeesData, error: empError } = await supabase
                .from('profiles')
                .select('*')
                .is('deleted_at', null);

            if (empError) throw empError;

            // 3. Fetch Settings
            let startDay = 26;
            let endDay = 25;
            let enableTax = true;
            let paidLeavesPerMonth = 1;

            const { data: settings } = await supabase
                .from('system_settings')
                .select('key, value')
                .in('key', ['payroll_start_day', 'payroll_end_day', 'payroll_tax_enabled', 'payroll_paid_leaves_per_month']);

            if (settings) {
                const s = settings.find(x => x.key === 'payroll_start_day');
                const e = settings.find(x => x.key === 'payroll_end_day');
                const t = settings.find(x => x.key === 'payroll_tax_enabled');
                const l = settings.find(x => x.key === 'payroll_paid_leaves_per_month');

                if (s) startDay = Number(s.value);
                if (e) endDay = Number(e.value);
                if (t) enableTax = t.value === 'true';
                if (l) paidLeavesPerMonth = Number(l.value);
            }

            // 4. Identify Cycle Dates
            // Logic: Payroll for "January 2024" usually covers Dec 26, 2023 to Jan 25, 2024
            const prevMonthDate = new Date(year, month - 2, startDay);
            const currMonthDate = new Date(year, month - 1, endDay);
            const startStr = toLocalISOString(prevMonthDate);
            const endStr = toLocalISOString(currMonthDate);

            // 5. Fetch Holidays
            const { data: holidays, error: holError } = await supabase
                .from('leave_calendar_events')
                .select('*')
                .gte('event_date', startStr)
                .lte('event_date', endStr);

            if (holError) throw holError;

            // 6. Calculate Payroll
            const calculatedRecords: any[] = [];

            for (const emp of employeesData || []) {
                const baseSalary = emp.salary_record?.amount || 0;

                // Fetch Attendance
                const { data: attendance } = await supabase
                    .from('attendance_logs')
                    .select('work_date, mode, status')
                    .eq('user_id', emp.id)
                    .gte('work_date', startStr)
                    .lte('work_date', endStr);

                // Fetch Leaves
                const { data: leaves } = await supabase
                    .from('leave_requests')
                    .select('start_date, end_date')
                    .eq('user_id', emp.id)
                    .eq('status', 'approved')
                    .lte('start_date', endStr)
                    .gte('end_date', startStr);

                // Calculations
                const totalDaysInCycle = Math.round((currMonthDate.getTime() - prevMonthDate.getTime()) / (1000 * 3600 * 24)) + 1;
                const holidayCount = holidays?.length || 0;

                const presentDays = new Set(attendance?.filter((a: any) =>
                    a.mode === 'onsite' || ((a.mode === 'wfh' || a.mode === 'remote') && a.status === 'approved')
                ).map((a: any) => a.work_date)).size;

                let totalApprovedLeaveDays = 0;
                leaves?.forEach((leave: any) => {
                    const start = new Date(leave.start_date);
                    const end = new Date(leave.end_date);
                    const effectiveStart = start < prevMonthDate ? prevMonthDate : start;
                    const effectiveEnd = end > currMonthDate ? currMonthDate : end;

                    if (effectiveStart <= effectiveEnd) {
                        const diffTime = Math.abs(effectiveEnd.getTime() - effectiveStart.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                        totalApprovedLeaveDays += diffDays;
                    }
                });

                const paidLeaveQuota = paidLeavesPerMonth >= 0 ? paidLeavesPerMonth : 1;
                const paidLeavesUsed = Math.min(totalApprovedLeaveDays, paidLeaveQuota);

                let weekends = 0;
                const iterDate = new Date(prevMonthDate);
                while (iterDate <= currMonthDate) {
                    const day = iterDate.getDay();
                    if (day === 0 || day === 6) weekends++;
                    iterDate.setDate(iterDate.getDate() + 1);
                }

                let paidDays = presentDays + holidayCount + weekends + paidLeavesUsed;
                if (paidDays > totalDaysInCycle) paidDays = totalDaysInCycle;

                const lopDays = Math.max(0, totalDaysInCycle - paidDays);
                const perDaySalary = Number(baseSalary) / totalDaysInCycle; // Dynamic divisor fix
                let deductions = Math.round(lopDays * perDaySalary);

                let taxAmount = 0;
                if (enableTax) {
                    const salaryNum = Number(baseSalary);
                    if (salaryNum > 100000) taxAmount = salaryNum * 0.15;
                    else if (salaryNum > 50000) taxAmount = salaryNum * 0.10;
                    else if (salaryNum > 25000) taxAmount = salaryNum * 0.05;
                    deductions += taxAmount;
                }

                const netSalary = baseSalary - deductions;

                calculatedRecords.push({
                    user_id: emp.id,
                    base_salary: baseSalary,
                    hra: 0,
                    allowances: 0,
                    deductions: deductions,
                    net_salary: netSalary,
                    metadata: {
                        lop_days: lopDays,
                        lop_amount: Math.round(lopDays * perDaySalary),
                        tax_amount: taxAmount,
                        paid_days: paidDays,
                        total_days: totalDaysInCycle,
                        present_days: presentDays,
                        leave_days: totalApprovedLeaveDays
                    },
                    profiles: emp
                });
            }

            setPreviewData({
                employeeCount: calculatedRecords.length,
                totalPayout: calculatedRecords.reduce((sum, rec) => sum + rec.net_salary, 0),
                month: new Date(year, month - 1).toLocaleString('default', { month: 'long' }),
                year,
                records: calculatedRecords
            });
            setShowPreviewModal(true);

        } catch (error: any) {
            console.error('Error preparing payroll:', error);
            toastError(`Error: ${error.message}`);
        } finally {
            setGeneratingAll(false);
        }
    };

    const handleConfirmGenerate = async () => {
        if (!previewData || !previewData.records) return;

        setGeneratingAll(true);
        try {
            const payrollRecordsForDb = previewData.records.map((rec: any) => ({
                user_id: rec.user_id
            }));

            const { data: rpcResult, error: rpcError } = await supabase.rpc('generate_payroll_batch', {
                payroll_records: payrollRecordsForDb,
                target_month: month,
                target_year: year
            });

            if (rpcError) throw new Error(`Transaction failed: ${rpcError.message}`);
            if (!rpcResult?.success) throw new Error(`Transaction rolled back: ${rpcResult?.error || 'Unknown error'}`);

            success(`Successfully generated payroll for ${rpcResult.processed_count} employees.`);
            setShowPreviewModal(false);

            // Audit Log
            await logAction(user?.id || '', 'PAYROLL_GENERATED', 'payroll', {
                month,
                year,
                count: rpcResult.processed_count,
                total_payout: previewData.totalPayout,
                timestamp: new Date().toISOString()
            });

            // Email Sending
            const emailsToSend = previewData.records
                .filter((rec: any) => rec.profiles?.email)
                .map((rec: any) => ({
                    to: rec.profiles.email,
                    name: rec.profiles.full_name,
                    monthName: previewData.month,
                    year: year,
                    base: rec.base_salary,
                    deductions: rec.deductions,
                    net: rec.net_salary
                }));

            if (emailsToSend.length > 0) {
                let sentCount = 0;
                let failedCount = 0;
                for (const emailData of emailsToSend) {
                    try {
                        const html = `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                                <h2 style="color: #2563eb;">Payslip for ${emailData.monthName} ${emailData.year}</h2>
                                <p>Hi ${emailData.name},</p>
                                <p>Your payslip has been generated.</p>
                                <p>Net Salary: <strong>₹${emailData.net.toLocaleString('en-IN')}</strong></p>
                                <p style="margin-top: 20px; font-size: 14px; color: #666;">Regards,<br>HR Team</p>
                            </div>
                        `;
                        await sendEmail({
                            to: emailData.to,
                            subject: `Payslip: ${emailData.monthName} ${emailData.year}`,
                            html
                        });
                        sentCount++;
                        await new Promise(resolve => setTimeout(resolve, 500));
                    } catch (err) {
                        console.error(`Failed email to ${emailData.to}`, err);
                        failedCount++;
                    }
                }
                if (failedCount > 0) toastError(`Failed to send ${failedCount} emails.`);
                else success(`Sent ${sentCount} emails.`);
            }

            fetchPayrolls();

        } catch (error: any) {
            console.error('Error in commit:', error);
            toastError(error.message);
        } finally {
            setGeneratingAll(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const handleDownloadPayslip = async (p: Payroll & { metadata?: any }) => {
        try {
            // 1. Fetch ALL settings needed (Logo + Cycle + Tax)
            // 1. Fetch ALL settings needed (Logo + Cycle + Tax)
            let logoUrl = digicultLogo;
            let companyAddress = '123 Innovation Drive\nHyderabad, India 500081\ncontact@hrms.com';
            let footerText = 'This payslip is system generated and does not require a physical signature.';
            let showId = true;
            let showTax = true;

            // Cycle Defaults
            let startDay = 26;
            let endDay = 25;
            let paidLeavesQuota = 1;
            let taxEnabled = true;

            const { data: settings } = await supabase
                .from('system_settings')
                .select('key, value')
                .in('key', [
                    'company_logo', 'company_address', 'payslip_footer', 'payslip_show_id', 'payslip_show_tax',
                    'payroll_start_day', 'payroll_end_day', 'payroll_paid_leaves_per_month', 'payroll_tax_enabled'
                ]);

            if (settings) {
                // UI Settings
                const logo = settings.find(s => s.key === 'company_logo');
                const address = settings.find(s => s.key === 'company_address');
                const footer = settings.find(s => s.key === 'payslip_footer');
                const idSetting = settings.find(s => s.key === 'payslip_show_id');
                const taxSetting = settings.find(s => s.key === 'payslip_show_tax');

                if (logo) logoUrl = logo.value;
                if (address) companyAddress = address.value;
                if (footer) footerText = footer.value;

                if (idSetting) showId = idSetting.value === 'true';
                if (taxSetting) showTax = taxSetting.value === 'true';

                // Cycle Settings
                const s = settings.find(x => x.key === 'payroll_start_day');
                const e = settings.find(x => x.key === 'payroll_end_day');
                const l = settings.find(x => x.key === 'payroll_paid_leaves_per_month');
                const t = settings.find(x => x.key === 'payroll_tax_enabled');
                if (s) startDay = Number(s.value);
                if (e) endDay = Number(e.value);
                if (l) paidLeavesQuota = Number(l.value);
                if (t) taxEnabled = t.value === 'true';
            }

            // 2. Re-Calculate Breakdown Context (Dynamic Explanation)
            // We reconstruct the context to explain "Why is deduction X?"

            // Dates
            const prevMonthDate = new Date(p.year, p.month - 2, startDay); // Month is 1-based in DB
            const currMonthDate = new Date(p.year, p.month - 1, endDay);
            const startStr = toLocalISOString(prevMonthDate);
            const endStr = toLocalISOString(currMonthDate);
            const totalDaysInCycle = Math.round((currMonthDate.getTime() - prevMonthDate.getTime()) / (1000 * 3600 * 24)) + 1;

            // Fetch Holidays
            const { data: holidays } = await supabase.from('leave_calendar_events')
                .select('*').gte('event_date', startStr).lte('event_date', endStr);
            const holidayCount = holidays?.length || 0;

            // Fetch Attendance
            const { data: attendance } = await supabase.from('attendance_logs')
                .select('work_date, mode, status')
                .eq('user_id', p.user_id)
                .gte('work_date', startStr).lte('work_date', endStr);

            const presentDays = new Set(attendance?.filter((a: any) =>
                a.mode === 'onsite' || ((a.mode === 'wfh' || a.mode === 'remote') && a.status === 'approved')
            ).map((a: any) => a.work_date)).size;

            // Fetch Leaves
            const { data: leaves } = await supabase.from('leave_requests')
                .select('start_date, end_date')
                .eq('user_id', p.user_id).eq('status', 'approved')
                .or(`start_date.lte.${endStr},end_date.gte.${startStr}`);

            let totalApprovedLeaveDays = 0;
            leaves?.forEach((leave: any) => {
                const s = new Date(leave.start_date);
                const e = new Date(leave.end_date);
                const effS = s < prevMonthDate ? prevMonthDate : s;
                const effE = e > currMonthDate ? currMonthDate : e;
                if (effS <= effE) {
                    const diffDays = Math.ceil((effE.getTime() - effS.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    totalApprovedLeaveDays += diffDays;
                }
            });

            // Calculate Weekends
            let weekends = 0;
            let iterDate = new Date(prevMonthDate);
            while (iterDate <= currMonthDate) {
                const d = iterDate.getDay();
                if (d === 0 || d === 6) weekends++;
                iterDate.setDate(iterDate.getDate() + 1);
            }

            // Calculations
            const paidLeavesUsed = Math.min(totalApprovedLeaveDays, paidLeavesQuota);
            let paidDays = presentDays + holidayCount + weekends + paidLeavesUsed;
            if (paidDays > totalDaysInCycle) paidDays = totalDaysInCycle;

            const lopDays = Math.max(0, totalDaysInCycle - paidDays);
            const perDaySalary = p.base_salary / totalDaysInCycle; // Dynamic divisor fix
            const calculatedLopAmount = Math.round(lopDays * perDaySalary);

            let calculatedTax = 0;
            if (taxEnabled) {
                // Same slab as generate
                if (p.base_salary > 100000) calculatedTax = p.base_salary * 0.15;
                else if (p.base_salary > 50000) calculatedTax = p.base_salary * 0.10;
                else if (p.base_salary > 25000) calculatedTax = p.base_salary * 0.05;
            }

            // PDF Generation
            const doc = new jsPDF();

            // Helper for PDF currency
            const formatForPDF = (amount: number) => {
                return 'Rs. ' + amount.toLocaleString('en-IN', {
                    maximumFractionDigits: 0,
                    minimumFractionDigits: 0
                });
            };

            // 1. Header
            doc.setFontSize(22);
            doc.setTextColor(37, 99, 235); // Blue


            // Add Logo if available
            if (logoUrl) {
                try {
                    const logoData = await getImageDetails(logoUrl);

                    // Box Constraints
                    const maxWidth = 50;
                    const maxHeight = 25;

                    // Calculate scaled dimensions
                    let finalWidth = logoData.width;
                    let finalHeight = logoData.height;

                    // Scale down if needed
                    const widthRatio = maxWidth / logoData.width;
                    const heightRatio = maxHeight / logoData.height;
                    const scaleFactor = Math.min(widthRatio, heightRatio, 1); // Never scale up, only down if too big

                    finalWidth = logoData.width * scaleFactor;
                    finalHeight = logoData.height * scaleFactor;

                    // Vertical alignment: Center in the 10-40 Y-space? Or just top align at 10.
                    // Top align at 10 is safest to avoid hitting address.
                    doc.addImage(logoData.dataUrl, 'PNG', 20, 10, finalWidth, finalHeight);

                } catch (err) {
                    console.error('Failed to load logo image for PDF', err);
                    // Fallback to text only
                    doc.text("HRMS Corp.", 20, 20);
                }
            } else {
                doc.text("HRMS Corp.", 20, 20);
            }


            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);

            // Render Address (Mult-line support)
            // Start address significantly below the logo (Logo is 10->30, so start at 40)
            const addressLines = companyAddress.split('\n');
            let yPos = 40;
            addressLines.forEach(line => {
                doc.text(line, 20, yPos);
                yPos += 5;
            });



            // Payslip Details (Right side)
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text("PAYSLIP", 140, 20);

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`For: ${getMonthName(p.month)} ${p.year}`, 140, 26);
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, 140, 31);
            if (showId) {
                doc.text(`ID: ${p.id.slice(0, 8).toUpperCase()}`, 140, 36);
            }

            // Divider - Move down to accommodate potentially long address
            const dividerY = Math.max(yPos + 5, 50); // Ensure minimal spacing
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.line(20, dividerY, 190, dividerY);

            // Adjust subsequent Y positions based on dynamic divider
            const employeeDetailsY = dividerY + 10;

            // 2. Employee Info
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text("Employee Details", 20, employeeDetailsY);

            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            doc.text(`Name: ${p.profiles?.full_name || 'N/A'}`, 20, employeeDetailsY + 7);
            doc.text(`Email: ${p.profiles?.email || 'N/A'}`, 20, employeeDetailsY + 13);

            // 3. Earnings Table
            autoTable(doc, {
                startY: employeeDetailsY + 25,
                head: [['Earnings', 'Amount']],
                body: [
                    ['Base Salary', formatForPDF(p.base_salary)],
                    ['HRA', formatForPDF(p.hra)],
                    ['Allowances', formatForPDF(p.allowances)],
                ],
                theme: 'grid',
                headStyles: { fillColor: [22, 163, 74], textColor: 255 }, // Green header
                styles: { fontSize: 10, cellPadding: 3 },
                columnStyles: {
                    1: { halign: 'right' }
                }
            });

            // 4. Deductions Table
            // @ts-ignore
            const finalY1 = (doc as any).lastAutoTable.finalY + 10;

            const deductionRows = [];

            // We use the RE-CALCULATED breakdown to explain the Total Deduction
            // We try to match `p.deductions` (the stored truth)

            // Add LOP
            if (lopDays > 0) {
                deductionRows.push([`Loss of Pay (${lopDays} days absent)`, formatForPDF(calculatedLopAmount)]);
            }

            // Add Tax
            if (calculatedTax > 0 && showTax) {
                deductionRows.push([`Income Tax`, formatForPDF(calculatedTax)]);
            }

            // Check if there is discrepancy (e.g. manual edits or old logic)
            const explainedAmount = calculatedLopAmount + calculatedTax;
            const remainingDiff = p.deductions - explainedAmount;

            if (Math.abs(remainingDiff) > 10) { // Tolerance 10rs
                deductionRows.push([`Other / Adjustments`, formatForPDF(remainingDiff)]);
            } else if (p.deductions > 0 && deductionRows.length === 0) {
                // Fallback if our calculation yielded 0 but record has deduction
                deductionRows.push(['Total Deductions', formatForPDF(p.deductions)]);
            }

            // If absolutely nothing
            if (deductionRows.length === 0) {
                deductionRows.push(['No Deductions', formatForPDF(0)]);
            }


            autoTable(doc, {
                startY: finalY1,
                head: [['Deductions', 'Amount']],
                body: deductionRows,
                theme: 'grid',
                headStyles: { fillColor: [220, 38, 38], textColor: 255 }, // Red header
                styles: { fontSize: 10, cellPadding: 3 },
                columnStyles: {
                    1: { halign: 'right' }
                }
            });

            // 5. Net Profit / Summary
            // @ts-ignore
            const finalY = (doc as any).lastAutoTable.finalY + 15;

            // Draw a light background box for net salary
            doc.setFillColor(240, 249, 255); // Light blue
            doc.rect(120, finalY - 5, 70, 25, 'F');

            doc.setFontSize(12);
            doc.setTextColor(37, 99, 235); // Blue
            doc.setFont("helvetica", "bold");
            doc.text("Net Salary", 125, finalY + 5);

            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text(formatForPDF(calculateNetSalary(p)), 125, finalY + 15);

            // Footer
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.setFont("helvetica", "normal");

            // Handle multi-line footer if it's long
            const splitFooter = doc.splitTextToSize(footerText, 170);
            doc.text(splitFooter, 105, 280, { align: "center" });

            // Save
            doc.save(`Payslip_${p.profiles?.full_name?.replace(/\s+/g, '_') || 'Employee'}_${getMonthName(p.month)}_${p.year}.pdf`);

            // Audit Log
            await logAction(user?.id || '', 'REPORT_EXPORTED', 'payroll', {
                format: 'pdf',
                type: 'payslip',
                employee_id: p.user_id,
                month: p.month,
                year: p.year,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please check console for details.');
        }
    };

    const handleDeletePayroll = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this payroll record?')) return;

        try {
            const { error } = await supabase
                .from('payroll')
                .update({ is_current: false, superseded_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            success('Payroll record deleted successfully');
            setPayrolls(payrolls.filter(p => p.id !== id));

            // Audit Log
            await logAction(user?.id || '', 'PAYROLL_DELETED', 'payroll', {
                record_id: id,
                timestamp: new Date().toISOString()
            });
        } catch (error: any) {
            console.error('Error deleting payroll:', error);
            toastError('Failed to delete payroll record');
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payroll</h1>
                {profile?.role === 'hr' && (
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setShowSalaryModal(true)}
                            className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                        >
                            <IndianRupee className="w-4 h-4 mr-2" />
                            Manage Salaries
                        </button>
                        <button
                            onClick={handlePreparePayroll}
                            disabled={generatingAll}
                            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            {generatingAll ? 'Processing...' : 'Generate All'}
                        </button>
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Generate Single
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-3 font-medium">Employee</th>
                                <th className="px-6 py-3 font-medium">Month/Year</th>
                                <th className="px-6 py-3 font-medium">Base Salary</th>
                                <th className="px-6 py-3 font-medium">Allowances</th>
                                <th className="px-6 py-3 font-medium">Net Salary</th>
                                <th className="px-6 py-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">Loading...</td>
                                </tr>
                            ) : payrolls.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">No payroll records found</td>
                                </tr>
                            ) : (
                                payrolls.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{p.profiles?.full_name || 'Unknown'}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{p.profiles?.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 dark:text-gray-100 font-medium">
                                            {getMonthName(p.month)} {p.year}
                                        </td>
                                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{formatCurrency(p.base_salary)}</td>
                                        <td className="px-6 py-4 text-green-600 dark:text-green-400">+{formatCurrency(p.allowances)}</td>
                                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(calculateNetSalary(p))}
                                            {p.metadata?.server_calculated && (
                                                <div className="flex items-center gap-1 mt-1 text-[10px] uppercase font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded w-fit">
                                                    <ShieldCheck className="w-3 h-3" />
                                                    Verified
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleDownloadPayslip(p)}
                                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                title="Download Slip"
                                            >
                                                <Download className="w-5 h-5" />
                                            </button>
                                            {profile?.role === 'hr' && (
                                                <button
                                                    onClick={() => handleDeletePayroll(p.id)}
                                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 ml-3"
                                                    title="Delete Record"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Manage Salaries Modal */}
            {showSalaryModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-800 transition-colors">
                        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-800">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Manage Base Salaries</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Set default base salaries for all employees for automated payroll.</p>
                            </div>
                            <button onClick={() => setShowSalaryModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search employees..."
                                    value={salarySearch}
                                    onChange={(e) => setSalarySearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-purple-500 transition-colors dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-0">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">Employee</th>
                                        <th className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">Role</th>
                                        <th className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">Current Salary (₹)</th>
                                        <th className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">Revised Salary (₹)</th>
                                        <th className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 w-48">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                    {employees
                                        .filter(emp => emp.full_name?.toLowerCase().includes(salarySearch.toLowerCase()) || emp.email?.toLowerCase().includes(salarySearch.toLowerCase()))
                                        .map((emp) => (
                                            <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900 dark:text-white">{emp.full_name}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">{emp.email}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 capitalize">
                                                    {emp.role || 'Employee'}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 font-medium">
                                                    ₹{emp.salary_record?.amount?.toLocaleString() || '0'} / Month
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="number"
                                                        value={editedSalaries[emp.id] || ''}
                                                        onChange={(e) => setEditedSalaries(prev => ({ ...prev, [emp.id]: e.target.value }))}
                                                        className="block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-1.5 px-3 dark:text-white"
                                                        placeholder="Enter revised"
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => {
                                                            const val = editedSalaries[emp.id];
                                                            if (val) handleUpdateSalary(emp.id, val);
                                                        }}
                                                        disabled={updatingSalary === emp.id}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
                                                    >
                                                        <Save className="w-3.5 h-3.5" />
                                                        {updatingSalary === emp.id ? 'Saving...' : 'Save'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleResetSalary(emp.id)}
                                                        disabled={updatingSalary === emp.id}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 ml-2"
                                                        title="Reset to Base Salary"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800 transition-colors">
                        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-800">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Generate Payroll</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleGeneratePayroll} className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee</label>
                                <select
                                    required
                                    value={selectedEmployee}
                                    onChange={(e) => setSelectedEmployee(e.target.value)}
                                    className="block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                                >
                                    <option value="">Select an employee</option>
                                    {employees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.full_name} ({emp.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Month</label>
                                    <select
                                        required
                                        value={month}
                                        onChange={(e) => setMonth(parseInt(e.target.value))}
                                        className="block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                            <option key={m} value={m}>{getMonthName(m)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
                                    <input
                                        type="number"
                                        required
                                        value={year}
                                        onChange={(e) => setYear(parseInt(e.target.value))}
                                        className="block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Base Salary</label>
                                <input
                                    type="number"
                                    required
                                    step="0.01"
                                    value={baseSalary}
                                    onChange={(e) => setBaseSalary(e.target.value)}
                                    className="block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                                    placeholder="50000"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">HRA</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={hra}
                                        onChange={(e) => setHra(e.target.value)}
                                        className="block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                                        placeholder="10000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Allowances</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={allowances}
                                        onChange={(e) => setAllowances(e.target.value)}
                                        className="block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                                        placeholder="5000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deductions</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={deductions}
                                        onChange={(e) => setDeductions(e.target.value)}
                                        className="block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                                        placeholder="2000"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={generating}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    {generating ? 'Generating...' : 'Generate Payroll'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <PayrollPreviewModal
                isOpen={showPreviewModal}
                onClose={() => setShowPreviewModal(false)}
                onConfirm={handleConfirmGenerate}
                data={previewData}
                isGenerating={generatingAll}
            />
        </div>
    );
}
