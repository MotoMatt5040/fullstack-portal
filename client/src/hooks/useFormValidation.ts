import { useState, useCallback, useMemo } from 'react';

export type ValidationRule<T> = {
  validate: (value: any, formData: T) => boolean;
  message: string;
};

export type FieldValidation<T> = {
  rules: ValidationRule<T>[];
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
};

export type ValidationSchema<T> = {
  [K in keyof T]?: FieldValidation<T>;
};

export type FieldError = string | null;

export type FormErrors<T> = {
  [K in keyof T]?: FieldError;
};

export type TouchedFields<T> = {
  [K in keyof T]?: boolean;
};

export interface UseFormValidationOptions<T> {
  initialValues: T;
  validationSchema: ValidationSchema<T>;
  onSubmit?: (values: T) => void | Promise<void>;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
}

export interface UseFormValidationReturn<T> {
  values: T;
  errors: FormErrors<T>;
  touched: TouchedFields<T>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  handleChange: (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleBlur: (field: keyof T) => () => void;
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldTouched: (field: keyof T, isTouched?: boolean) => void;
  setFieldError: (field: keyof T, error: string | null) => void;
  validateField: (field: keyof T) => FieldError;
  validateForm: () => boolean;
  resetForm: (newValues?: T) => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  getFieldProps: (field: keyof T) => {
    value: any;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    onBlur: () => void;
    error: FieldError;
    touched: boolean;
  };
}

// Common validation rules factory
export const validators = {
  required: (message = 'This field is required'): ValidationRule<any> => ({
    validate: (value) => {
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined;
    },
    message,
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule<any> => ({
    validate: (value) => {
      if (!value) return true; // Let required handle empty
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule<any> => ({
    validate: (value) => {
      if (!value) return true;
      return String(value).length >= min;
    },
    message: message || `Must be at least ${min} characters`,
  }),

  maxLength: (max: number, message?: string): ValidationRule<any> => ({
    validate: (value) => {
      if (!value) return true;
      return String(value).length <= max;
    },
    message: message || `Must be no more than ${max} characters`,
  }),

  pattern: (regex: RegExp, message = 'Invalid format'): ValidationRule<any> => ({
    validate: (value) => {
      if (!value) return true;
      return regex.test(String(value));
    },
    message,
  }),

  numeric: (message = 'Must be a number'): ValidationRule<any> => ({
    validate: (value) => {
      if (!value && value !== 0) return true;
      return !isNaN(Number(value));
    },
    message,
  }),

  min: (minValue: number, message?: string): ValidationRule<any> => ({
    validate: (value) => {
      if (!value && value !== 0) return true;
      return Number(value) >= minValue;
    },
    message: message || `Must be at least ${minValue}`,
  }),

  max: (maxValue: number, message?: string): ValidationRule<any> => ({
    validate: (value) => {
      if (!value && value !== 0) return true;
      return Number(value) <= maxValue;
    },
    message: message || `Must be no more than ${maxValue}`,
  }),

  matches: <T>(field: keyof T, message = 'Fields do not match'): ValidationRule<T> => ({
    validate: (value, formData) => value === formData[field],
    message,
  }),

  custom: <T>(validateFn: (value: any, formData: T) => boolean, message: string): ValidationRule<T> => ({
    validate: validateFn,
    message,
  }),
};

export function useFormValidation<T extends Record<string, any>>({
  initialValues,
  validationSchema,
  onSubmit,
  validateOnBlur = true,
  validateOnChange = false,
}: UseFormValidationOptions<T>): UseFormValidationReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [touched, setTouched] = useState<TouchedFields<T>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if form is dirty
  const isDirty = useMemo(() => {
    return Object.keys(initialValues).some(
      (key) => values[key as keyof T] !== initialValues[key as keyof T]
    );
  }, [values, initialValues]);

  // Validate a single field
  const validateField = useCallback(
    (field: keyof T): FieldError => {
      const fieldValidation = validationSchema[field];
      if (!fieldValidation) return null;

      for (const rule of fieldValidation.rules) {
        if (!rule.validate(values[field], values)) {
          return rule.message;
        }
      }
      return null;
    },
    [values, validationSchema]
  );

  // Validate all fields
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors<T> = {};
    let isValid = true;

    for (const field of Object.keys(validationSchema) as (keyof T)[]) {
      const error = validateField(field);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);

    // Mark all fields as touched
    const allTouched: TouchedFields<T> = {};
    for (const field of Object.keys(validationSchema) as (keyof T)[]) {
      allTouched[field] = true;
    }
    setTouched(allTouched);

    return isValid;
  }, [validateField, validationSchema]);

  // Check if form is valid
  const isValid = useMemo(() => {
    for (const field of Object.keys(validationSchema) as (keyof T)[]) {
      const fieldValidation = validationSchema[field];
      if (!fieldValidation) continue;

      for (const rule of fieldValidation.rules) {
        if (!rule.validate(values[field], values)) {
          return false;
        }
      }
    }
    return true;
  }, [values, validationSchema]);

  // Handle field change
  const handleChange = useCallback(
    (field: keyof T) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const value = e.target.type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : e.target.value;

        setValues((prev) => ({ ...prev, [field]: value }));

        // Validate on change if enabled
        const fieldValidation = validationSchema[field];
        if (validateOnChange || fieldValidation?.validateOnChange) {
          const error = validateField(field);
          setErrors((prev) => ({ ...prev, [field]: error }));
        } else if (touched[field]) {
          // Re-validate if already touched
          const error = validateField(field);
          setErrors((prev) => ({ ...prev, [field]: error }));
        }
      },
    [validateOnChange, validationSchema, validateField, touched]
  );

  // Handle field blur
  const handleBlur = useCallback(
    (field: keyof T) => () => {
      setTouched((prev) => ({ ...prev, [field]: true }));

      // Validate on blur if enabled
      const fieldValidation = validationSchema[field];
      if (validateOnBlur || fieldValidation?.validateOnBlur) {
        const error = validateField(field);
        setErrors((prev) => ({ ...prev, [field]: error }));
      }
    },
    [validateOnBlur, validationSchema, validateField]
  );

  // Set field value programmatically
  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Set field touched state
  const setFieldTouched = useCallback((field: keyof T, isTouched = true) => {
    setTouched((prev) => ({ ...prev, [field]: isTouched }));
  }, []);

  // Set field error manually
  const setFieldError = useCallback((field: keyof T, error: string | null) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  // Reset form
  const resetForm = useCallback((newValues?: T) => {
    setValues(newValues || initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      const isFormValid = validateForm();
      if (!isFormValid) return;

      if (onSubmit) {
        setIsSubmitting(true);
        try {
          await onSubmit(values);
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [validateForm, onSubmit, values]
  );

  // Get all props for a field
  const getFieldProps = useCallback(
    (field: keyof T) => ({
      value: values[field],
      onChange: handleChange(field),
      onBlur: handleBlur(field),
      error: errors[field] || null,
      touched: touched[field] || false,
    }),
    [values, handleChange, handleBlur, errors, touched]
  );

  return {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    isSubmitting,
    handleChange,
    handleBlur,
    setFieldValue,
    setFieldTouched,
    setFieldError,
    validateField,
    validateForm,
    resetForm,
    handleSubmit,
    getFieldProps,
  };
}

export default useFormValidation;
