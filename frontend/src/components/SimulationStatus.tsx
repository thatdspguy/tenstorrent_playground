import type { SimulationJob, SimulationStatus } from '../api/types';

interface SimulationStatusProps {
  job: SimulationJob | null;
  isRunning: boolean;
}

const statusConfig: Record<
  SimulationStatus,
  { color: string; bgColor: string; text: string }
> = {
  pending: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    text: 'Pending',
  },
  running: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    text: 'Running',
  },
  completed: {
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    text: 'Completed',
  },
  failed: {
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    text: 'Failed',
  },
};

export function SimulationStatusDisplay({
  job,
  isRunning,
}: SimulationStatusProps) {
  if (!job && !isRunning) {
    return null;
  }

  if (isRunning && !job) {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-tt-purple border-t-transparent"></div>
        <span className="text-gray-300">Starting simulation...</span>
      </div>
    );
  }

  if (!job) return null;

  const config = statusConfig[job.status];

  return (
    <div className={`p-4 rounded-lg ${config.bgColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {job.status === 'running' && (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent"></div>
          )}
          {job.status === 'completed' && (
            <svg
              className="w-5 h-5 text-green-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {job.status === 'failed' && (
            <svg
              className="w-5 h-5 text-red-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          )}
          <div>
            <span className={`font-medium ${config.color}`}>{config.text}</span>
            <span className="text-gray-400 text-sm ml-2">
              Job: {job.job_id}
            </span>
          </div>
        </div>
        {job.status === 'running' && (
          <div className="text-sm text-gray-400">
            {Math.round(job.progress * 100)}%
          </div>
        )}
      </div>

      {job.error && (
        <div className="mt-3 p-3 bg-red-900/30 rounded text-sm text-red-300 font-mono">
          {job.error}
        </div>
      )}
    </div>
  );
}

export default SimulationStatusDisplay;
