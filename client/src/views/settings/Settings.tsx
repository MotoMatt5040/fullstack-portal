import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logOut } from '../../features/auth/authSlice';
import { useLogoutMutation } from '../../features/auth/authApiSlice';
import { toggleShowGraphs, toggleUseGpcph } from '../../features/settingsSlice';
import Icon from '@mdi/react';
import {
  mdiLogout,
  mdiWeatherSunny,
  mdiWeatherNight,
  mdiMoonWaningCrescent,
  mdiThemeLightDark,
  mdiChartBar,
  mdiClockOutline,
  mdiSpeedometer,
} from '@mdi/js';
import './Settings.css';

interface RootState {
  settings: {
    showGraphs: boolean;
    useGpcph: boolean;
  };
}

// Helper to get system preference
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
};

const Settings: React.FC = () => {
  const dispatch = useDispatch();
  const [logoutRequest] = useLogoutMutation();
  const [theme, setTheme] = useState<string>(localStorage.getItem('theme') || 'dark');
  const [persistStatus, setPersistStatus] = useState<boolean>(false);
  const showGraphs = useSelector((state: RootState) => state.settings.showGraphs);
  const useGpcph = useSelector((state: RootState) => state.settings.useGpcph);

  // Apply theme (handle 'system' option)
  useEffect(() => {
    const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }, [theme]);

  // Listen for system theme changes when 'system' is selected
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      document.documentElement.setAttribute('data-theme', getSystemTheme());
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  useEffect(() => {
    const checkPersistStatus = (): void => {
      setPersistStatus(document.cookie.includes('persist=true'));
    };

    checkPersistStatus();
    const interval = setInterval(checkPersistStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async (): Promise<void> => {
    try {
      await logoutRequest();
      dispatch(logOut());
      localStorage.removeItem('token');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleGraphToggle = (): void => {
    dispatch(toggleShowGraphs());
  };

  const handleGpcphToggle = (): void => {
    dispatch(toggleUseGpcph());
  };

  const handleThemeChange = (val: string): void => {
    setTheme(val);
    localStorage.setItem('theme', val);
  };

  const togglePersist = (): void => {
    const newPersistValue = !persistStatus;
    document.cookie = `persist=${newPersistValue}; path=/`;
    setPersistStatus(newPersistValue);
  };

  const themeOptions = [
    { value: 'system', icon: mdiThemeLightDark, label: 'System' },
    { value: 'light', icon: mdiWeatherSunny, label: 'Light' },
    { value: 'dark', icon: mdiWeatherNight, label: 'Dark' },
    { value: 'superdark', icon: mdiMoonWaningCrescent, label: 'Dim' },
  ];

  return (
    <div className='settings-panel'>
      {/* Theme Selector */}
      <div className='settings-row'>
        <span className='settings-label'>Theme</span>
        <div className='theme-selector'>
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              className={`theme-btn ${theme === opt.value ? 'active' : ''}`}
              onClick={() => handleThemeChange(opt.value)}
              title={opt.label}
            >
              <Icon path={opt.icon} size={0.7} />
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className='settings-toggles'>
        <button
          className={`settings-toggle ${showGraphs ? 'active' : ''}`}
          onClick={handleGraphToggle}
          title='Show graphs in reports'
        >
          <Icon path={mdiChartBar} size={0.7} />
          <span>Graphs</span>
        </button>
        <button
          className={`settings-toggle ${useGpcph ? 'active' : ''}`}
          onClick={handleGpcphToggle}
          title='Use GPCPH metric'
        >
          <Icon path={mdiSpeedometer} size={0.7} />
          <span>GPCPH</span>
        </button>
        <button
          className={`settings-toggle ${persistStatus ? 'active' : ''}`}
          onClick={togglePersist}
          title={persistStatus ? 'Session persists until logout' : '15 min auto-logout'}
        >
          <Icon path={mdiClockOutline} size={0.7} />
          <span>Stay In</span>
        </button>
      </div>

      {/* Logout */}
      <button className='logout-btn' onClick={handleLogout}>
        <Icon path={mdiLogout} size={0.8} />
        <span>Log Out</span>
      </button>
    </div>
  );
};

export default Settings;
