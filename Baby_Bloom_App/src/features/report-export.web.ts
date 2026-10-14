import type { DiaryReport } from '../domain/reports';
import { nutrientKeys } from '../domain/journal';
import type { TextKey } from '../lib/i18n';
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
export async function exportReport(report: DiaryReport, t: (key: TextKey) => string) {
  const text = (x: number, y: number, value: string, size = 18) =>
    `<text x="${x}" y="${y}" fill="#372348" font-size="${size}" font-family="Arial,sans-serif">${escape(value)}</text>`;
  const max = Math.max(1, ...report.daily.map((d) => d.calories ?? 0));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="1080" viewBox="0 0 1100 1080"><rect width="1100" height="1080" rx="32" fill="#FFF5FD"/>${text(60, 75, 'BabyBloom · ' + t('reports'), 32)}${text(60, 120, report.startDay + ' — ' + report.endDay + ' · ' + report.timezone)}${text(60, 170, t('known_totals'), 25)}${nutrientKeys.map((key, i) => text(60 + (i % 2) * 490, 220 + Math.floor(i / 2) * 55, t(key) + ': ' + (report.totals[key].total ?? t('not_recorded')))).join('')}${text(60, 465, t('logged_days') + ': ' + report.coverage.loggedDays + ' / ' + report.days)}${text(60, 510, t('nutrition_entries') + ': ' + report.coverage.nutritionCount + ' / ' + report.coverage.portions)}${text(60, 565, t('calories_chart'), 24)}${report.daily
    .map((d, i) => {
      const width = 960 / report.days;
      const height = ((d.calories ?? 0) / max) * 210;
      return `<rect x="${60 + i * width}" y="${805 - height}" width="${width - 5}" height="${d.calories === null ? 3 : Math.max(2, height)}" rx="3" fill="${d.calories === null ? '#D8CCE2' : '#9333EA'}"/>${i % Math.ceil(report.days / 7) === 0 ? text(60 + i * width, 840, d.day.slice(5), 13) : ''}`;
    })
    .join(
      '',
    )}${text(60, 905, t('adequacy_unknown'), 22)}${text(60, 955, t('age_days') + ': ' + report.context.chronologicalDays)}${text(60, 995, t('corrected_age_days') + ': ' + (report.context.correctedDays ?? t('not_recorded')))}${text(60, 1040, 'BabyBloom · ' + t('report_coverage'), 14)}</svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `babybloom-report-${report.endDay}-${report.days}d.svg`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
