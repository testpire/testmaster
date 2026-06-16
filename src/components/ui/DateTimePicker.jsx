import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../AppIcon';
import { cn } from '../../utils/cn';

/**
 * DateTimePicker — a styled, design-token-driven replacement for the native
 * <input type="date | datetime-local | time"> controls used across the app.
 *
 * The browser's native calendar popup can't be themed and looks different in
 * every browser; this renders a consistent, on-brand popover calendar / time
 * selector instead.
 *
 * Value contract matches the native inputs EXACTLY, so it is a true drop-in and
 * existing parse/format helpers (toDatetimeLocal / toUtcIso) keep working:
 *   mode="date"     -> "yyyy-MM-dd"
 *   mode="datetime" -> "yyyy-MM-ddTHH:mm"
 *   mode="time"     -> "HH:mm"
 *
 * The values are treated as plain wall-clock strings (no timezone conversion) —
 * identical to how a native input behaves — so callers stay in control of any
 * UTC handling. The popover is rendered through a portal to document.body and
 * positioned from the trigger's bounding box, so a modal's `overflow-y-auto`
 * never clips it.
 *
 * Props:
 *  - mode        : 'date' | 'datetime' | 'time'   (default 'date')
 *  - value       : controlled string in the contract above ('' when empty)
 *  - onChange    : (nextValue: string) => void    — emits the same string format
 *  - disabled    : boolean
 *  - placeholder : string shown when empty
 *  - min / max   : optional bounds in the same string format (date/datetime)
 *  - minuteStep  : minute granularity for the time column (default 5)
 *  - error       : boolean — paints the trigger with the destructive border
 *  - className    : extra classes on the trigger (e.g. width overrides)
 *  - id / name   : forwarded to the trigger for label association
 */

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

const pad2 = (n) => String(n).padStart(2, '0');
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const range = (n) => Array.from({ length: n }, (_, i) => i);

const EMPTY = { year: null, month: null, day: null, hour: null, minute: null };

// Parse a contract string into discrete parts (no Date / timezone involved).
function parseValue(value, mode) {
  if (!value) return { ...EMPTY };
  const s = String(value);
  if (mode === 'time') {
    const m = s.match(/^(\d{1,2}):(\d{1,2})/);
    return m ? { ...EMPTY, hour: clamp(+m[1], 0, 23), minute: clamp(+m[2], 0, 59) } : { ...EMPTY };
  }
  const [datePart, timePart = ''] = s.split('T');
  const dm = datePart.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!dm) return { ...EMPTY };
  const parts = { year: +dm[1], month: clamp(+dm[2], 1, 12), day: clamp(+dm[3], 1, 31), hour: null, minute: null };
  if (mode === 'datetime') {
    const tm = timePart.match(/^(\d{1,2}):(\d{1,2})/);
    parts.hour = tm ? clamp(+tm[1], 0, 23) : 0;
    parts.minute = tm ? clamp(+tm[2], 0, 59) : 0;
  }
  return parts;
}

