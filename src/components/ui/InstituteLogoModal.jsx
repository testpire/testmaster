import React, { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import Icon from '../AppIcon';
import { newInstituteService } from '../../services/newInstituteService';

// Mirrors the backend's accepted types for /institutes/{id}/logo.
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

const validate = (file) => {
  if (!file) return 'No file selected';
  if (!ALLOWED_TYPES.includes(file.type)) return 'Only JPEG, PNG, WEBP, or GIF images are allowed';
  if (file.size > MAX_SIZE_BYTES) return 'Image must be 2 MB or smaller';
  return null;
};

/**
 * Admin-only dialog to upload, replace, or remove an institute's logo.
 * The caller is responsible for gating visibility by role — this component
 * assumes the user is allowed to edit. On success it calls
 * onSaved(updatedInstitute) with the institute returned by the API.
 */
const InstituteLogoModal = ({
  isOpen,
  onClose,
  instituteId,
  instituteName,
  currentLogoUrl = '',
  onSaved = () => {},
}) => {
  const [file, setFile] = useState(null);
  const [localPreview, setLocalPreview] = useState(''); // object URL for the picked file
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null); // 'upload' | 'remove' | null
  const inputRef = useRef(null);

  // Reset transient state whenever the dialog (re)opens.
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setLocalPreview('');
      setError('');
      setBusy(null);
    }
  }, [isOpen]);

  // Revoke the object URL when it changes or the modal unmounts (avoid leaks).
  useEffect(() => {
    if (!localPreview) return undefined;
    return () => URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  const previewUrl = localPreview || currentLogoUrl;

  const handleFileSelect = (e) => {
    const picked = e?.target?.files?.[0];
    if (e?.target) e.target.value = ''; // allow re-picking the same file
    if (!picked) return;
    const validationError = validate(picked);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setFile(picked);
    setLocalPreview(URL.createObjectURL(picked));
  };

  const handleUpload = async () => {
    if (!file || instituteId == null) return;
    setBusy('upload');
    setError('');
    const { data, error: uploadError } = await newInstituteService.uploadLogo(instituteId, file);
    setBusy(null);
    if (uploadError) {
      setError(uploadError.message || 'Failed to upload logo');
      return;
    }
    onSaved(data || { id: instituteId });
    onClose?.();
  };

  const handleRemove = async () => {
    if (instituteId == null) return;
    setBusy('remove');
    setError('');
    const { data, error: removeError } = await newInstituteService.deleteLogo(instituteId);
    setBusy(null);
    if (removeError) {
      setError(removeError.message || 'Failed to remove logo');
      return;
    }
    // Backend may return the cleared institute, or nothing — normalize to a
    // logo-less patch so callers can update immediately either way.
    onSaved({ ...(data || {}), id: data?.id ?? instituteId, logoUrl: '' });
    onClose?.();
  };

  const working = busy != null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={working ? () => {} : onClose}
      title="Institute logo"
      description={instituteName ? `Shown in the top bar for ${instituteName}` : 'Shown in the top bar'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={working}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleUpload}
            disabled={!file || working}
            loading={busy === 'upload'}
            iconName={busy === 'upload' ? null : 'Upload'}
          >
            {currentLogoUrl ? 'Save new logo' : 'Save logo'}
          </Button>
        </>
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileSelect}
        disabled={working}
      />

      <div className="flex flex-col items-center gap-4">
        {/* Preview / placeholder */}
        <div className="w-40 h-40 rounded-2xl border border-border bg-muted/40 flex items-center justify-center overflow-hidden">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Institute logo preview"
              className="max-w-full max-h-full object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className="flex flex-col items-center text-muted-foreground">
              <Icon name="Building2" size={36} />
              <span className="text-xs mt-2">No logo yet</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-center">
          <Button
            variant="outline"
            size="sm"
            disabled={working}
            onClick={() => inputRef.current?.click()}
            iconName="Image"
          >
            {previewUrl ? 'Choose a different image' : 'Choose image'}
          </Button>

          {currentLogoUrl && !localPreview && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive/80"
              disabled={working}
              loading={busy === 'remove'}
              onClick={handleRemove}
              iconName={busy === 'remove' ? null : 'Trash2'}
            >
              Remove logo
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          JPEG, PNG, WEBP, or GIF · up to 2&nbsp;MB. A square or wide image works best.
        </p>

        {error && (
          <div className="w-full flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            <Icon name="AlertCircle" size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default InstituteLogoModal;
