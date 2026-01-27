import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { apiClient } from './api';
import type { SimulatorAvailability } from './api/types';
import { type ChipType } from './components';
import { Sidebar } from './components/Sidebar';
import { DigitRecognitionPage } from './pages/DigitRecognitionPage';
import { MathematicalOperationsPage } from './pages/MathematicalOperationsPage';

// ============================================================================
// Main App Component - Layout Shell with Routing
// ============================================================================

function App() {
  // Global state shared across pages
  const [simulators, setSimulators] = useState<SimulatorAvailability[]>([]);
  const [selectedChip, setSelectedChip] = useState<ChipType>('wormhole');
  const [isLoadingHealth, setIsLoadingHealth] = useState(true);

  // Load simulator health on mount
  useEffect(() => {
    async function loadHealth() {
      try {
        const health = await apiClient.getHealth();
        setSimulators(health.simulators || []);
        
        // Select first available simulator as default
        const availableSimulator = health.simulators?.find((s) => s.available);
        if (availableSimulator) {
          setSelectedChip(availableSimulator.chip as ChipType);
        }
      } catch (err) {
        console.error('Failed to load simulator health:', err);
      } finally {
        setIsLoadingHealth(false);
      }
    }
    loadHealth();
  }, []);

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Page Content with Routes */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {isLoadingHealth ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-tt-purple border-t-transparent mx-auto mb-4"></div>
                <p className="text-gray-400">Connecting to simulator...</p>
              </div>
            </div>
          ) : (
            <Routes>
              <Route
                path="/"
                element={
                  <DigitRecognitionPage
                    simulators={simulators}
                    selectedChip={selectedChip}
                    onSelectChip={setSelectedChip}
                  />
                }
              />
              <Route
                path="/math-operations"
                element={
                  <MathematicalOperationsPage
                    simulators={simulators}
                    selectedChip={selectedChip}
                    onSelectChip={setSelectedChip}
                  />
                }
              />
            </Routes>
          )}
        </main>

        {/* Footer */}
        <footer className="flex-shrink-0 border-t border-gray-800 bg-gray-900 py-2">
          <p className="text-center text-xs text-gray-500">
            Powered by{' '}
            <a
              href="https://github.com/tenstorrent/ttsim"
              target="_blank"
              rel="noopener noreferrer"
              className="text-tt-purple-light hover:text-tt-purple"
            >
              ttsim
            </a>{' '}
            and{' '}
            <a
              href="https://github.com/tenstorrent/tt-metal"
              target="_blank"
              rel="noopener noreferrer"
              className="text-tt-purple-light hover:text-tt-purple"
            >
              tt-metal
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;