import { View } from 'react-native';
import { useState } from 'react';
import { Button, Copy, Field } from '../components/ui';
import { useStore } from '../lib/store';
import { nutrientKeys, type Nutrition } from '../domain/journal';
export type NutritionDraft = {
  enabled: boolean;
  source: string;
  values: Record<(typeof nutrientKeys)[number], string>;
};
export function nutritionDraft(value?: Nutrition | null): NutritionDraft {
  return {
    enabled: !!value,
    source: value?.source ?? '',
    values: Object.fromEntries(
      nutrientKeys.map((k) => [
        k,
        value?.[k] === null || value?.[k] === undefined ? '' : String(value[k]),
      ]),
    ) as NutritionDraft['values'],
  };
}
export function parseNutrition(draft: NutritionDraft) {
  return draft.enabled
    ? {
        source: draft.source.trim(),
        ...Object.fromEntries(nutrientKeys.map((k) => [k, numberOrNull(draft.values[k])])),
      }
    : null;
}
export const numberOrNull = (value: string) =>
  value.trim() ? Number(value.replace(',', '.')) : null;
export function NutritionFields({
  value,
  onChange,
}: {
  value: NutritionDraft;
  onChange: (value: NutritionDraft) => void;
}) {
  const { t } = useStore();
  const [open, setOpen] = useState(value.enabled);
  return (
    <View style={{ gap: 16 }}>
      <Button
        title={t('nutrition')}
        secondary
        onPress={() => {
          setOpen(!open);
          if (!open) onChange({ ...value, enabled: true });
        }}
      />
      {open && (
        <>
          <Copy muted>{t('nutrition_hint')}</Copy>
          <Field
            label={t('nutrition_source')}
            value={value.source}
            onChangeText={(source) => onChange({ ...value, source, enabled: true })}
          />
          {nutrientKeys.map((key) => (
            <Field
              key={key}
              label={t(key)}
              value={value.values[key]}
              keyboardType="decimal-pad"
              onChangeText={(text) =>
                onChange({ ...value, enabled: true, values: { ...value.values, [key]: text } })
              }
            />
          ))}
          <Button
            title={t('not_recorded')}
            secondary
            onPress={() => {
              onChange(nutritionDraft());
              setOpen(false);
            }}
          />
        </>
      )}
    </View>
  );
}
