import { Pressable, View, Text } from 'react-native';
import { MotionSurface } from './motion';
import { Copy } from './ui';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';
import { stoolColors } from '../domain/events';
const swatches = {
  yellow: '#E7BC38',
  brown: '#805338',
  green: '#739652',
  black: '#202020',
  red: '#CB4D57',
  pale_white_grey: '#E0DFD7',
  other: '#AFA4C2',
  unknown: '#64748B',
};
export function StoolColorChoice({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const { t } = useStore();
  const theme = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <Copy>{t('stool_color')}</Copy>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {[null, ...stoolColors].map((color, index) => (
          <MotionSurface key={color ?? 'empty'} delay={index * 0.03} compact hover>
            <Pressable
              accessibilityRole="radio"
              accessibilityLabel={t(color ?? 'optional')}
              accessibilityState={{ selected: color === value }}
              onPress={() => onChange(color)}
              style={{
                width: 110,
                minHeight: 92,
                borderRadius: 18,
                padding: 12,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: theme.color.paper,
                borderWidth: color === value ? 2 : 1,
                borderColor: color === value ? theme.color.brand : theme.color.border,
              }}
            >
              <View
                accessible={false}
                style={{
                  height: 28,
                  width: 28,
                  borderRadius: 14,
                  backgroundColor: color ? swatches[color] : theme.color.elevated,
                  borderWidth: 1,
                  borderColor: theme.color.border,
                }}
              />
              <Text style={{ color: theme.color.ink, fontSize: 13, textAlign: 'center' }}>
                {t(color ?? 'optional')}
              </Text>
            </Pressable>
          </MotionSurface>
        ))}
      </View>
    </View>
  );
}
