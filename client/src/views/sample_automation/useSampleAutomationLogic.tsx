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

export const useSampleAutomationLogic = () => {
  // State management
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Processing state
  const [processResult, setProcessResult] = useState<any>(null);
  const [processStatus, setProcessStatus] = useState('');

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
  const [processFile, { 
    isLoading: isProcessing, 
    error: processError,
    isSuccess: processSuccess 
  }] = useProcessFileMutation();

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

  // File handling functions
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setSelectedFile(file);
    setProcessStatus('');
  }, []);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event.target.files);
  }, [handleFileSelect]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    handleFileSelect(event.dataTransfer.files);
  }, [handleFileSelect]);

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
    setProcessStatus('');
    setProcessResult(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const openFileDialog = useCallback(() => {
    if (fileInputRef.current) {
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

  // For backwards compatibility with select element
  const handleProjectSelect = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProjectId(event.target.value);
    setProcessStatus('');
  }, []);

  // Clear all inputs
  const clearInputs = useCallback(() => {
    setSelectedFile(null);
    setSelectedProjectId('');
    setProcessStatus('');
    setProcessResult(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Process file function
  const handleProcessFile = useCallback(async () => {
    if (!selectedProjectId) {
      setProcessStatus('❌ Please select a project');
      return;
    }
    
    if (!selectedFile) {
      setProcessStatus('❌ Please select a file');
      return;
    }

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('projectId', selectedProjectId);

    try {
      setProcessStatus('Processing file...');
      
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
      const errorMessage = error?.data?.message || error?.message || 'Processing failed. Please try again.';
      setProcessStatus(`❌ Error: ${errorMessage}`);
    }
  }, [selectedProjectId, selectedFile, processFile]);

  // Utility functions
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const validateInputs = useCallback((): boolean => {
    if (!selectedProjectId) {
      setProcessStatus('❌ Please select a project');
      return false;
    }
    
    if (!selectedFile) {
      setProcessStatus('❌ Please select a file');
      return false;
    }
    
    return true;
  }, [selectedProjectId, selectedFile]);

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
    selectedFile,
    dragActive,
    selectedProjectId,
    
    // Data - using consistent naming
    projectListOptions,
    userInfo,
    
    // Processing state
    processResult,
    processStatus,
    
    // Loading states - consistent with quota management
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
    clearSelectedFile,
    openFileDialog,
    fileInputRef,
    
    // Project handling - both optimized and legacy support
    handleProjectChange, // Optimized callback for ProjectOption
    handleProjectSelect, // Legacy support for select element
    getProjectList, // Expose for manual refresh if needed
    
    // Actions
    handleProcessFile,
    clearInputs,
    validateInputs,
    
    // Utilities
    formatFileSize,
    
    // Legacy support (can be removed after refactoring consumers)
    setSelectedProjectId,
  };
};