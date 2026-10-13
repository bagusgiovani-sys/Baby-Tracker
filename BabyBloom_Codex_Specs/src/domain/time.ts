export function dayKey(instant: Date, timezone: string): string {
    const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instant);
    return ['year', 'month', 'day'].map(type => parts.find(p => p.type === type)!.value).join('-');
}
function midnight(day: string, timezone: string): number {
    const target = Date.parse(`${day}T00:00:00Z`);
    let guess = target;
    const format = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    for (let i = 0; i < 6; i++) {
        const parts = format.formatToParts(new Date(guess));
        const get = (type: string) => Number(parts.find(p => p.type === type)!.value);
        const observed = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
        if (observed === target)
            return guess;
        guess += target - observed;
    }
    // Some IANA zones skip midnight; search for the first instant of that calendar day.
    let lo = target - 36 * 3600000;
    let hi = target + 36 * 3600000;
    while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2);
        if (dayKey(new Date(mid), timezone) < day)
            lo = mid;
        else
            hi = mid;
    }
    if (dayKey(new Date(hi), timezone) !== day)
        throw new Error('invalid_day');
    return hi;
}
export function dayRange(day: string, timezone: string): [
    number,
    number
] {
    const parsed = Date.parse(`${day}T00:00:00Z`);
    if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== day)
        throw new Error('invalid_day');
    const next = new Date(parsed + 86400000).toISOString().slice(0, 10);
    return [midnight(day, timezone), midnight(next, timezone)];
}
export function timeLabel(instant: string, timezone: string, locale: string, hour12 = false): string {
    return new Intl.DateTimeFormat(locale, { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12 }).format(new Date(instant));
}
export function wallTimeCandidates(day: string, clock: string, timezone: string): string[] {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(clock))
        return [];
    const target = Date.parse(`${day}T${clock}:00Z`);
    if (!Number.isFinite(target) || new Date(target).toISOString().slice(0, 10) !== day)
        return [];
    const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    const localMillis = (instant: number) => {
        const parts = formatter.formatToParts(new Date(instant));
        const number = (type: string) => Number(parts.find(p => p.type === type)!.value);
        return Date.UTC(number('year'), number('month') - 1, number('day'), number('hour'), number('minute'), number('second'));
    };
    const offsets = new Set<number>();
    for (let hours = -36; hours <= 36; hours += 6) {
        const sample = target + hours * 3600000;
        offsets.add(localMillis(sample) - sample);
    }
    return [...offsets].map(offset => target - offset).filter(instant => localMillis(instant) === target).sort((a, b) => a - b).map(instant => new Date(instant).toISOString());
}
export function ageOn(birth: string, day: string): {
    months: number;
    days: number;
} {
    const birthDate = new Date(`${birth}T00:00:00Z`);
    const current = new Date(`${day}T00:00:00Z`);
    let months = (current.getUTCFullYear() - birthDate.getUTCFullYear()) * 12 + current.getUTCMonth() - birthDate.getUTCMonth();
    const anniversary = (count: number) => {
        const first = new Date(Date.UTC(birthDate.getUTCFullYear(), birthDate.getUTCMonth() + count, 1));
        const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
        return Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(birthDate.getUTCDate(), last));
    };
    if (anniversary(months) > current.getTime())
        months--;
    return { months: Math.max(0, months), days: Math.max(0, Math.floor((current.getTime() - anniversary(months)) / 86400000)) };
}
