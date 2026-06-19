import React, { useState, useEffect } from 'react';
import { newUserService } from '../../../services/newUserService';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const FORM_ID = 'user-action-form';

const UserActionModal = ({ isOpen, onClose, user, institutes, actionType, onSuccess }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    phone: '',
    instituteId: '',
    role: ''
  });
  const [selectedInstituteId, setSelectedInstituteId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize form data when user or modal opens
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        username: user.username || '',
        phone: user.phone || '',
        instituteId: user.instituteId || '',
        role: user.role || ''
      });
      setSelectedInstituteId(user.instituteId || '');
      setError('');
    }
  }, [isOpen, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      let message;

      switch (actionType) {
        case 'edit':
          // Validate required fields
          if (!formData.firstName.trim() || !formData.email.trim()) {
            setError('First name and email are required');
            setLoading(false);
            return;
          }

          result = await newUserService.updateUserProfile(user.id, {
            ...formData,
            fullName: `${formData.firstName} ${formData.lastName}`.trim()
          });
          message = 'User updated successfully';
          break;

        case 'move':
          if (!selectedInstituteId) {
            setError('Please select an institute');
            setLoading(false);
            return;
          }

          result = await newUserService.updateUserProfile(user.id, {
            ...formData,
            role: user.role,
            instituteId: selectedInstituteId
          });
          message = 'User moved to new institute successfully';
          break;

        case 'delete':
          result = await newUserService.deleteUser(user.id, user.role);
          message = 'User deleted successfully';
          break;

        default:
          setError('Unknown action type');
          setLoading(false);
          return;
      }

      if (result.error) {
        setError(result.error.message || `Failed to ${actionType} user`);
      } else {
        onSuccess(message);
      }
    } catch (err) {
      console.error(`Error during ${actionType}:`, err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const roleWord = user?.role === 'TEACHER' ? 'Teacher' : 'Student';

  const getModalTitle = () => {
    if (!user) return 'User Action';
    switch (actionType) {
      case 'edit': return `Edit ${roleWord}`;
      case 'move': return `Move ${roleWord}`;
      case 'delete': return `Delete ${roleWord}`;
      default: return 'User Action';
    }
  };

  const getActionButtonText = () => {
    switch (actionType) {
      case 'edit': return 'Update User';
      case 'move': return 'Move User';
      case 'delete': return 'Delete User';
      default: return 'Confirm';
    }
  };

  // Submit button styling follows the action's intent.
  const submitVariant =
    actionType === 'delete' ? 'destructive' :
    actionType === 'move' ? 'success' :
    'default';

  // Institutes available to move the user into (exclude their current one).
  const instituteOptions = (institutes || [])
    .filter((inst) => inst.id !== user?.instituteId)
    .map((inst) => ({
      value: inst.id,
      label: `${inst.name} (${inst.code || inst.instituteCode || 'N/A'})`
    }));

  const footer = (
    <>
      <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
        Cancel
      </Button>
      <Button type="submit" form={FORM_ID} variant={submitVariant} loading={loading} disabled={loading}>
        {getActionButtonText()}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen && !!user}
      onClose={onClose}
      title={getModalTitle()}
      size="md"
      footer={footer}
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        {actionType === 'delete' ? (
          // Delete confirmation
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <div className="flex items-start gap-3">
                <Icon name="AlertTriangle" size={20} className="mt-0.5 flex-shrink-0 text-destructive" />
                <div>
                  <p className="text-sm font-semibold text-destructive">
                    Are you sure you want to delete this user?
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    <span className="font-medium">{user.firstName} {user.lastName}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-sm text-muted-foreground">{user.role}</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. All user data will be permanently removed.
            </p>
          </div>
        ) : actionType === 'move' ? (
          // Move institute selection
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="text-sm text-foreground">
                Moving: <span className="font-medium">{user.firstName} {user.lastName}</span>
              </p>
              <p className="text-sm text-muted-foreground">{user.email} ({user.role})</p>
            </div>

            <Select
              label="Select New Institute"
              required
              placeholder="Select an institute"
              searchable
              options={instituteOptions}
              value={selectedInstituteId}
              onChange={(value) => setSelectedInstituteId(value)}
              disabled={loading}
            />
          </div>
        ) : (
          // Edit form
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                required
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="First name"
                disabled={loading}
              />
              <Input
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Last name"
                disabled={loading}
              />
            </div>

            <Input
              type="email"
              label="Email Address"
              required
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="email@example.com"
              disabled={loading}
            />

            <Input
              label="Username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="Username"
              disabled={loading}
            />

            <Input
              type="tel"
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Phone number"
              disabled={loading}
            />

            <Input
              label="Role"
              value={formData.role}
              disabled
              description="Role cannot be changed here."
            />
          </div>
        )}

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

export default UserActionModal;
