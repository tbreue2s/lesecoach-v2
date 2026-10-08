export type AppScreen = 'home' | 'settings' | 'reader';

export interface RouterState {
  currentScreen: AppScreen;
  previousScreen: AppScreen | null;
}
