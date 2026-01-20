import { useState } from 'react';
import { User } from 'lucide-react';

interface SafeAvatarProps {
    src?: string | null;
    alt: string;
    className?: string;
    size?: number;
}

export default function SafeAvatar({ src, alt, className = '', size = 20 }: SafeAvatarProps) {
    const [error, setError] = useState(false);

    // Basic URL validation to prevent javascript: or data: XSS
    const isValidUrl = (url: string) => {
        try {
            const parsed = new URL(url);
            return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
            return false;
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Deterministic color based on name
    const getBackgroundColor = (name: string) => {
        const colors = [
            'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
            'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
            'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
            'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
            'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
            'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
            'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    if (!src || error || !isValidUrl(src)) {
        return (
            <div
                className={`flex items-center justify-center rounded-full font-medium ${getBackgroundColor(alt)} ${className}`}
                style={{ width: size, height: size, fontSize: size * 0.4 }}
                title={alt}
            >
                {alt ? getInitials(alt) : <User size={size * 0.6} />}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={`object-cover rounded-full ${className}`}
            style={{ width: size, height: size }}
            onError={() => setError(true)}
        />
    );
}