// Serialise parts back into the contract string for the active mode.
function emitValue(parts, mode) {
  if (mode === 'time') {
    if (parts.hour == null) return '';
    return `${pad2(parts.hour)}:${pad2(parts.minute ?? 0)}`;
  }
  if (parts.year == null) return '';
  const date = `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
  if (mode === 'datetime') return `${date}T${pad2(parts.hour ?? 0)}:${pad2(parts.minute ?? 0)}`;
  return date;
}

// Human-friendly text for the trigger.
function formatDisplay(parts, mode) {
  if (mode === 'time') {
    if (parts.hour == null) return '';
    return `${pad2(parts.hour)}:${pad2(parts.minute ?? 0)}`;
  }
  if (parts.year == null) return '';
  const date = `${parts.day} ${MONTHS_SHORT[parts.month - 1]} ${parts.year}`;
  if (mode === 'datetime') return `${date}, ${pad2(parts.hour ?? 0)}:${pad2(parts.minute ?? 0)}`;
  return date;
}

// 6-week grid (null = blank leading/trailing cell).
function buildMonthGrid(year, month0) {
  const startWeekday = new Date(year, month0, 1).getDay();
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const cells = range(startWeekday).map(() => null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const DateTimePicker = ({
  mode = 'date',
  value = '',
  onChange,
  disabled = false,
  placeholder,
  min,
  max,
  minuteStep = 5,
  error = false,
  className,
  id,
  name,
  ...rest
}) => {
  const hasDate = mode === 'date' || mode === 'datetime';
  const hasTime = mode === 'time' || mode === 'datetime';

  const parts = useMemo(() => parseValue(value, mode), [value, mode]);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState('days'); // 'days' | 'months'
  const [coords, setCoords] = useState(null);

  const today = useMemo(() => new Date(), [open]); // re-read each open
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-11

  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const hourRefs = useRef({});
  const minuteRefs = useRef({});

  const defaultPlaceholder =
    placeholder ?? (mode === 'time' ? 'Select time' : mode === 'datetime' ? 'Select date & time' : 'Select date');

  // When opening, focus the calendar on the selected month (or today).
  useEffect(() => {
    if (!open) return;
    setView('days');
    if (parts.year != null) {
      setViewYear(parts.year);
      setViewMonth(parts.month - 1);
    } else {
      const now = new Date();
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Position the portal popover relative to the trigger; flip above when there
  // isn't room below. Recomputed on open and on scroll/resize while open.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const reposition = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const popH = popoverRef.current?.offsetHeight || 360;
      const below = r.bottom + 6;
      const flip = below + popH > window.innerHeight && r.top - 6 - popH > 0;
      const next = { left: r.left, top: flip ? r.top - 6 - popH : below, width: r.width };
      // Only update when the position actually moved — scroll events captured
      // from inside the popover (e.g. the time columns) would otherwise force a
      // redundant re-render on every scroll tick.
      setCoords((prev) =>
        prev && prev.left === next.left && prev.top === next.top && prev.width === next.width
          ? prev
          : next,
      );
    };
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, view]);

  // Outside-click + Escape close. Escape stops propagation so it closes the
  // popover before any enclosing modal's own Escape handler fires.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (popoverRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  // Centre the selected hour/minute in their scroll columns when opening.
  useEffect(() => {
    if (!open || !hasTime) return;
    const h = parts.hour ?? new Date().getHours();
    const m = parts.minute ?? 0;
    hourRefs.current[h]?.scrollIntoView({ block: 'center' });
    minuteRefs.current[m - (m % minuteStep)]?.scrollIntoView({ block: 'center' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const dayDisabled = (day) => {
    if (!day) return true;
    const ds = `${viewYear}-${pad2(viewMonth + 1)}-${pad2(day)}`;
    if (min && ds < String(min).slice(0, 10)) return true;
    if (max && ds > String(max).slice(0, 10)) return true;
    return false;
  };

  const isSelectedDay = (day) =>
    day && parts.year === viewYear && parts.month === viewMonth + 1 && parts.day === day;

  const isToday = (day) =>
    day && today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;

  const emit = (next) => onChange?.(emitValue(next, mode));

  const handleDayClick = (day) => {
    const next = { ...parts, year: viewYear, month: viewMonth + 1, day };
    if (mode === 'datetime' && next.hour == null) {
      next.hour = 0;
      next.minute = 0;
    }
    emit(next);
    if (mode === 'date') setOpen(false);
  };

  const handleTimePart = (key, val) => {
    const next = { ...parts, [key]: val };
    if (mode === 'datetime' && next.year == null) {
      const now = new Date();
      next.year = now.getFullYear();
      next.month = now.getMonth() + 1;
      next.day = now.getDate();
    }
    if (next.hour == null) next.hour = key === 'hour' ? val : new Date().getHours();
    if (next.minute == null) next.minute = key === 'minute' ? val : 0;
    emit(next);
  };

  const goMonth = (delta) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  };

  const setNow = () => {
    const now = new Date();
    const next = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: Math.round(now.getMinutes() / minuteStep) * minuteStep % 60,
    };
    emit(next);
    setViewYear(next.year);
    setViewMonth(next.month - 1);
    if (mode === 'date') setOpen(false);
  };

  const clear = () => {
    onChange?.('');
    setOpen(false);
  };

  const triggerIcon = hasDate ? 'Calendar' : 'Clock';
  const display = formatDisplay(parts, mode);

  const timeColumn = (label, values, selected, refs, onPick) => (
    <div className="flex flex-col min-w-0">
      <span className="text-[11px] font-medium text-muted-foreground text-center mb-1">{label}</span>
      <div className="h-40 w-14 overflow-y-auto rounded-md border border-border bg-background/60 py-1 scrollbar-thin">
        {values.map((v) => {
          const on = selected === v;
          return (
            <button
              key={v}
              type="button"
              ref={(el) => { refs.current[v] = el; }}
              onClick={() => onPick(v)}
              className={cn(
                'block w-full px-2 py-1 text-sm tabular-nums rounded transition-colors',
                on
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-foreground hover:bg-muted',
              )}
            >
              {pad2(v)}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        name={name}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-left text-sm text-foreground transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-destructive focus:ring-destructive/20' : 'border-border',
          open && 'ring-2 ring-primary/20 border-primary',
          className,
        )}
        {...rest}
      >
        <span className={cn('truncate', !display && 'text-muted-foreground')}>
          {display || defaultPlaceholder}
        </span>
        <Icon name={triggerIcon} size={16} className="flex-shrink-0 text-muted-foreground" />
      </button>

      {open && coords && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 1100 }}
          className="animate-scale-in rounded-lg border border-border bg-popover text-popover-foreground shadow-xl p-3"
        >
          <div className={cn('flex gap-3', mode === 'datetime' && 'flex-col sm:flex-row')}>
            {hasDate && (
              <div className="w-[16.5rem]">
                {/* Header: month nav + month/year toggle */}
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => (view === 'days' ? goMonth(-1) : setViewYear((y) => y - 1))}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Previous"
                  >
                    <Icon name="ChevronLeft" size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setView((v) => (v === 'days' ? 'months' : 'days'))}
                    className="px-2 py-1 rounded-md text-sm font-semibold text-foreground hover:bg-muted"
                  >
                    {view === 'days' ? `${MONTHS[viewMonth]} ${viewYear}` : viewYear}
                  </button>
                  <button
                    type="button"
                    onClick={() => (view === 'days' ? goMonth(1) : setViewYear((y) => y + 1))}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Next"
                  >
                    <Icon name="ChevronRight" size={18} />
                  </button>
                </div>

                {view === 'days' ? (
                  <>
                    <div className="grid grid-cols-7 mb-1">
                      {WEEKDAYS.map((w) => (
                        <span key={w} className="text-center text-[11px] font-medium text-muted-foreground py-1">
                          {w}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                      {grid.map((day, i) => {
                        if (!day) return <span key={i} />;
                        const sel = isSelectedDay(day);
                        const disabledDay = dayDisabled(day);
                        return (
                          <button
                            key={i}
                            type="button"
                            disabled={disabledDay}
                            onClick={() => handleDayClick(day)}
                            className={cn(
                              'h-8 w-8 mx-auto flex items-center justify-center rounded-md text-sm tabular-nums transition-colors',
                              sel && 'bg-primary text-primary-foreground font-semibold',
                              !sel && !disabledDay && 'text-foreground hover:bg-muted',
                              !sel && isToday(day) && 'ring-1 ring-inset ring-primary/50 font-semibold',
                              disabledDay && 'text-muted-foreground/40 cursor-not-allowed',
                            )}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 py-1">
                    {MONTHS_SHORT.map((m, idx) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => { setViewMonth(idx); setView('days'); }}
                        className={cn(
                          'py-2 rounded-md text-sm transition-colors',
                          idx === viewMonth
                            ? 'bg-primary text-primary-foreground font-semibold'
                            : 'text-foreground hover:bg-muted',
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {hasTime && (
              <div className={cn('flex flex-col', mode === 'datetime' && 'sm:border-l sm:border-border sm:pl-3')}>
                <div className="flex items-start justify-center gap-2">
                  {timeColumn('Hour', range(24), parts.hour, hourRefs, (v) => handleTimePart('hour', v))}
                  <span className="text-muted-foreground self-center pt-5">:</span>
                  {timeColumn(
                    'Min',
                    range(Math.ceil(60 / minuteStep)).map((i) => i * minuteStep),
                    parts.minute,
                    minuteRefs,
                    (v) => handleTimePart('minute', v),
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={setNow}
              className="text-xs font-medium text-primary hover:underline"
            >
              {mode === 'time' ? 'Now' : mode === 'datetime' ? 'Now' : 'Today'}
            </button>
            <div className="flex items-center gap-3">
              {value && (
                <button
                  type="button"
                  onClick={clear}
                  className="text-xs font-medium text-muted-foreground hover:text-destructive"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-foreground hover:text-primary"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

export default DateTimePicker;
