interface LoadingScreenProps {
  message: string;
  progress?: number;
}

export const LoadingScreen = ({ message, progress }: LoadingScreenProps) => {
  return (
    <div className="fixed inset-0 bg-gray-950/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 max-w-md w-full mx-4">
        <div className="flex flex-col items-center gap-6">
          <div className="spinner"></div>
          <p className="text-gray-300 text-center font-medium">{message}</p>
          {progress !== undefined && (
            <div className="w-full">
              <div className="bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="progress-bar bg-blue-500 h-full rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">{progress.toFixed(0)}%</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
