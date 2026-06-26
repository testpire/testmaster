import React from 'react';
import Icon from '../AppIcon';
import Button from '../ui/Button';
import { cn } from '../../utils/cn';

// Shown when a student opens /test-taking/:id or /test-result/:id with an
// attempt id that isn't theirs (or doesn't exist). Deliberately generic — it
// never echoes the backend's raw "Attempt not found with ID: …" message. The
// page also auto-redirects to a safe list; this is the interim explanation and a
// manual way back. Layout-neutral: the caller sets outer sizing via `className`.
const AttemptUnavailable = ({
  title = "This attempt isn't available",
  message = 'It may have been removed, or it belongs to a different account. Taking you back…',
  backLabel = 'Go back',
  onBack,
  className,
}) => (
  <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
      <Icon name="SearchX" size={30} className="text-muted-foreground" />
    </div>
    <h1 className="font-display text-xl font-semibold text-foreground mb-1">{title}</h1>
    <p className="text-muted-foreground max-w-sm mb-5">{message}</p>
    {onBack && (
      <Button variant="default" onClick={onBack} iconName="ArrowLeft" iconPosition="left">
        {backLabel}
      </Button>
    )}
  </div>
);

export default AttemptUnavailable;
