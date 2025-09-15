import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useProcessFileMutation } from '../../features/sampleAutomationApiSlice';
import { useLazyGetProjectListQuery } from '../../features/ProjectInfoApiSlice';
import { useSelector } from 'react-redux';
import { selectUser } from '../../features/auth/authSlice';

const EXTERNAL_ROLE_ID = 4;

interface ProjectOption {
  value: string;
  label: string;
}

interface FileWithId extends File {
  id: string;
}

interface FileWrapper {
  file: File;
  id: string;
}

export const useSampleAutomationLogic = () => {
  // State management
  const [selectedFiles, setSelectedFiles] = useState<FileWrapper[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Processing state
  const [processResult, setProcessResult] = useState<any>(null);
  const [processStatus, setProcessStatus] = useState('');

  // Headers state
  const [fileHeaders, setFileHeaders] = useState<Record<string, string[]>>({});
  const [checkedFiles, setCheckedFiles] = useState<Set<string>>(new Set());
  const [hasHeaderConflicts, setHasHeaderConflicts] = useState(false);

  const currentUser = useSelector(selectUser);

  // Memoized user info extraction - same as quota management
  const userInfo = useMemo(() => {
    if (!currentUser) return { roles: [], username: '', isInternalUser: true };

    const isInternalUser = !currentUser.roles.includes(EXTERNAL_ROLE_ID);

    return {
      roles: currentUser.roles,
      username: currentUser.username,
      isInternalUser,
    };
  }, [currentUser]);

  // API hooks
  const [
    processFile,
    { isLoading: isProcessing, error: processError, isSuccess: processSuccess },
  ] = useProcessFileMutation();

  const [
    getProjectList,
    {
      data: projectList,
      isFetching: projectListIsFetching,
      error: projectListError,
    },
  ] = useLazyGetProjectListQuery();

  // Memoized list of project options for dropdown - same as quota management
  const projectListOptions = useMemo((): ProjectOption[] => {
    if (!projectList || projectListIsFetching) return [];

    return projectList.map((item: any) => ({
      value: item.projectId,
      label: `${item.projectId} - ${item.projectName}`,
    }));
  }, [projectList, projectListIsFetching]);

  // Load projects when user info is available - same pattern as quota management
  useEffect(() => {
    const fetchParams = userInfo.isInternalUser
      ? {}
      : { userId: userInfo.username };

    if (userInfo.username || userInfo.isInternalUser) {
      getProjectList(fetchParams).catch(console.error);
    }
  }, [userInfo.isInternalUser, userInfo.username, getProjectList]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Keep the original File object intact, just wrap it
    const newFiles = Array.from(files).map((file, index) => ({
      file: file, // Original File object with all properties preserved
      id: `${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
    }));

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setProcessStatus('');
  }, []);

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(event.target.files);
      // Clear input to allow re-selecting same files
      if (event.target) {
        event.target.value = '';
      }
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

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive(true);
    },
    []
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive(false);
    },
    []
  );

  // Clear all files
  const clearSelectedFiles = useCallback(() => {
    setSelectedFiles([]);
    setProcessStatus('');
    setProcessResult(null);
    setFileHeaders({});
    setCheckedFiles(new Set());
    setHasHeaderConflicts(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Remove individual file
  const removeFile = useCallback((fileId: string) => {
    setSelectedFiles((prev) => prev.filter((file) => file.id !== fileId));
    setFileHeaders((prev) => {
      const updated = { ...prev };
      delete updated[fileId];
      return updated;
    });
    setCheckedFiles((prev) => {
      const updated = new Set(prev);
      updated.delete(fileId);
      return updated;
    });
  }, []);

  const openFileDialog = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.multiple = true; // Enable multiple selection
      fileInputRef.current.click();
    }
  }, []);

  // Project selection handler - using optimized callback like quota management
  const handleProjectChange = useCallback(
    (selected: ProjectOption | null) => {
      const newValue = selected?.value || '';
      if (newValue !== selectedProjectId) {
        setSelectedProjectId(newValue);
        setProcessStatus('');
      }
    },
    [selectedProjectId]
  );

  // Updated handler for saving headers (now takes fileId instead of using selectedFileForHeaders)
  const handleSaveHeaders = useCallback((fileId: string, headers: string[]) => {
    // Store the headers for this file
    setFileHeaders((prev) => ({
      ...prev,
      [fileId]: headers,
    }));

    // Mark this file as checked
    setCheckedFiles((prev) => new Set([...prev, fileId]));
  }, []);

  // New handler for validation results
  const handleValidationComplete = useCallback((hasConflicts: boolean) => {
    setHasHeaderConflicts(hasConflicts);
  }, []);

  // For backwards compatibility with select element
  const handleProjectSelect = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedProjectId(event.target.value);
      setProcessStatus('');
    },
    []
  );

  // Update the allFilesChecked logic to include validation
  const allFilesChecked = useMemo(() => {
    return selectedFiles?.every((file) => checkedFiles.has(file.id)) || false;
  }, [selectedFiles, checkedFiles]);

  // Updated merge button should be disabled if there are conflicts
  const canMerge = useMemo(() => {
    return allFilesChecked && !hasHeaderConflicts;
  }, [allFilesChecked, hasHeaderConflicts]);

  // Clear all inputs
  const clearInputs = useCallback(() => {
    setSelectedFiles([]);
    setSelectedProjectId('');
    setProcessStatus('');
    setProcessResult(null);
    setFileHeaders({});
    setCheckedFiles(new Set());
    setHasHeaderConflicts(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Updated handleProcessFiles to use the validation state
  const handleProcessFiles = useCallback(async () => {
    if (!selectedProjectId) {
      setProcessStatus('❌ Please select a project');
      return;
    }

    if (selectedFiles.length === 0) {
      setProcessStatus('❌ Please select at least one file');
      return;
    }

    if (!allFilesChecked) {
      setProcessStatus('❌ Please review headers for all files first');
      return;
    }

    if (hasHeaderConflicts) {
      setProcessStatus('❌ Please resolve header conflicts before merging');
      return;
    }

    // Create FormData for multiple files
    const formData = new FormData();

    // Add all files with the 'files' key (for multer array)
    selectedFiles.forEach((item) => {
      formData.append('files', item.file);
    });

    formData.append('projectId', selectedProjectId);

    const headersMapping: Record<number, string[]> = {};
    selectedFiles.forEach((item, index) => {
      if (fileHeaders[item.id]) {
        headersMapping[index] = fileHeaders[item.id];
      }
    });

    formData.append('customHeaders', JSON.stringify(headersMapping));

    try {
      setProcessStatus(
        `Processing ${selectedFiles.length} file${
          selectedFiles.length !== 1 ? 's' : ''
        }...`
      );

      const result = await processFile(formData).unwrap();

      if (result.success) {
        setProcessResult(result);
        setProcessStatus(`✅ ${result.message}`);
      } else {
        throw new Error(result.message || 'Processing failed');
      }
    } catch (error: any) {
      console.error('Processing failed:', error);

      // Handle specific error messages
      const errorMessage =
        error?.data?.message ||
        error?.message ||
        'Processing failed. Please try again.';
      setProcessStatus(`❌ Error: ${errorMessage}`);
    }
  }, [selectedProjectId, selectedFiles, processFile, allFilesChecked, fileHeaders, hasHeaderConflicts]);

  // Utility functions
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Validate multiple files
  const validateInputs = useCallback((): boolean => {
    if (!selectedProjectId) {
      setProcessStatus('❌ Please select a project');
      return false;
    }

    if (selectedFiles.length === 0) {
      setProcessStatus('❌ Please select at least one file');
      return false;
    }

    return true;
  }, [selectedProjectId, selectedFiles]);

  const totalFileSize = useMemo(() => {
    if (!selectedFiles || selectedFiles.length === 0) return 0;
    return selectedFiles.reduce((total, item) => {
      return total + (item.file.size || 0);
    }, 0);
  }, [selectedFiles]);

  // Memoized loading state - same pattern as quota management
  const isLoading = useMemo(() => {
    return projectListIsFetching;
  }, [projectListIsFetching]);

  // Memoized error state - same pattern as quota management
  const error = useMemo(() => {
    return processError || projectListError;
  }, [processError, projectListError]);

  return {
    // State
    selectedFiles,
    dragActive,
    selectedProjectId,

    // Data
    projectListOptions,
    userInfo,

    // Processing state
    processResult,
    processStatus,

    // Loading states
    isLoading,
    isProcessing,

    // Success states
    processSuccess,

    // Error states
    error,

    // File handling
    handleFileInputChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    clearSelectedFiles,
    removeFile,
    openFileDialog,
    fileInputRef,

    // Project handling
    handleProjectChange,
    handleProjectSelect,
    getProjectList,

    // Actions
    handleProcessFiles,
    clearInputs,
    validateInputs,

    // Utilities
    formatFileSize,
    totalFileSize,

    // Legacy support (can be removed after refactoring consumers)
    setSelectedProjectId,

    // Updated/new header functionality
    fileHeaders,
    checkedFiles,
    allFilesChecked,
    hasHeaderConflicts,
    canMerge,
    handleSaveHeaders, // Updated signature
    handleValidationComplete, // New handler
  };
};