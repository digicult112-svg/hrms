import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Downloads an array of objects as a CSV file.
 * @param data Array of objects to export
 * @param filename Name of the file (without extension)
 */
export const downloadCSV = <T extends object>(data: T[], filename: string) => {
    if (!data.length) return;

    // Get headers from first object
    const headers = Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
        headers.join(','), // Header row
        ...data.map(row =>
            headers.map(fieldName => {
                const value = (row as any)[fieldName];
                // Handle strings with commas or quotes
                const stringValue = value === null || value === undefined ? '' : String(value);
                return `"${stringValue.replace(/"/g, '""')}"`;
            }).join(',')
        )
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

/**
 * Downloads an array of objects as a PDF table.
 * @param data Array of objects to export
 * @param filename Name of the file (without extension)
 * @param title Title to display at the top of the PDF
 */
export const downloadPDF = <T extends object>(data: T[], filename: string, title: string = 'Report') => {
    if (!data.length) return;

    const doc = new jsPDF();
    const headers = Object.keys(data[0]);
    const rows = data.map(row => Object.values(row));

    // Add title
    doc.setFontSize(18);
    doc.text(title, 14, 22);

    // Add table
    autoTable(doc, {
        startY: 30,
        head: [headers],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
        styles: { fontSize: 8 }
    });

    doc.save(`${filename}.pdf`);
};

export const getBase64FromUrl = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                try {
                    // Default to PNG to preserve quality/transparency
                    const dataURL = canvas.toDataURL('image/png');
                    resolve(dataURL);
                } catch (e) {
                    reject(e);
                }
            } else {
                reject(new Error('Canvas context failed'));
            }
        };
        img.onerror = () => {
            reject(new Error(`Failed to load image: ${url}`));
        };
    });
};

export const getImageDetails = (url: string): Promise<{ dataUrl: string; width: number; height: number; ratio: number }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                try {
                    const dataUrl = canvas.toDataURL('image/png');
                    resolve({
                        dataUrl,
                        width: img.width,
                        height: img.height,
                        ratio: img.width / img.height
                    });
                } catch (e) {
                    reject(e);
                }
            } else {
                reject(new Error('Canvas context failed'));
            }
        };
        img.onerror = () => {
            reject(new Error(`Failed to load image: ${url}`));
        };
    });
};
