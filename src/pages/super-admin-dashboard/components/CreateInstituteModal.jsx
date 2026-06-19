import React, { useState } from 'react';
import { newInstituteService } from '../../../services/newInstituteService';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { cn } from '../../../utils/cn';

const FORM_ID = 'create-institute-form';

const EMPTY_FORM = {
  name: '',
  code: '',
  address: '',
  city: '',
  state: '',
  country: 'India',
  postalCode: '',
  phone: '',
  email: '',
  website: '',
  description: ''
};

const CreateInstituteModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!formData.name.trim() || !formData.code.trim() || !formData.email.trim()) {
      setError('Name, code, and email are required');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await newInstituteService.createInstitute(formData);
      if (error) {
        setError(error.message || 'Failed to create institute');
      } else {
        onSuccess(data);
        onClose();
        setFormData(EMPTY_FORM);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(''); // Clear error when user starts typing
  };

  const footer = (
    <>
      <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
        Cancel
      </Button>
      <Button type="submit" form={FORM_ID} loading={loading} disabled={loading}>
        Create Institute
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Institute"
      description="Add a new institute to the platform."
      size="lg"
      footer={footer}
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Institute Name"
            required
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter institute name"
            disabled={loading}
          />
          <Input
            label="Institute Code"
            required
            value={formData.code}
            onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
            placeholder="e.g., INST001"
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="email"
            label="Email"
            required
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="institute@example.com"
            disabled={loading}
          />
          <Input
            type="tel"
            label="Phone"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="Phone number"
            disabled={loading}
          />
        </div>

        <Input
          label="Address"
          value={formData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          placeholder="Full address"
          disabled={loading}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="City"
            value={formData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            placeholder="City"
            disabled={loading}
          />
          <Input
            label="State"
            value={formData.state}
            onChange={(e) => handleInputChange('state', e.target.value)}
            placeholder="State"
            disabled={loading}
          />
          <Input
            label="Postal Code"
            value={formData.postalCode}
            onChange={(e) => handleInputChange('postalCode', e.target.value)}
            placeholder="PIN Code"
            disabled={loading}
          />
        </div>

        <Input
          type="url"
          label="Website"
          value={formData.website}
          onChange={(e) => handleInputChange('website', e.target.value)}
          placeholder="https://example.com"
          disabled={loading}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none text-foreground">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className={cn(
              'flex w-full rounded-lg border border-input bg-card px-3.5 py-2 text-sm text-foreground',
              'ring-offset-background placeholder:text-muted-foreground transition-colors resize-y',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-1 focus-visible:border-primary',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            placeholder="Brief description about the institute"
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

export default CreateInstituteModal;
