// Only non-sensitive presentation preferences use localStorage.
export const readPreferences = async () => localStorage.getItem('babybloom.preferences');
export const writePreferences = async (value: string) => {
  localStorage.setItem('babybloom.preferences', value);
};
