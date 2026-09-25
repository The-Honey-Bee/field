import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export type TrendHorizon = 'weekly' | 'monthly' | 'quarterly' | 'custom' | 'WoW' | 'MoM' | 'QoQ';

export interface TrendIndicatorProps {
  value: number; // e.g. 12.4 for +12.4%, -3.2 for -3.2%
  horizon?: TrendHorizon;
  suffix?: string;
  invertColors?: boolean; // if true, negative is green and positive is red (e.g. for delays/turnaround time)
  size?: 'xs' | 'sm' | 'md';
  label?: string;
  showBackground?: boolean;
  className?: string;
  testId?: string;
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  value,
  horizon = 'weekly',
  suffix = '%',
  invertColors = false,
  size = 'sm',
  label,
  showBackground = true,
  className = '',
  testId,
}) => {
  const { isSwahili } = useLanguage();

  const isPositive = value > 0;
  const isNeutral = value === 0;
  const isGood = invertColors ? !isPositive && !isNeutral : isPositive;

  // Horizon tag text
  const getHorizonTag = () => {
    if (label) return label;
    if (horizon === 'weekly' || horizon === 'WoW') {
      return isSwahili ? 'WoW' : 'WoW';
    }
    if (horizon === 'monthly' || horizon === 'MoM') {
      return isSwahili ? 'MoM' : 'MoM';
    }
    if (horizon === 'quarterly' || horizon === 'QoQ') {
      return isSwahili ? 'QoQ' : 'QoQ';
    }
    if (horizon === 'custom') {
      return isSwahili ? 'Muda' : 'Range';
    }
    return '';
  };

  const getFullTooltip = () => {
    const horizonDesc =
      horizon === 'weekly' || horizon === 'WoW'
        ? isSwahili ? 'Kulinganisha na wiki iliyopita (Week-over-Week)' : 'Week-over-Week comparison'
        : horizon === 'monthly' || horizon === 'MoM'
        ? isSwahili ? 'Kulinganisha na mwezi uliopita (Month-over-Month)' : 'Month-over-Month comparison'
        : horizon === 'quarterly' || horizon === 'QoQ'
        ? isSwahili ? 'Kulinganisha na robo mwaka iliyopita (Quarter-over-Quarter)' : 'Quarter-over-Quarter comparison'
        : isSwahili ? 'Kulinganisha na masafa ya tarehe maalum (Custom Range comparison)' : 'Custom date range performance comparison';

    const directionDesc = isNeutral
      ? isSwahili ? 'Imetulia bila mabadiliko' : 'Flat compared to prior period'
      : isPositive
      ? `${isSwahili ? 'Ongezeko la' : 'Increase of'} +${value}${suffix}`
      : `${isSwahili ? 'Kupungua kwa' : 'Decrease of'} ${value}${suffix}`;

    return `${directionDesc} (${horizonDesc})`;
  };

  const tag = getHorizonTag();
  const formattedValue = isPositive ? `+${value}${suffix}` : `${value}${suffix}`;

  // Sizing styles
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  }[size];

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  }[size];

  // Colors
  let colorClasses = '';
  if (isNeutral) {
    colorClasses = showBackground
      ? 'bg-slate-800/60 text-slate-300 border-slate-700/50'
      : 'text-slate-400';
  } else if (isGood) {
    // Green up arrow
    colorClasses = showBackground
      ? 'bg-[#00C46A]/15 text-[#00E67A] border-[#00C46A]/30'
      : 'text-[#00E67A]';
  } else {
    // Red down arrow
    colorClasses = showBackground
      ? 'bg-red-950/50 text-red-400 border-red-500/30'
      : 'text-red-400';
  }

  const generatedTestId =
    testId ||
    (isNeutral
      ? 'trend-indicator-neutral'
      : isGood
      ? 'trend-indicator-up'
      : 'trend-indicator-down');

  return (
    <span
      data-testid={generatedTestId}
      title={getFullTooltip()}
      className={`inline-flex items-center font-bold font-mono rounded-md transition-all select-none ${
        showBackground ? 'border shadow-xs' : ''
      } ${sizeClasses} ${colorClasses} ${className}`}
    >
      {isNeutral ? (
        <Minus className={`${iconSizes} shrink-0`} />
      ) : isPositive ? (
        <TrendingUp className={`${iconSizes} shrink-0 stroke-[2.5]`} />
      ) : (
        <TrendingDown className={`${iconSizes} shrink-0 stroke-[2.5]`} />
      )}
      <span>{formattedValue}</span>
      {tag && (
        <span
          className={`text-[9px] font-sans font-semibold tracking-wide uppercase opacity-85 ml-0.5 ${
            isGood ? 'text-emerald-300' : isNeutral ? 'text-slate-300' : 'text-red-300'
          }`}
        >
          {tag}
        </span>
      )}
    </span>
  );
};
