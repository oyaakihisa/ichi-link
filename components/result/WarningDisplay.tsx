import { Warning, WarningSeverity } from '@/lib/types';

interface WarningDisplayProps {
  warnings: Warning[];
}

const severityStyles: Record<WarningSeverity, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  error: 'bg-red-50 border-red-200 text-[#ff0000]',
};

const severityIcons: Record<WarningSeverity, string> = {
  info: 'i',
  warning: '!',
  error: 'x',
};

export function WarningDisplay({ warnings }: WarningDisplayProps) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {warnings.map((warning, index) => (
        <div
          key={index}
          className={`flex items-start gap-2 p-3 border rounded-lg ${severityStyles[warning.severity]}`}
        >
          <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-current bg-opacity-20 text-xs font-bold">
            {severityIcons[warning.severity]}
          </span>
          <p className="text-sm whitespace-pre-line">{warning.message}</p>
        </div>
      ))}
    </div>
  );
}
