import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
    success: (title: string, message?: string, duration?: number) => void;
    error: (title: string, message?: string, duration?: number) => void;
    info: (title: string, message?: string, duration?: number) => void;
    warning: (title: string, message?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const addToast = useCallback(({ type, title, message, duration = 5000 }: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, type, title, message, duration }]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    const success = (title: string, message?: string, duration?: number) => addToast({ type: 'success', title, message, duration });
    const error = (title: string, message?: string, duration?: number) => addToast({ type: 'error', title, message, duration });
    const info = (title: string, message?: string, duration?: number) => addToast({ type: 'info', title, message, duration });
    const warning = (title: string, message?: string, duration?: number) => addToast({ type: 'warning', title, message, duration });

    return (
        <ToastContext.Provider value={{ addToast, removeToast, success, error, info, warning }}>
            {children}
            <div className="fixed top-0 right-0 p-6 z-[100] flex flex-col gap-4 w-full max-w-sm pointer-events-none">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

const ToastItem = ({ toast, onRemove }: { toast: Toast; onRemove: () => void }) => {
    const icons = {
        success: <CheckCircle className="w-5 h-5 text-green-500" />,
        error: <AlertCircle className="w-5 h-5 text-red-500" />,
        warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />
    };

    const styles = {
        success: 'bg-white border-green-100 shadow-green-100/50',
        error: 'bg-white border-red-100 shadow-red-100/50',
        warning: 'bg-white border-amber-100 shadow-amber-100/50',
        info: 'bg-white border-blue-100 shadow-blue-100/50'
    };

    return (
        <div className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-in slide-in-from-right-full fade-in duration-300 ${styles[toast.type]} backdrop-blur-xl relative overflow-hidden group`}>

            {/* Decorative Side Bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${toast.type === 'success' ? 'bg-green-500' :
                toast.type === 'error' ? 'bg-red-500' :
                    toast.type === 'warning' ? 'bg-amber-500' :
                        'bg-blue-500'
                }`} />

            <div className={`mt-0.5 p-1.5 rounded-full ${toast.type === 'success' ? 'bg-green-50' :
                toast.type === 'error' ? 'bg-red-50' :
                    toast.type === 'warning' ? 'bg-amber-50' :
                        'bg-blue-50'
                }`}>
                {icons[toast.type]}
            </div>

            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-gray-900 leading-tight">{toast.title}</h4>
                {toast.message && (
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">{toast.message}</p>
                )}
            </div>

            <button
                onClick={onRemove}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};
