import React from 'react';
import './css/FormField.css';

interface FormFieldProps {
  label?: string;
  error?: string | null;
  touched?: boolean;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Wrapper component for form inputs that displays labels and validation errors
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  touched,
  required,
  hint,
  className = '',
  children,
}) => {
  const showError = touched && error;

  return (
    <div className={`form-field ${showError ? 'form-field-error' : ''} ${className}`}>
      {label && (
        <label className="form-field-label">
          {label}
          {required && <span className="form-field-required">*</span>}
        </label>
      )}
      <div className="form-field-input">
        {children}
      </div>
      {showError && (
        <span className="form-field-error-message" role="alert">
          {error}
        </span>
      )}
      {hint && !showError && (
        <span className="form-field-hint">{hint}</span>
      )}
    </div>
  );
};

/**
 * Input component with built-in error styling
 */
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string | null;
  touched?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({
  error,
  touched,
  className = '',
  ...props
}) => {
  const hasError = touched && error;

  return (
    <input
      className={`form-input ${hasError ? 'form-input-error' : ''} ${className}`}
      aria-invalid={hasError ? 'true' : 'false'}
      {...props}
    />
  );
};

/**
 * Select component with built-in error styling
 */
interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string | null;
  touched?: boolean;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  error,
  touched,
  className = '',
  children,
  ...props
}) => {
  const hasError = touched && error;

  return (
    <select
      className={`form-select ${hasError ? 'form-select-error' : ''} ${className}`}
      aria-invalid={hasError ? 'true' : 'false'}
      {...props}
    >
      {children}
    </select>
  );
};

/**
 * Textarea component with built-in error styling
 */
interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string | null;
  touched?: boolean;
}

export const FormTextarea: React.FC<FormTextareaProps> = ({
  error,
  touched,
  className = '',
  ...props
}) => {
  const hasError = touched && error;

  return (
    <textarea
      className={`form-textarea ${hasError ? 'form-textarea-error' : ''} ${className}`}
      aria-invalid={hasError ? 'true' : 'false'}
      {...props}
    />
  );
};

export default FormField;
