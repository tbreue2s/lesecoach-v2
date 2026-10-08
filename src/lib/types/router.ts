export type AppScreen = 'home' | 'adventure-setup' | 'settings' | 'reader';

export interface RouterState {
  currentScreen: AppScreen;
  previousScreen: AppScreen | null;
}
