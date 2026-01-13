import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    const isDark = theme === "dark" ||
        (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="relative z-50 p-2 rounded-xl transition-all duration-200 
        bg-gray-100 hover:bg-gray-200 text-gray-600
        dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-400"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
            <span className="sr-only">Toggle theme</span>
            {isDark ? (
                <Sun className="h-5 w-5" />
            ) : (
                <Moon className="h-5 w-5" />
            )}
        </button>
    );
}
