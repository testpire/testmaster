import React, { useState, useMemo } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const AddStudentModal = ({ isOpen, onClose, onSubmit, batches = [], courses = [] }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Personal Details
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    photo: null,
    
    // Parent Information
    fatherName: '',
    motherName: '',
    parentPhone: '',
    parentEmail: '',
    emergencyContact: '',
    
    // Academic Details
    course: '',
    batch: '',
    previousEducation: '',
    subjects: [],
    
    // Login Credentials
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [photoPreview, setPhotoPreview] = useState(null);

  const steps = [
    { id: 1, title: 'Personal Details', icon: 'User' },
    { id: 2, title: 'Parent Information', icon: 'Users' },
    { id: 3, title: 'Academic Details', icon: 'BookOpen' },
    { id: 4, title: 'Login Credentials', icon: 'Key' }
  ];

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
  ];

  const courseOptions = useMemo(() => [
    ...(courses?.map(course => ({
      value: course?.id,
      label: course?.name
    })) || [])
  ], [courses]);

  const batchOptions = useMemo(() => [
    ...(batches?.map(batch => ({
      value: batch?.id,
      label: batch?.name
    })) || [])
  ], [batches]);

  const subjectOptions = [
    { value: 'physics', label: 'Physics' },
    { value: 'chemistry', label: 'Chemistry' },
    { value: 'mathematics', label: 'Mathematics' },
    { value: 'biology', label: 'Biology' },
    { value: 'english', label: 'English' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors?.[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePhotoUpload = (event) => {
    const file = event?.target?.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, photo: file }));
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e?.target?.result);
      reader?.readAsDataURL(file);
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!formData?.firstName?.trim()) newErrors.firstName = 'First name is required';
        if (!formData?.lastName?.trim()) newErrors.lastName = 'Last name is required';
        if (!formData?.email?.trim()) newErrors.email = 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(formData?.email)) newErrors.email = 'Invalid email format';
        if (!formData?.phone?.trim()) newErrors.phone = 'Phone number is required';
        if (!formData?.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
        if (!formData?.gender) newErrors.gender = 'Gender is required';
        break;
      case 2:
        if (!formData?.fatherName?.trim()) newErrors.fatherName = 'Father\'s name is required';
        if (!formData?.motherName?.trim()) newErrors.motherName = 'Mother\'s name is required';
        if (!formData?.parentPhone?.trim()) newErrors.parentPhone = 'Parent phone is required';
        break;
      case 3:
        if (!formData?.course) newErrors.course = 'Course is required';
        if (!formData?.batch) newErrors.batch = 'Batch is required';
        if (formData?.subjects?.length === 0) newErrors.subjects = 'At least one subject is required';
        break;
      case 4:
        if (!formData?.password) newErrors.password = 'Password is required';
        if (formData?.password?.length < 6) newErrors.password = 'Password must be at least 6 characters';
        if (formData?.password !== formData?.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    if (validateStep(4)) {
      const studentData = {
        ...formData,
        name: `${formData?.firstName} ${formData?.lastName}`,
        studentId: `STU${Date.now()}`,
        status: 'active',
        enrollmentDate: new Date()?.toISOString()?.split('T')?.[0]
      };
      onSubmit(studentData);
      onClose();
      resetForm();
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setFormData({
      firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', gender: '', address: '', photo: null,
      fatherName: '', motherName: '', parentPhone: '', parentEmail: '', emergencyContact: '',
      course: '', batch: '', previousEducation: '', subjects: [],
      password: '', confirmPassword: ''
    });
    setErrors({});
    setPhotoPreview(null);
  };

  if (!isOpen) return null;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            {/* Photo Upload */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                {photoPreview ? (
                  <Image
                    src={photoPreview}
                    alt="Student photo"
                    className="w-24 h-24 rounded-full object-cover border-4 border-border"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-muted border-4 border-border flex items-center justify-center">
                    <Icon name="User" size={32} className="text-muted-foreground" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1">
                  <Icon name="Camera" size={16} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Click to upload photo</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                type="text"
                value={formData?.firstName}
                onChange={(e) => handleInputChange('firstName', e?.target?.value)}
                error={errors?.firstName}
                required
              />
              <Input
                label="Last Name"
                type="text"
                value={formData?.lastName}
                onChange={(e) => handleInputChange('lastName', e?.target?.value)}
                error={errors?.lastName}
                required
              />
            </div>
            <Input
              label="Email Address"
              type="email"
              value={formData?.email}
              onChange={(e) => handleInputChange('email', e?.target?.value)}
              error={errors?.email}
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Phone Number"
                type="tel"
                value={formData?.phone}
                onChange={(e) => handleInputChange('phone', e?.target?.value)}
                error={errors?.phone}
                required
              />
              <Input
                label="Date of Birth"
                type="date"
                value={formData?.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e?.target?.value)}
                error={errors?.dateOfBirth}
                required
              />
            </div>
            <Select
              label="Gender"
              options={genderOptions}
              value={formData?.gender}
              onChange={(value) => handleInputChange('gender', value)}
              error={errors?.gender}
              required
            />
            <Input
              label="Address"
              type="text"
              value={formData?.address}
              onChange={(e) => handleInputChange('address', e?.target?.value)}
              placeholder="Enter complete address"
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Father's Name"
                type="text"
                value={formData?.fatherName}
                onChange={(e) => handleInputChange('fatherName', e?.target?.value)}
                error={errors?.fatherName}
                required
              />
              <Input
                label="Mother's Name"
                type="text"
                value={formData?.motherName}
                onChange={(e) => handleInputChange('motherName', e?.target?.value)}
                error={errors?.motherName}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Parent Phone"
                type="tel"
                value={formData?.parentPhone}
                onChange={(e) => handleInputChange('parentPhone', e?.target?.value)}
                error={errors?.parentPhone}
                required
              />
              <Input
                label="Parent Email"
                type="email"
                value={formData?.parentEmail}
                onChange={(e) => handleInputChange('parentEmail', e?.target?.value)}
                placeholder="Optional"
              />
            </div>
            <Input
              label="Emergency Contact"
              type="tel"
              value={formData?.emergencyContact}
              onChange={(e) => handleInputChange('emergencyContact', e?.target?.value)}
              placeholder="Alternative contact number"
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Course"
                options={courseOptions}
                value={formData?.course}
                onChange={(value) => handleInputChange('course', value)}
                error={errors?.course}
                required
              />
              <Select
                label="Batch"
                options={batchOptions}
                value={formData?.batch}
                onChange={(value) => handleInputChange('batch', value)}
                error={errors?.batch}
                required
              />
            </div>
            <Select
              label="Subjects"
              options={subjectOptions}
              value={formData?.subjects}
              onChange={(value) => handleInputChange('subjects', value)}
              error={errors?.subjects}
              multiple
              required
            />
            <Input
              label="Previous Education"
              type="text"
              value={formData?.previousEducation}
              onChange={(e) => handleInputChange('previousEducation', e?.target?.value)}
              placeholder="e.g., 12th Science from XYZ School"
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium text-foreground mb-2">Login Credentials</h4>
              <p className="text-sm text-muted-foreground">
                These credentials will be used by the student to access their account.
              </p>
            </div>
            <Input
              label="Password"
              type="password"
              value={formData?.password}
              onChange={(e) => handleInputChange('password', e?.target?.value)}
              error={errors?.password}
              required
              description="Minimum 6 characters"
            />
            <Input
              label="Confirm Password"
              type="password"
              value={formData?.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e?.target?.value)}
              error={errors?.confirmPassword}
              required
            />
            <div className="bg-success/10 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <Icon name="CheckCircle" size={16} className="text-success mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-success">Ready to Create Account</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Student will receive login credentials via email after account creation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[1050] flex items-center justify-center p-4">
      <div className="bg-card rounded-lg border border-border shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Add New Student</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Step {currentStep} of {steps?.length}: {steps?.[currentStep - 1]?.title}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={20} />
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            {steps?.map((step, index) => (
              <div key={step?.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  currentStep >= step?.id 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : 'border-border text-muted-foreground'
                }`}>
                  {currentStep > step?.id ? (
                    <Icon name="Check" size={16} />
                  ) : (
                    <Icon name={step?.icon} size={16} />
                  )}
                </div>
                {index < steps?.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    currentStep > step?.id ? 'bg-primary' : 'bg-border'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <Icon name="ChevronLeft" size={16} />
            Previous
          </Button>

          <div className="flex space-x-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            {currentStep < 4 ? (
              <Button onClick={handleNext}>
                Next
                <Icon name="ChevronRight" size={16} />
              </Button>
            ) : (
              <Button onClick={handleSubmit}>
                <Icon name="UserPlus" size={16} />
                Create Student
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddStudentModal;