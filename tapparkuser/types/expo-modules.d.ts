declare module '@expo/vector-icons' {
  import { ComponentType } from 'react';
  export interface IconProps {
    name: string;
    size?: number;
    color?: string;
  }
  export const Ionicons: ComponentType<IconProps>;
  export const MaterialIcons: ComponentType<IconProps>;
  export const FontAwesome: ComponentType<IconProps>;
  export const FontAwesome5: ComponentType<IconProps>;
  export const MaterialCommunityIcons: ComponentType<IconProps>;
}

declare module '@react-native-async-storage/async-storage' {
  export function getItem(key: string): Promise<string | null>;
  export function setItem(key: string, value: string): Promise<void>;
  export function removeItem(key: string): Promise<void>;
  export function clear(): Promise<void>;
  export function getAllKeys(): Promise<string[]>;
}

declare module '@react-navigation/native' {
  export function useFocusEffect(effect: () => void | (() => void)): void;
  export function useNavigation(): any;
  export function useRoute(): any;
  export const NavigationContainer: any;
  export const createNavigationContainerRef: any;
}
