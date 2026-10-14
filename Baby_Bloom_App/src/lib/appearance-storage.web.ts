const key = 'babybloom.appearance.v1';
export const readAppearance = async () => localStorage.getItem(key);
export const writeAppearance = async (value: string) => {
  localStorage.setItem(key, value);
};
