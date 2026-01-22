import { useEffect, useRef, useState } from 'react';
import type { SimulatorAvailability } from '../api/types';

export type ChipType = 'wormhole' | 'blackhole';

interface SimulatorSelectorProps {
  selectedChip: ChipType;
  onSelectChip: (chip: ChipType) => void;
  simulators: SimulatorAvailability[];
  disabled?: boolean;
}

// Simple Chevron Down SVG component
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

const CHIP_INFO: Record<ChipType, { name: string; description: string }> = {
  wormhole: {
    name: 'Wormhole',
    description: 'Tenstorrent Wormhole architecture',
  },
  blackhole: {
    name: 'Blackhole',
    description: 'Tenstorrent Blackhole architecture',
  },
};

export function SimulatorSelector({
  selectedChip,
  onSelectChip,
  simulators,
  disabled = false,
}: SimulatorSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getAvailability = (chip: ChipType): boolean => {
    const sim = simulators.find((s) => s.chip === chip);
    return sim?.available ?? false;
  };

  const selectedInfo = CHIP_INFO[selectedChip];
  const isSelectedAvailable = getAvailability(selectedChip);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all
          ${disabled 
            ? 'bg-gray-800 border-gray-700 cursor-not-allowed opacity-50' 
            : 'bg-gray-800 border-gray-600 hover:border-gray-500 hover:bg-gray-700 cursor-pointer'
          }
        `}
      >
        {/* Status indicator */}
        <span
          className={`w-2 h-2 rounded-full ${
            isSelectedAvailable ? 'bg-green-400' : 'bg-red-400'
          }`}
        />
        
        {/* Chip name */}
        <span className="text-sm font-medium text-white">{selectedInfo.name}</span>
        
        {/* Dropdown arrow */}
        <ChevronDownIcon
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider px-2 py-1 mb-1">
              Select Simulator
            </p>
            {(Object.keys(CHIP_INFO) as ChipType[]).map((chip) => {
              const info = CHIP_INFO[chip];
              const available = getAvailability(chip);
              const isSelected = chip === selectedChip;

              return (
                <button
                  key={chip}
                  onClick={() => {
                    if (available) {
                      onSelectChip(chip);
                      setIsOpen(false);
                    }
                  }}
                  disabled={!available}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors
                    ${isSelected 
                      ? 'bg-tt-purple/20 border border-tt-purple/50' 
                      : available 
                        ? 'hover:bg-gray-700 border border-transparent' 
                        : 'opacity-50 cursor-not-allowed border border-transparent'
                    }
                  `}
                >
                  {/* Availability indicator */}
                  <div className="flex-shrink-0">
                    {available ? (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500/20 text-green-400">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20 text-red-400">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    )}
                  </div>

                  {/* Chip info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{info.name}</p>
                    <p className="text-xs text-gray-400 truncate">{info.description}</p>
                    {!available && (
                      <p className="text-xs text-red-400 mt-0.5">Simulator not available</p>
                    )}
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="flex-shrink-0">
                      <span className="w-2 h-2 rounded-full bg-tt-purple block" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Footer note */}
          <div className="px-4 py-2 bg-gray-900/50 border-t border-gray-700">
            <p className="text-xs text-gray-500">
              Simulators require ttsim library files to be properly configured
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SimulatorSelector;
