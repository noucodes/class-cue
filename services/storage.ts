import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

/**
 * Persistence seam for the store. Swap this for an API-backed StateStorage
 * (getItem → GET, setItem → PUT) when a backend exists; nothing else needs to change.
 */
export const appStorage: StateStorage = AsyncStorage;

export const STORAGE_KEY = 'classcue-data';
