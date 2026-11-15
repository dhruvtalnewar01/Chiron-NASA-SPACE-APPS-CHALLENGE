import React from 'react';

export type ThemeId = 'orbital-daylight' | 'deep-space' | 'circadian-red';

interface ThemeSelectorProps {
  activeTheme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
}

const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'orbital-daylight', label: 'ORBITAL DAYLIGHT' },
  { id: 'deep-space',       label: 'DEEP-SPACE' },
  { id: 'circadian-red',    label: 'CIRCADIAN RED' },
];

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ activeTheme, onThemeChange }) => {
  const handleClick = (theme: ThemeId) => {
    document.documentElement.setAttribute('data-theme', theme);
    onThemeChange(theme);
  };

  return (
    <div
      style={{
        display: 'flex',
        border: '1px solid var(--border-primary)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}
    >
      {THEMES.map((theme) => {
        const isActive = activeTheme === theme.id;
        return (
          <button
            key={theme.id}
            onClick={() => handleClick(theme.id)}
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              padding: '4px 7px',
              border: 'none',
              borderRight: '1px solid var(--border-secondary)',
              borderRadius: '0px',
              cursor: 'pointer',
              color: isActive
                ? 'var(--accent-active)'
                : 'var(--ink-secondary)',
              backgroundColor: isActive
                ? 'var(--surface-active)'
                : 'var(--surface-panel)',
              boxShadow: isActive
                ? 'inset 0 1px 2px rgba(0,0,0,0.2)'
                : 'none',
              transition: 'all 0.12s ease',
            }}
          >
            {theme.label}
          </button>
        );
      })}
    </div>
  );
};

export default ThemeSelector;
