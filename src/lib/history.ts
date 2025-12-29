const HISTORY_KEY = 'ai_accountant_history';
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

export interface Interaction {
    timestamp: number;
    userInput: string;
    intentType: string;
    intentParams: any;
}

export const historyManager = {
    saveInteraction: (userInput: string, intent: any) => {
        const history = historyManager.getHistory();
        const newInteraction: Interaction = {
            timestamp: Date.now(),
            userInput,
            intentType: intent.type,
            intentParams: intent.params
        };

        const updatedHistory = [...history, newInteraction];
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    },

    getHistory: (): Interaction[] => {
        if (typeof window === 'undefined') return [];
        const data = localStorage.getItem(HISTORY_KEY);
        if (!data) return [];

        const history: Interaction[] = JSON.parse(data);
        const now = Date.now();

        // Purge interactions older than 2 weeks
        const validHistory = history.filter(item => (now - item.timestamp) < TWO_WEEKS_MS);

        if (validHistory.length !== history.length) {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(validHistory));
        }

        return validHistory;
    },

    getSuggestions: (userInput: string): string[] => {
        const history = historyManager.getHistory();
        const text = userInput.toLowerCase();

        // Simple suggestion logic: if similar input was seen before, suggest its previous intent or style
        const similar = history.filter(h => h.userInput.toLowerCase().includes(text) || text.includes(h.userInput.toLowerCase()));

        return Array.from(new Set(similar.map(s => s.userInput))).slice(0, 3);
    }
};
