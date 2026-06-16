import React from 'react';
import Icon from '../AppIcon';
import DateTimePicker from '../ui/DateTimePicker';
import { WEEKDAYS } from '../../utils/timetable';

// Editor for a batch timetable: a list of slots, each a set of weekdays plus a
// start/end time. `value` is a controlled TimetableSlot[] ({ days, startTime, endTime });
// `onChange` receives the updated array. Use cleanTimetable() before sending to the API.

const TimetableEditor = ({ value = [], onChange, disabled = false }) => {
  const slots = Array.isArray(value) ? value : [];

  const updateSlot = (index, patch) =>
    onChange?.(slots.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const toggleDay = (index, day) => {
    const slot = slots[index] || {};
    const days = Array.isArray(slot.days) ? slot.days : [];
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
    updateSlot(index, { days: next });
  };

  const addSlot = () => onChange?.([...slots, { days: [], startTime: '', endTime: '' }]);
  const removeSlot = (index) => onChange?.(slots.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      {slots.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No schedule added yet. Add a slot to set this batch's timetable.
        </p>
      )}

      {slots.map((slot, index) => {
        const days = Array.isArray(slot.days) ? slot.days : [];
        return (
          <div key={index} className="border border-border rounded-md p-3 bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Slot {index + 1}</span>
              <button
                type="button"
                onClick={() => removeSlot(index)}
                disabled={disabled}
                title="Remove slot"
                className="text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                <Icon name="Trash2" size={16} />
              </button>
            </div>

            {/* Day toggles */}
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((d) => {
                const on = days.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(index, d.value)}
                    disabled={disabled}
                    className={
                      'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors disabled:opacity-50 ' +
                      (on
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted')
                    }
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>

            {/* Time range */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Start</label>
                <DateTimePicker
                  mode="time"
                  value={slot.startTime || ''}
                  onChange={(v) => updateSlot(index, { startTime: v })}
                  disabled={disabled}
                />
              </div>
              <span className="text-muted-foreground pt-5">–</span>
              <div className="flex-1">
                <label className="block text-xs font-medium text-muted-foreground mb-1">End</label>
                <DateTimePicker
                  mode="time"
                  value={slot.endTime || ''}
                  onChange={(v) => updateSlot(index, { endTime: v })}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addSlot}
        disabled={disabled}
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline disabled:opacity-50"
      >
        <Icon name="Plus" size={16} />
        Add slot
      </button>
    </div>
  );
};

export default TimetableEditor;
