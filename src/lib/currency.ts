// Currency configuration and formatting utilities for multi-currency payroll

export interface CurrencyConfig {
    symbol: string;
    name: string;
    code: string;
    decimals: number;
    symbolPosition: 'before' | 'after';
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
    'INR': {
        symbol: '₹',
        name: 'Indian Rupee',
        code: 'INR',
        decimals: 0,
        symbolPosition: 'before'
    },
    'USD': {
        symbol: '$',
        name: 'US Dollar',
        code: 'USD',
        decimals: 2,
        symbolPosition: 'before'
    },
    'AED': {
        symbol: 'د.إ',
        name: 'UAE Dirham',
        code: 'AED',
        decimals: 2,
        symbolPosition: 'before'
    },
    'GBP': {
        symbol: '£',
        name: 'British Pound',
        code: 'GBP',
        decimals: 2,
        symbolPosition: 'before'
    },
    'EUR': {
        symbol: '€',
        name: 'Euro',
        code: 'EUR',
        decimals: 2,
        symbolPosition: 'before'
    },
    'SGD': {
        symbol: 'S$',
        name: 'Singapore Dollar',
        code: 'SGD',
        decimals: 2,
        symbolPosition: 'before'
    },
    'AUD': {
        symbol: 'A$',
        name: 'Australian Dollar',
        code: 'AUD',
        decimals: 2,
        symbolPosition: 'before'
    },
    'JPY': {
        symbol: '¥',
        name: 'Japanese Yen',
        code: 'JPY',
        decimals: 0,
        symbolPosition: 'before'
    },
    'CNY': {
        symbol: '¥',
        name: 'Chinese Yuan',
        code: 'CNY',
        decimals: 2,
        symbolPosition: 'before'
    }
};

/**
 * Format a number as currency with proper symbol and decimals
 * @param amount - The amount to format
 * @param currencyCode - ISO 4217 currency code (e.g., 'USD', 'INR')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currencyCode: string = 'INR'): string {
    const config = CURRENCIES[currencyCode] || CURRENCIES['INR'];

    const formattedNumber = amount.toLocaleString('en-US', {
        minimumFractionDigits: config.decimals,
        maximumFractionDigits: config.decimals
    });

    if (config.symbolPosition === 'before') {
        return `${config.symbol}${formattedNumber}`;
    } else {
        return `${formattedNumber} ${config.symbol}`;
    }
}

/**
 * Get currency symbol for a given currency code
 * @param currencyCode - ISO 4217 currency code
 * @returns Currency symbol
 */
export function getCurrencySymbol(currencyCode: string = 'INR'): string {
    return CURRENCIES[currencyCode]?.symbol || '₹';
}

/**
 * Get currency configuration
 * @param currencyCode - ISO 4217 currency code
 * @returns Currency configuration object
 */
export function getCurrencyConfig(currencyCode: string = 'INR'): CurrencyConfig {
    return CURRENCIES[currencyCode] || CURRENCIES['INR'];
}

/**
 * Get list of all available currencies for dropdown
 * @returns Array of currency options
 */
export function getCurrencyOptions(): Array<{ value: string; label: string }> {
    return Object.values(CURRENCIES).map(currency => ({
        value: currency.code,
        label: `${currency.name} (${currency.symbol})`
    }));
}
