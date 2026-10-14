import { z } from 'zod';
export const nutrientKeys = [
  'calories_kcal',
  'protein_g',
  'carbs_g',
  'fat_g',
  'fiber_g',
  'iron_mg',
  'calcium_mg',
] as const;
export type NutrientKey = (typeof nutrientKeys)[number];
const amount = z.number().finite().min(0).max(100000).nullable();
export const nutritionSchema = z
  .object({
    source: z.string().trim().min(1).max(200),
    calories_kcal: amount,
    protein_g: amount,
    carbs_g: amount,
    fat_g: amount,
    fiber_g: amount,
    iron_mg: amount,
    calcium_mg: amount,
  })
  .strict();
export type Nutrition = z.infer<typeof nutritionSchema>;
export const mealDetailSchema = z
  .object({
    food_name: z.string().trim().min(1).max(120),
    ingredients: z.string().max(1000).nullable(),
    portion_offered: z.number().finite().min(0).max(10000).nullable(),
    portion_consumed: z.number().finite().min(0).max(10000).nullable(),
    portion_unit: z.enum(['g', 'ml', 'tsp', 'tbsp', 'piece', 'serving']),
    texture: z
      .enum(['puree', 'mashed', 'soft_pieces', 'family_food', 'other', 'unknown'])
      .nullable(),
    first_exposure: z.enum(['yes', 'no', 'unsure']).nullable(),
    reaction: z.enum(['none_observed', 'observed', 'unsure', 'not_observed']).nullable(),
    nutrition: nutritionSchema.nullable(),
  })
  .strict()
  .refine(
    (d) =>
      d.portion_consumed === null ||
      d.portion_offered === null ||
      d.portion_consumed <= d.portion_offered,
    { message: 'consumed_exceeds_offered', path: ['portion_consumed'] },
  );
export const measurementDetailSchema = z
  .object({
    weight_kg: z.number().finite().positive().max(100).nullable(),
    length_cm: z.number().finite().positive().max(200).nullable(),
    head_cm: z.number().finite().positive().max(100).nullable(),
  })
  .strict()
  .refine((d) => Object.values(d).some((v) => v !== null), 'measurement_required');
export const checkinQuestions = [
  'overall',
  'feeding_vs_usual',
  'wet_diapers_vs_usual',
  'sleep_concern',
  'new_symptoms',
] as const;
export const checkinChoices = {
  overall: ['usual', 'different', 'unsure', 'not_answered'],
  feeding_vs_usual: ['as_usual', 'less', 'difficulty', 'unsure', 'not_answered'],
  wet_diapers_vs_usual: ['as_expected', 'fewer', 'unsure', 'not_answered'],
  sleep_concern: ['none_reported', 'yes', 'unsure', 'not_answered'],
  new_symptoms: ['none_reported', 'yes', 'unsure', 'not_answered'],
} as const;
export const checkinDetailSchema = z
  .object({
    local_day: z.iso.date(),
    timezone_at_entry: z.string().refine((v) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }, 'invalid_timezone'),
    state: z.enum(['draft', 'completed']),
    overall: z.enum(checkinChoices.overall),
    feeding_vs_usual: z.enum(checkinChoices.feeding_vs_usual),
    wet_diapers_vs_usual: z.enum(checkinChoices.wet_diapers_vs_usual),
    sleep_concern: z.enum(checkinChoices.sleep_concern),
    new_symptoms: z.enum(checkinChoices.new_symptoms),
    parent_concern: z.string().max(2000).nullable(),
  })
  .strict();
export type CheckinDetail = z.infer<typeof checkinDetailSchema>;
