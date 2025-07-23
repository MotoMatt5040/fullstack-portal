import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logOut } from '../../features/auth/authSlice';
import { useLogoutMutation } from '../../features/auth/authApiSlice';
import { toggleShowGraphs, toggleUseGpcph } from '../../features/settingsSlice';
import MyToggle from '../../components/MyToggle';
import MyRadioButton from '../../components/MyRadioButton';

interface RootState {
  settings: {
    showGraphs: boolean;
    useGpcph: boolean;
  };
}

const Settings: React.FC = () => {
  const dispatch = useDispatch();
  const [logoutRequest] = useLogoutMutation();
  const [theme, setTheme] = useState<string>(localStorage.getItem('theme') || 'dark');
  const [persistStatus, setPersistStatus] = useState<boolean>(false);
  const showGraphs = useSelector((state: RootState) => state.settings.showGraphs);
  const useGpcph = useSelector((state: RootState) => state.settings.useGpcph);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
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

  const togglePersistForTesting = (): void => {
    const newPersistValue = !persistStatus;
    document.cookie = `persist=${newPersistValue}; path=/`;
    setPersistStatus(newPersistValue);
  };

  return (
    <section>
      <h2>Account Settings</h2>
      
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Session Management</h3>
        <p>
          <strong>Auto-logout:</strong> {persistStatus ? 'Disabled (Stay logged in)' : 'Enabled (15 min timeout)'}
        </p>
        <button 
          onClick={togglePersistForTesting}
          style={{ 
            padding: '8px 16px',
            backgroundColor: persistStatus ? '#dc3545' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '10px'
          }}
        >
          {persistStatus ? 'Enable Auto-Logout' : 'Disable Auto-Logout'}
        </button>
        <br />
        <small style={{ color: '#666' }}>
          {persistStatus 
            ? 'Your session will persist until you manually log out.'
            : 'Your session will auto-logout after 15 minutes of inactivity. You\'ll get a 2-minute warning.'
          }
        </small>
      </div>

      <button onClick={handleLogout} style={{ marginBottom: '20px' }}>
        Log Out
      </button>
      
      <br />
      
      <MyRadioButton
        groupName='theme'
        labels={['Light Theme', 'Dark Theme', 'Super Dark Theme']}
        values={['light', 'dark', 'superdark']}
        selectedValue={theme}
        onChange={handleThemeChange}
      />
      
      <MyToggle
        label='Show Graphs'
        active={showGraphs}
        onClick={handleGraphToggle}
      />
      
      <MyToggle
        label='Use GPCPH'
        active={useGpcph}
        onClick={handleGpcphToggle}
      />
    </section>
  );
};

export default Settings;