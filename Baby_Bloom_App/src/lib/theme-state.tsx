import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { readAppearance, writeAppearance } from './appearance-storage';
import { palettes, parseAppearance, type ThemeId } from './theme-palette';
import { ThemeEffects } from '../components/theme-effects';
type AppearanceState = {
  themeId: ThemeId;
  chosen: boolean;
  tutorialSeen: boolean;
  ready: boolean;
  pickerOpen: boolean;
  storageError: boolean;
  preview: (id: ThemeId) => void;
  choose: (id: ThemeId) => void;
  openPicker: () => void;
  closePicker: () => void;
  dismissTutorial: () => void;
};
const Context = createContext<AppearanceState>({
  themeId: 'neon',
  chosen: true,
  tutorialSeen: true,
  ready: true,
  pickerOpen: false,
  storageError: false,
  preview: () => {},
  choose: () => {},
  openPicker: () => {},
  closePicker: () => {},
  dismissTutorial: () => {},
});
export const useAppearance = () => useContext(Context);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>('neon');
  const [chosen, setChosen] = useState(false);
  const [tutorialSeen, setTutorialSeen] = useState(false);
  const [ready, setReady] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const changed = useRef(false);
  const persistence = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    readAppearance()
      .then((value) => {
        const saved = parseAppearance(value);
        if (active && !changed.current && saved) {
          setThemeId(saved.theme);
          setChosen(true);
          setTutorialSeen(saved.tutorialSeen);
        }
      })
      .catch(() => {
        if (active) setStorageError(true);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!ready || !chosen) return;
    let active = true;
    persistence.current = persistence.current
      .catch(() => undefined)
      .then(() =>
        writeAppearance(JSON.stringify({ version: 1, theme: themeId, chosen: true, tutorialSeen })),
      )
      .then(() => {
        if (active) setStorageError(false);
      })
      .catch(() => {
        if (active) setStorageError(true);
      });
    return () => {
      active = false;
    };
  }, [ready, chosen, themeId, tutorialSeen]);
  return (
    <Context.Provider
      value={{
        themeId,
        chosen,
        tutorialSeen,
        ready,
        pickerOpen,
        storageError,
        preview: (id) => {
          if (!chosen) {
            changed.current = true;
            setThemeId(id);
          }
        },
        choose: (id) => {
          changed.current = true;
          setThemeId(id);
          setChosen(true);
          setPickerOpen(false);
        },
        openPicker: () => setPickerOpen(true),
        closePicker: () => setPickerOpen(false),
        dismissTutorial: () => setTutorialSeen(true),
      }}
    >
      <ThemeEffects palette={palettes[themeId]} />
      {children}
    </Context.Provider>
  );
}
