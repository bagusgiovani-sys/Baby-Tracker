import { View } from 'react-native';
import { Copy } from './ui';
import type { MeasurementPoint } from '../domain/baby-overview';

export type MeasurementTrendProps = {
  points: MeasurementPoint[];
  label: string;
  locale: string;
  timezone: string;
};
export function MeasurementTrend({ points, label, locale, timezone }: MeasurementTrendProps) {
  const date = new Intl.DateTimeFormat(locale, { timeZone: timezone, dateStyle: 'medium' });
  return (
    <View accessibilityLabel={label} style={{ gap: 10 }}>
      {points.slice(-3).map((point, index) => (
        <Copy key={index}>
          {date.format(new Date(point.at))}: {new Intl.NumberFormat(locale).format(point.value)}
        </Copy>
      ))}
    </View>
  );
}
