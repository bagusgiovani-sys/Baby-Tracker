import { useState } from 'react';
import { View } from 'react-native';
import { Choice, Copy, Feedback, Field, styles } from './ui';
import { useStore } from '../lib/store';
import { dayKey, wallTimeCandidates } from '../domain/time';
function parts(value: string, timezone: string) {
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime())) return null;
  return {
    day: dayKey(instant, timezone),
    time: new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(instant),
  };
}
export function TimestampField({
  label,
  value,
  onChange,
  error,
  optional = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  optional?: boolean;
}) {
  const { t, baby } = useStore();
  const timezone = baby?.timezone ?? 'Asia/Jakarta';
  const initial = parts(value, timezone);
  const [day, setDay] = useState(initial?.day ?? '');
  const [time, setTime] = useState(initial?.time ?? '');
  const [ambiguous, setAmbiguous] = useState<string[]>([]);
  const [previous, setPrevious] = useState({ value, timezone });
  // Adjust only when the parent value changes; retain partially typed input.
  if (previous.value !== value || previous.timezone !== timezone) {
    setPrevious({ value, timezone });
    const display = parts(value, timezone);
    if (display) {
      setDay(display.day);
      setTime(display.time);
    } else if (!value) {
      setDay('');
      setTime('');
    }
  }
  const change = (nextDay: string, nextTime: string) => {
    setDay(nextDay);
    setTime(nextTime);
    if (optional && !nextDay && !nextTime) {
      setAmbiguous([]);
      onChange('');
      return;
    }
    const candidates = wallTimeCandidates(nextDay, nextTime, timezone);
    setAmbiguous(candidates.length > 1 ? candidates : []);
    onChange(candidates.length === 1 ? candidates[0]! : 'invalid');
  };
  return (
    <View style={{ gap: 8 }}>
      <Copy>
        {label} · {timezone}
      </Copy>
      <View style={styles.row}>
        <View style={{ flexGrow: 1, flexBasis: 170 }}>
          <Field
            label={`${label} · ${t('date')}`}
            value={day}
            onChangeText={(text) => change(text, time)}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
          />
        </View>
        <View style={{ flexGrow: 1, flexBasis: 110 }}>
          <Field
            label={`${label} · ${t('time')}`}
            value={time}
            onChangeText={(text) => change(day, text)}
            placeholder="HH:mm"
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>
      {ambiguous.length > 1 && (
        <Choice
          label={t('ambiguous_time')}
          value={value}
          choices={ambiguous.map((instant, index) => ({
            value: instant,
            label: t(index === 0 ? 'earlier_time' : 'later_time'),
          }))}
          onChange={(instant) => {
            if (instant) onChange(instant);
          }}
        />
      )}
      {error && <Feedback message={error} />}
    </View>
  );
}
