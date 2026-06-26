import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import Icon from '../AppIcon';
import { cn } from '../../utils/cn';
import { newUserService } from '../../services/newUserService';

const FORM_ID = 'set-password-form';
const MIN_LENGTH = 8;

// The two ways an admin can set a password. `value` maps to the API's `permanent`
// flag (POST /users/{id}/set-password).
const MODES = [
  {
    value: false,
    icon: 'KeyRound',
    title: 'Require change at next login',
    description:
      'User signs in with this temporary password, then is prompted to set their own. Recommended.',
  },
  {
    value: true,
    icon: 'Lock',
    title: 'Set permanently',
    description: 'User can sign in with this password right away — no change required.',
  },
];

// Cognito-friendly random password: guarantees an upper, lower, digit and symbol
// so it satisfies a typical user-pool policy. Avoids look-alike characters.
const generatePassword = () => {
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const symbols = '!@#$%&*?';
  const all = lower + upper + digits + symbols;
  const pick = (set) => set[Math.floor(Math.random() * set.length)];
  let pwd = pick(upper) + pick(lower) + pick(digits) + pick(symbols);
  for (let i = 0; i < 8; i += 1) pwd += pick(all);
  // Shuffle so the guaranteed chars aren't always in the same positions.
  return pwd
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
};

/**
 * Admin "set password" dialog — a fallback for when Cognito's invite/reset email
 * doesn't reach the user. Lets the admin either hard-set a usable password or set
 * a temporary one the user must change at next login.
 *
 * Props:
 *  - isOpen    : boolean
 *  - onClose   : () => void
 *  - user      : { id, firstName, lastName, username, email }  (the target user)
 *  - onSuccess : (permanent: boolean) => void   (optional; fired after a successful set)
 */
const SetPasswordModal = ({ isOpen, onClose, user, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [permanent, setPermanent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset transient state every time the dialog opens.
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setConfirm('');
      setPermanent(false);
      setLoading(false);
      setError('');
    }
  }, [isOpen]);

  const userName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email || `User #${user.id}`
    : '';

  const handleGenerate = () => {
    const pwd = generatePassword();
    setPassword(pwd);
    setConfirm(pwd);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || loading) return;
    setError('');

    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: apiError } = await newUserService.setUserPassword(user.id, password, permanent);
    setLoading(false);

    if (apiError) {
      setError(
        (typeof apiError === 'string' ? apiError : apiError.message) ||
          'Failed to set password. Cognito may require a stronger password.'
      );
      return;
    }

    onSuccess?.(permanent);
    onClose?.();
  };

  const footer = (
    <>
      <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
        Cancel
      </Button>
      <Button type="submit" form={FORM_ID} loading={loading} disabled={loading}>
        Set password
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen && !!user}
      onClose={loading ? () => {} : onClose}
      title="Set password"
      description={userName ? `For ${userName}` : undefined}
      size="md"
      footer={footer}
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
          <Icon name="Info" size={16} className="mt-0.5 flex-shrink-0" />
          <span>
            Use this when the user never received their Cognito invite or reset email. It sets the
            password directly — no email is sent.
          </span>
        </div>

        {/* Mode picker */}
        <div className="space-y-2">
          {MODES.map((mode) => {
            const selected = permanent === mode.value;
            return (
              <button
                key={String(mode.value)}
                type="button"
                onClick={() => setPermanent(mode.value)}
                disabled={loading}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors disabled:opacity-60',
                  selected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
                    selected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Icon name={mode.icon} size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{mode.title}</span>
                  <span className="block text-xs text-muted-foreground">{mode.description}</span>
                </span>
                <span
                  className={cn(
                    'mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border',
                    selected ? 'border-primary' : 'border-muted-foreground/40'
                  )}
                >
                  {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
                </span>
              </button>
            );
          })}
        </div>

        {/* Password fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium leading-none text-foreground">
                New Password <span className="text-destructive">*</span>
              </span>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
              >
                Generate
              </button>
            </div>
            <Input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder={`At least ${MIN_LENGTH} characters`}
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <Input
            type="password"
            label="Confirm Password"
            required
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              if (error) setError('');
            }}
            placeholder="Re-enter the password"
            autoComplete="new-password"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <Icon name="AlertCircle" size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>
    </Modal>
  );
};

export default SetPasswordModal;
