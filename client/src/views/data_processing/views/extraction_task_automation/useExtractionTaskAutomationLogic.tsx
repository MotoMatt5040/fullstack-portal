import { useState, useCallback, useRef } from 'react';
import { useToast } from '../../../../context/ToastContext';
import { useUploadExtractionFileMutation } from '../../../../features/extractionTaskApiSlice';

export const useExtractionTaskAutomationLogic = () => {
  const toast = useToast();
  const [uploadExtractionFile, { isLoading }] = useUploadExtractionFileMutation();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [suffix, setSuffix] = useState<string>('COM');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.name.endsWith('.xlsx')) {
        toast.warning('Only .xlsx files are accepted.');
        return;
      }
      setSelectedFile(file);
    },
    [toast]
  );

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(event.target.files);
      if (event.target) event.target.value = '';
    },
    [handleFileSelect]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive(false);
      handleFileSelect(event.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }, []);

  const clearSelectedFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedFile) {
      toast.warning('Please select a file first.');
      return;
    }
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('suffix', suffix);
    try {
      const result = await uploadExtractionFile(formData).unwrap();
      toast.success(result.message || 'File processed successfully.', 'Upload Complete');
      clearSelectedFile();
    } catch (err: any) {
      const message = err?.data?.message || 'An error occurred while uploading the file.';
      toast.error(message, 'Upload Failed');
    }
  }, [selectedFile, suffix, uploadExtractionFile, toast, clearSelectedFile]);

  return {
    selectedFile,
    dragActive,
    isLoading,
    fileInputRef,
    handleFileInputChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    clearSelectedFile,
    openFileDialog,
    handleSubmit,
    suffix,
    setSuffix,
  };
};
