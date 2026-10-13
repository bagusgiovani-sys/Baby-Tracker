import * as SecureStore from 'expo-secure-store';
export const readPreferences = () => SecureStore.getItemAsync('babybloom.preferences');
export const writePreferences = (value: string) => SecureStore.setItemAsync('babybloom.preferences', value);
