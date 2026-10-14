import * as SecureStore from 'expo-secure-store';
const key = 'babybloom.appearance.v1';
export const readAppearance = () => SecureStore.getItemAsync(key);
export const writeAppearance = (value: string) => SecureStore.setItemAsync(key, value);
