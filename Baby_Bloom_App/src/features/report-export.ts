import type { DiaryReport } from '../domain/reports';
import type { TextKey } from '../lib/i18n';
export async function exportReport(_report: DiaryReport, _t: (key: TextKey) => string) {
  throw new Error('export_unavailable');
}
