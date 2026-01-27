import { NavLink } from 'react-router-dom';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    to: '/',
    label: 'Digit Recognition',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
    ),
  },
  {
    to: '/math-operations',
    label: 'Mathematical Operations',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
  },
];

export function Sidebar() {
  return (
    <aside className="flex-shrink-0 bg-gray-800 border-r border-gray-700 flex flex-col w-64">
      {/* Sidebar Header with Title */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-700">
        <div className="p-1.5 bg-tt-purple rounded-lg flex-shrink-0">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
            />
          </svg>
        </div>
        <span className="text-sm font-semibold text-white">TTSim Playground</span>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
              ${
                isActive
                  ? 'bg-tt-purple/20 text-tt-purple-light border border-tt-purple/30 shadow-sm shadow-tt-purple/10'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }
            `}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            <span className="text-sm font-medium truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-gray-700">
        <div className="text-xs text-gray-500">
          <p>Powered by <span className="text-tt-purple-light">ttsim</span></p>
        </div>
      </div>
    </aside>
  );
}
