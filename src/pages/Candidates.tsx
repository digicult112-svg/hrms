import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { Candidate, JobPosition } from '../types';
import { Search, Plus, X, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


// Extended type for joined data
type CandidateWithJob = Candidate & { job?: JobPosition };

// Column definition
const COLUMNS: { id: Candidate['status']; title: string; color: string; badge: string }[] = [
    { id: 'applied', title: 'New Applications', color: 'bg-blue-50 dark:bg-blue-900/20', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200' },
    { id: 'shortlisted', title: 'Shortlisted', color: 'bg-purple-50 dark:bg-purple-900/20', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200' },
    { id: 'interview', title: 'Interview Stage', color: 'bg-amber-50 dark:bg-amber-900/20', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-800 dark:text-amber-200' },
    { id: 'selected', title: 'Hired / Selected', color: 'bg-emerald-50 dark:bg-emerald-900/20', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200' },
    { id: 'rejected', title: 'Rejected', color: 'bg-red-50 dark:bg-red-900/20', badge: 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200' },
];

// Memoized Card Component for Performance
const CandidateCard = React.memo(({ candidate, index }: { candidate: CandidateWithJob; index: number }) => {
    return (
        <Draggable draggableId={candidate.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`
                        group relative bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-800 
                        shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
                        ${snapshot.isDragging ? 'rotate-2 shadow-xl ring-2 ring-purple-500 z-50 scale-105 opacity-90' : ''}
                    `}
                    style={provided.draggableProps.style}
                >
                    <div className="flex justify-between items-center mb-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                            {candidate.job?.title?.slice(0, 15) || 'General'}{candidate.job?.title?.length! > 15 ? '...' : ''}
                        </span>
                        <span className="text-[10px] text-gray-400">
                            {new Date(candidate.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-inner flex-shrink-0
                            bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 text-gray-600 dark:text-gray-300
                        `}>
                            {candidate.full_name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-tight truncate">
                                {candidate.full_name}
                            </h4>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                {candidate.email}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    );
});

export default function CandidatesPage() {
    const [candidates, setCandidates] = useState<CandidateWithJob[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [jobs, setJobs] = useState<JobPosition[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        job_id: ''
    });

    useEffect(() => {
        fetchCandidates();
        fetchJobPositions(); // Changed from fetchJobs to fetchJobPositions
    }, []);



    const fetchCandidates = async () => {
        try {
            const { data, error } = await supabase
                .from('candidates')
                .select('*, job:job_positions(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCandidates(data || []);
        } catch (error) {
            console.error('Error fetching candidates:', error);
        }
    };

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;

        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        const newStatus = destination.droppableId as Candidate['status'];
        const oldStatus = source.droppableId as Candidate['status'];

        // Optimistic UI Update
        setCandidates((prev) =>
            prev.map((c) =>
                c.id === draggableId ? { ...c, status: newStatus } : c
            )
        );

        // Update Backend
        try {
            const { error } = await supabase
                .from('candidates')
                .update({ status: newStatus })
                .eq('id', draggableId);

            if (error) {
                console.error('Error updating status:', error);
                // Revert on error
                setCandidates((prev) =>
                    prev.map((c) =>
                        c.id === draggableId ? { ...c, status: oldStatus } : c
                    )
                );
                alert('Failed to update status. Please try again.');
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleAddCandidate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('candidates')
                .insert([{
                    full_name: formData.full_name,
                    email: formData.email,
                    phone: formData.phone,
                    job_id: formData.job_id,
                    status: 'applied'
                }])
                .select('*, job:job_positions(*)')
                .single();

            if (error) throw error;

            setCandidates([data, ...candidates]);
            setShowModal(false);
            setFormData({ full_name: '', email: '', phone: '', job_id: '' });
        } catch (error: any) {
            console.error('Error adding candidate:', error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Memoize and group candidates for performance
    const columnsWithCandidates = useMemo(() => {
        return COLUMNS.map(column => ({
            ...column,
            items: candidates
                .filter(c => c.status === column.id)
                .filter(c =>
                    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    c.job?.title?.toLowerCase().includes(searchTerm.toLowerCase() || '')
                )
        }));
    }, [candidates, searchTerm]);

    // Job Management State
    const [activeTab, setActiveTab] = useState<'pipeline' | 'jobs'>('pipeline');
    const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
    const [showJobForm, setShowJobForm] = useState(false);
    const [jobFormData, setJobFormData] = useState({ title: '', department: '', description: '' });
    const [selectedJob, setSelectedJob] = useState<JobPosition | null>(null);
    const [deletingJob, setDeletingJob] = useState(false);
    // const { profile } = useAuth(); // Unused as this page is implicitly HR-only via navigation

    // useEffect(() => { // This useEffect is now redundant as it's merged with the first one
    //     fetchCandidates();
    //     fetchJobPositions(); // Fetch all jobs for management
    // }, []);

    // Fetch jobs for filter dropdown (only open) AND management (all) - unifying to fetch all
    const fetchJobPositions = async () => {
        const { data, error } = await supabase
            .from('job_positions')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setJobs(data.filter(j => j.status === 'open')); // For dropdown
            setJobPositions(data); // For Jobs tab
        }
    };

    // --- Job Management Handlers ---
    const handleCreateJob = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('job_positions').insert({
                ...jobFormData,
                status: 'open'
            });

            if (error) throw error;
            setShowJobForm(false);
            setJobFormData({ title: '', department: '', description: '' });
            fetchJobPositions();
        } catch (error) {
            console.error('Error creating job:', error);
        }
    };

    const handleDeleteJob = async (id: string) => {
        if (!confirm('Are you sure you want to delete this job position?')) return;
        setDeletingJob(true);
        try {
            const { error } = await supabase
                .from('job_positions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setSelectedJob(null);
            fetchJobPositions();
        } catch (error) {
            console.error('Error deleting job:', error);
            alert('Error deleting job');
        } finally {
            setDeletingJob(false);
        }
    };

    const downloadCSV = () => {
        const headers = ['Name', 'Email', 'Phone', 'Applied Position', 'Status', 'Applied Date'];
        const csvContent = [
            headers.join(','),
            ...candidates.map(candidate => {
                const name = candidate.full_name;
                const email = candidate.email;
                const phone = candidate.phone || '';
                const position = candidate.job?.title || 'General';
                const status = candidate.status;
                const date = new Date(candidate.created_at).toLocaleDateString();

                return `"${name}","${email}","${phone}","${position}","${status}","${date}"`;
            })
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Recruitment_Data_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        setShowDownloadMenu(false);
    };

    const downloadPDF = () => {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.text('Recruitment Report', 14, 20);

        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Total Candidates: ${candidates.length}`, 14, 36);

        // Table
        const tableColumn = ["Name", "Email", "Phone", "Position", "Status", "Date"];
        const tableRows = candidates.map(c => [
            c.full_name,
            c.email,
            c.phone || '-',
            c.job?.title || 'General',
            c.status.toUpperCase(),
            new Date(c.created_at).toLocaleDateString()
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [100, 50, 200] }
        });

        doc.save(`Recruitment_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        setShowDownloadMenu(false);
    };

    // Group candidates by status - REMOVED, replaced by useMemo
    // const getCandidatesByStatus = (status: string) => {
    //     return candidates
    //         .filter((c) => c.status === status)
    //         .filter((c) =>
    //             c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    //             c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    //             c.job?.title.toLowerCase().includes(searchTerm.toLowerCase())
    //         );
    // };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col w-full">
            <div className="flex justify-between items-center mb-6 px-1">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recruitment</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage jobs and candidate pipelines</p>
                </div>

                {activeTab === 'pipeline' ? (
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search candidates..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white w-64"
                            />
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <Download className="w-4 h-4" />
                            </button>

                            {showDownloadMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowDownloadMenu(false)}
                                    ></div>
                                    <div className="absolute top-12 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 w-48 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                        <button
                                            onClick={downloadCSV}
                                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left transition-colors"
                                        >
                                            <FileSpreadsheet className="w-4 h-4 mr-3 text-green-600" />
                                            Export as CSV
                                        </button>
                                        <button
                                            onClick={downloadPDF}
                                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left transition-colors border-t border-gray-100 dark:border-gray-700/50"
                                        >
                                            <FileText className="w-4 h-4 mr-3 text-red-500" />
                                            Export as PDF
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Candidate
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowJobForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-medium transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Post New Job
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200 dark:border-gray-800 mb-6">
                <button
                    onClick={() => setActiveTab('pipeline')}
                    className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeTab === 'pipeline'
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                >
                    Candidate Pipeline
                    {activeTab === 'pipeline' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 dark:bg-purple-400 rounded-t-full"></div>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('jobs')}
                    className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeTab === 'jobs'
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                >
                    Job Openings
                    {activeTab === 'jobs' && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 dark:bg-purple-400 rounded-t-full"></div>
                    )}
                </button>
            </div>

            {activeTab === 'pipeline' ? (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                        <div className="flex gap-6 h-full min-w-[1200px] px-1">
                            {columnsWithCandidates.map((column) => (
                                <div key={column.id} className={`flex-shrink-0 w-80 flex flex-col rounded-2xl border border-gray-100 dark:border-gray-800/50 ${column.color} transition-colors duration-300`}>
                                    {/* Column Header */}
                                    <div className="p-4 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-bold text-gray-900 dark:text-gray-100 tracking-tight">{column.title}</h3>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${column.badge}`}>
                                                {column.items.length}
                                            </span>
                                        </div>
                                        {/* Optional: Add clear all or sort button here */}
                                    </div>

                                    {/* Droppable Area */}
                                    <Droppable droppableId={column.id}>
                                        {(provided, snapshot) => (
                                            <div
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                                className={`flex-1 p-2 overflow-y-auto space-y-2 scrollbar-hide ${snapshot.isDraggingOver ? 'bg-black/5 dark:bg-white/5 rounded-xl transition-colors' : ''
                                                    }`}
                                            >
                                                {column.items.map((candidate, index) => (
                                                    <CandidateCard
                                                        key={candidate.id}
                                                        candidate={candidate}
                                                        index={index}
                                                    />
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            ))}
                        </div>
                    </div>
                </DragDropContext>
            ) : (
                <div className="flex-1 overflow-y-auto pb-6">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {jobPositions.map((job) => (
                            <div key={job.id}
                                className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 p-6 border border-gray-100 dark:border-gray-800 hover:border-purple-100 dark:hover:border-purple-900/50 transition-all duration-300 group cursor-pointer h-fit"
                                onClick={() => setSelectedJob(job)}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{job.title}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">{job.department}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border uppercase tracking-wider ${job.status === 'open' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-100 dark:border-green-900/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                                        }`}>
                                        {job.status}
                                    </span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 line-clamp-3 leading-relaxed">{job.description}</p>
                                <div className="flex justify-between items-center pt-4 border-t border-gray-50 dark:border-gray-800">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Posted {new Date(job.created_at).toLocaleDateString()}</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedJob(job);
                                        }}
                                        className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 text-sm font-bold flex items-center gap-1 group/btn"
                                    >
                                        View Details
                                        <span className="group-hover/btn:translate-x-0.5 transition-transform">→</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- Modals for Jobs --- */}

            {/* Create Job Modal */}
            {showJobForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl max-w-2xl w-full p-8 relative animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800 transition-colors">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="w-2 h-8 bg-purple-500 rounded-full"></span>
                                Create Job Position
                            </h2>
                            <button onClick={() => setShowJobForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateJob} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1">Job Title</label>
                                    <input
                                        type="text"
                                        required
                                        value={jobFormData.title}
                                        onChange={(e) => setJobFormData({ ...jobFormData, title: e.target.value })}
                                        className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-gray-900 dark:text-white transition-all outline-none"
                                        placeholder="e.g. Senior Developer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1">Department</label>
                                    <input
                                        type="text"
                                        required
                                        value={jobFormData.department}
                                        onChange={(e) => setJobFormData({ ...jobFormData, department: e.target.value })}
                                        className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-gray-900 dark:text-white transition-all outline-none"
                                        placeholder="e.g. Engineering"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 ml-1">Description</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={jobFormData.description}
                                    onChange={(e) => setJobFormData({ ...jobFormData, description: e.target.value })}
                                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-gray-900 dark:text-white transition-all outline-none resize-none"
                                    placeholder="Detailed job description..."
                                />
                            </div>
                            <div className="flex justify-end pt-4 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowJobForm(false)}
                                    className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-semibold shadow-lg shadow-purple-600/20 active:scale-95 transition-all"
                                >
                                    Create Position
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Job Details Modal */}
            {selectedJob && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" onClick={() => setSelectedJob(null)}>
                    <div
                        className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl max-w-2xl w-full p-8 relative animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800 transition-colors"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{selectedJob.title}</h2>
                                <div className="flex items-center gap-3">
                                    <span className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-lg text-sm font-bold border border-purple-100 dark:border-purple-800/30">{selectedJob.department}</span>
                                    <span className="text-gray-400 text-sm font-medium">•</span>
                                    <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">Posted on {new Date(selectedJob.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedJob(null)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="prose prose-purple max-w-none text-gray-600 dark:text-gray-300 bg-gray-50/50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 mb-8 max-h-[60vh] overflow-y-auto">
                            <p className="whitespace-pre-wrap leading-relaxed">{selectedJob.description}</p>
                        </div>

                        <div className="flex justify-end gap-3 pt-2 border-t border-gray-50 dark:border-gray-800">
                            <button
                                onClick={() => handleDeleteJob(selectedJob.id)}
                                disabled={deletingJob}
                                className="px-6 py-2.5 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 font-bold transition-all disabled:opacity-50"
                            >
                                {deletingJob ? 'Deleting...' : 'Delete Position'}
                            </button>
                            <button
                                onClick={() => setSelectedJob(null)}
                                className="px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black font-bold shadow-lg shadow-gray-900/10 active:scale-95 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Candidate Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Candidate</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddCandidate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                    placeholder="e.g. John Doe"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                    placeholder="john@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                    placeholder="+91 98765 43210"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Applied For
                                </label>
                                <select
                                    required
                                    value={formData.job_id}
                                    onChange={(e) => setFormData({ ...formData, job_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                >
                                    <option value="">Select a position...</option>
                                    {jobs.map(job => (
                                        <option key={job.id} value={job.id}>{job.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Adding...' : 'Add Candidate'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
