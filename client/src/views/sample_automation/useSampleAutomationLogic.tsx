import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  useProcessFileMutation,
  useGetClientsAndVendorsQuery,
  useLazyGetHeaderMappingsQuery,
  useSaveHeaderMappingsMutation,
  useDetectHeadersMutation,
  useLazyGetTablePreviewQuery,
  useCreateDNCScrubbedMutation,
  useLazyGetDistinctAgeRangesQuery,
  useExtractFilesMutation,
  useCleanupTempFileMutation 
} from '../../features/sampleAutomationApiSlice';
import { useLazyGetProjectListQuery } from '../../features/projectInfoApiSlice';
import { useSelector } from 'react-redux';
import { selectUser } from '../../features/auth/authSlice';

const EXTERNAL_ROLE_ID = 4;

interface ProjectOption {
  value: string;
  label: string;
}

interface VendorOption {
  value: number;
  label: string;
}

interface ClientOption {
  value: number;
  label: string;
}

interface FileWithId extends File {
  id: string;
}

interface FileWrapper {
  file: File;
  id: string;
}

// Add interface for header mappings
interface HeaderMapping {
  original: string;
  mapped: string;
  vendorName?: string;
  clientName?: string;
  vendorId?: number;
  clientId?: number;
  priority?: number;
}

interface FileHeaderData {
  originalHeaders: string[];
  mappedHeaders: string[];
  mappings: Record<string, HeaderMapping>;
}

export const useSampleAutomationLogic = () => {
  // State management
  const [selectedFiles, setSelectedFiles] = useState<FileWrapper[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dncScrubResult, setDncScrubResult] = useState<any>(null);
  const isCreatingDNCRef = useRef(false);
  const [splitConfiguration, setSplitConfiguration] = useState<any>(null);
const [distinctAgeRanges, setDistinctAgeRanges] = useState<string[]>([]);
const [ageCalculationMode, setAgeCalculationMode] = useState<'january' | 'july'>('january');


  const [createDNCScrubbed, { isLoading: isCreatingDNC, error: dncError }] =
    useCreateDNCScrubbedMutation();
    const [extractFiles, { isLoading: isExtracting }] = useExtractFilesMutation();

  // Refs to track current vendor/client IDs without causing re-renders
  const selectedVendorIdRef = useRef(selectedVendorId);
  const selectedClientIdRef = useRef(selectedClientId);

  const [cleanupTempFile] = useCleanupTempFileMutation();

  // Processing state
  const [processResult, setProcessResult] = useState<any>(null);
  const [processStatus, setProcessStatus] = useState('');

  // Updated headers state to include mapping information
  const [fileHeaders, setFileHeaders] = useState<
    Record<string, FileHeaderData>
  >({});
  const [checkedFiles, setCheckedFiles] = useState<Set<string>>(new Set());
  const [allowExtraHeaders, setAllowExtraHeaders] = useState(false);

  const [
  getDistinctAgeRanges,
  { 
    data: ageRangesData, 
    isLoading: isLoadingAgeRanges, 
    error: ageRangesError 
  },
] = useLazyGetDistinctAgeRangesQuery();

  const [tablePreview, setTablePreview] = useState<{
    tableName: string;
    columns: Array<{ name: string; type: string }>;
    data: Record<string, any>[];
    rowCount: number;
  } | null>(null);
  const [
    getTablePreview,
    { data: previewData, isLoading: isLoadingPreview, error: previewError },
  ] = useLazyGetTablePreviewQuery();

  const currentUser = useSelector(selectUser);

  // Memoized user info extraction
  const userInfo = useMemo(() => {
    if (!currentUser) return { roles: [], username: '', isInternalUser: true };

    const isInternalUser = !currentUser.roles.includes(EXTERNAL_ROLE_ID);

    return {
      roles: currentUser.roles,
      username: currentUser.username,
      isInternalUser,
    };
  }, [currentUser]);

  // Update refs whenever vendor/client IDs change
  useEffect(() => {
    selectedVendorIdRef.current = selectedVendorId;
  }, [selectedVendorId]);

  useEffect(() => {
    selectedClientIdRef.current = selectedClientId;
  }, [selectedClientId]);

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

  const {
    data: clientsAndVendorsData,
    isLoading: isLoadingClientsAndVendors,
    error: clientsAndVendorsError,
  } = useGetClientsAndVendorsQuery();

  // Add the new header mappings query
  const [
    getHeaderMappings,
    {
      data: headerMappingsData,
      isLoading: isLoadingHeaderMappings,
      error: headerMappingsError,
    },
  ] = useLazyGetHeaderMappingsQuery();

  // Add save header mappings mutation
  const [
    saveHeaderMappings,
    { isLoading: isSavingHeaderMappings, error: saveHeaderMappingsError },
  ] = useSaveHeaderMappingsMutation();

  const handleCreateDNCScrubbed = useCallback(async () => {
    if (!processResult?.tableName) {
      setProcessStatus('❌ No table to scrub');
      return;
    }

    if (isCreatingDNCRef.current) {
      console.log('DNC scrub already in progress, skipping...');
      return;
    }

    try {
      isCreatingDNCRef.current = true;
      setProcessStatus(
        `Creating DNC-scrubbed table from ${processResult.tableName}...`
      );

      const result = await createDNCScrubbed({
        tableName: processResult.tableName,
      }).unwrap();

      if (result.success) {
        setDncScrubResult(result);
        setProcessStatus(`✅ ${result.message}`);

        // Optionally load preview of the new clean table
        const preview = await getTablePreview({
          tableName: result.newTableName,
          limit: 10,
        }).unwrap();

        if (preview.success) {
          setTablePreview({
            tableName: preview.tableName,
            columns: preview.columns,
            data: preview.data,
            rowCount: preview.rowCount,
          });
        }
      }
    } catch (error: any) {
      console.error('DNC scrub failed:', error);
      const errorMessage =
        error?.data?.message ||
        error?.message ||
        'Failed to create DNC-scrubbed table';
      setProcessStatus(`❌ Error: ${errorMessage}`);
    } finally {
      isCreatingDNCRef.current = false;
    }
  }, [processResult, createDNCScrubbed, getTablePreview]);

  // Add detect headers mutation
  const [detectHeaders, { isLoading: isDetectingHeaders }] =
    useDetectHeadersMutation();

  // Calculate validation summary with mapped headers
  const validationSummary = useMemo(() => {
    if (Object.keys(fileHeaders).length === 0) {
      return { matched: 0, total: 0, nonMatchingHeaders: [] };
    }

    const headerSets = Object.values(fileHeaders).map((fh) => fh.mappedHeaders);
    if (headerSets.length === 0) {
      return { matched: 0, total: 0, nonMatchingHeaders: [] };
    }

    // Get all unique headers from all files (using mapped headers)
    const allUniqueHeaders = Array.from(
      new Set(headerSets.flat().map((h) => h.toLowerCase().trim()))
    );

    let matched = 0;
    const nonMatchingHeaders: Array<{
      header: string;
      missingFromFiles: string[];
      presentInFiles: string[];
    }> = [];

    allUniqueHeaders.forEach((header) => {
      const filesWithHeader: string[] = [];
      const filesMissingHeader: string[] = [];

      Object.entries(fileHeaders).forEach(([fileId, headerData]) => {
        const hasHeader = headerData.mappedHeaders.some(
          (h) => h.toLowerCase().trim() === header.toLowerCase().trim()
        );

        const file = selectedFiles.find((f) => f.id === fileId);
        if (file) {
          if (hasHeader) {
            filesWithHeader.push(file.file.name);
          } else {
            filesMissingHeader.push(file.file.name);
          }
        }
      });

      if (allowExtraHeaders) {
        if (filesMissingHeader.length > 0 && filesWithHeader.length > 0) {
          nonMatchingHeaders.push({
            header,
            missingFromFiles: filesMissingHeader,
            presentInFiles: filesWithHeader,
          });
        } else if (filesWithHeader.length > 0) {
          matched++;
        }
      } else {
        if (filesMissingHeader.length > 0 && filesWithHeader.length > 0) {
          nonMatchingHeaders.push({
            header,
            missingFromFiles: filesMissingHeader,
            presentInFiles: filesWithHeader,
          });
        } else if (filesWithHeader.length === Object.keys(fileHeaders).length) {
          matched++;
        }
      }
    });

    return {
      matched,
      total: allUniqueHeaders.length,
      nonMatchingHeaders,
    };
  }, [fileHeaders, selectedFiles, allowExtraHeaders]);

  // Memoized list of project options for dropdown
  const projectListOptions = useMemo((): ProjectOption[] => {
    if (!projectList || projectListIsFetching) return [];

    return projectList.map((item: any) => ({
      value: item.projectId,
      label: `${item.projectId} - ${item.projectName}`,
    }));
  }, [projectList, projectListIsFetching]);

  // Updated vendors with API data but fallback to mock data
  const vendors = useMemo((): VendorOption[] => {
    if (!clientsAndVendorsData?.vendors) {
      return [
        { value: 1, label: 'L2' },
        { value: 2, label: 'I360' },
        { value: 3, label: 'Some other...' },
      ];
    }

    return clientsAndVendorsData.vendors.map((vendor: any) => ({
      value: vendor.VendorID,
      label: vendor.VendorName,
    }));
  }, [clientsAndVendorsData]);

  // Updated clients with API data but fallback to mock data
  const clients = useMemo((): ClientOption[] => {
    if (!clientsAndVendorsData?.clients) {
      return [
        { value: 1, label: 'Tarrance' },
        { value: 2, label: 'POS' },
        { value: 3, label: 'Some other...' },
      ];
    }

    return clientsAndVendorsData.clients.map((client: any) => ({
      value: client.ClientID,
      label: client.ClientName,
    }));
  }, [clientsAndVendorsData]);

  // Load projects when user info is available
  useEffect(() => {
    const fetchParams = userInfo.isInternalUser
      ? {}
      : { userId: userInfo.username };

    if (userInfo.username || userInfo.isInternalUser) {
      getProjectList(fetchParams).catch(console.error);
    }
  }, [userInfo.isInternalUser, userInfo.username, getProjectList]);

  // NEW: Function to fetch and apply header mappings using refs for current vendor/client
  const fetchAndApplyHeaderMappings = useCallback(
    async (fileId: string, originalHeaders: string[]) => {
      if (!originalHeaders.length) return;

      try {
        // Use refs to get current values without adding to dependencies
        const currentVendorId = selectedVendorIdRef.current;
        const currentClientId = selectedClientIdRef.current;

        console.log('Fetching header mappings for file:', fileId, {
          vendorId: currentVendorId,
          clientId: currentClientId,
          headerCount: originalHeaders.length,
        });

        // Get header mappings from database
        const mappingsResult = await getHeaderMappings({
          vendorId: currentVendorId,
          clientId: currentClientId,
          originalHeaders,
        }).unwrap();

        console.log('Header mappings received:', mappingsResult);

        // Apply mappings to create mapped headers array
        const mappedHeaders = originalHeaders.map((originalHeader) => {
          const upperOriginal = originalHeader.toUpperCase();
          const mapping = mappingsResult.data[upperOriginal];
          return mapping ? mapping.mapped : originalHeader;
        });

        // Update file headers with both original and mapped
        setFileHeaders((prev) => ({
          ...prev,
          [fileId]: {
            originalHeaders,
            mappedHeaders,
            mappings: mappingsResult.data,
          },
        }));

        console.log(`Applied mappings for file ${fileId}:`, {
          originalCount: originalHeaders.length,
          mappedCount: mappedHeaders.length,
          mappingsFound: Object.keys(mappingsResult.data).length,
        });
      } catch (error) {
        console.error('Error fetching header mappings:', error);
        // Fallback: use original headers as mapped headers
        setFileHeaders((prev) => ({
          ...prev,
          [fileId]: {
            originalHeaders,
            mappedHeaders: originalHeaders,
            mappings: {},
          },
        }));
      }
    },
    [getHeaderMappings]
  );

  // NEW: Function to detect headers from file using RTK Query
  const detectHeadersFromFile = useCallback(
    async (file: File): Promise<string[]> => {
      try {
        const result = await detectHeaders(file).unwrap();
        return result.headers || [];
      } catch (error) {
        console.error('Error detecting headers via backend:', error);
        throw new Error(
          `Failed to read headers from ${file.name}: ${error.message}`
        );
      }
    },
    [detectHeaders]
  );

  // Automatically process files when they're uploaded
  // In the useEffect that auto-processes files
  useEffect(() => {
    console.log('🔍 useEffect triggered');
    console.log('selectedFiles:', selectedFiles);
    console.log('fileHeaders:', fileHeaders);

    selectedFiles.forEach(async (fileWrapper) => {
      console.log(
        `📁 Processing file: ${fileWrapper.file.name}, ID: ${fileWrapper.id}`
      );

      // Skip if we already have header data for this file
      if (fileHeaders[fileWrapper.id]) {
        console.log(
          `⏭️ Skipping ${fileWrapper.file.name} - already has headers`
        );
        return;
      }

      try {
        console.log(
          `🔎 Auto-detecting headers for file: ${fileWrapper.file.name}`
        );

        // Step 1: Detect headers from the file using backend
        const detectedHeaders = await detectHeadersFromFile(fileWrapper.file);
        console.log(
          `✅ Detected ${detectedHeaders.length} headers:`,
          detectedHeaders
        );

        // Step 2: Fetch database mappings and apply them
        console.log(`🔄 Fetching mappings for ${fileWrapper.id}...`);
        await fetchAndApplyHeaderMappings(fileWrapper.id, detectedHeaders);
        console.log(`✅ Mappings applied for ${fileWrapper.id}`);

        // Step 3: Mark file as processed
        setCheckedFiles((prev) => new Set([...prev, fileWrapper.id]));

        console.log(
          `✅ Header processing complete for file: ${fileWrapper.file.name}`
        );
      } catch (error) {
        console.error(
          `❌ Failed to process headers for ${fileWrapper.file.name}:`,
          error
        );

        // Fallback: set empty header data so file doesn't get stuck
        setFileHeaders((prev) => ({
          ...prev,
          [fileWrapper.id]: {
            originalHeaders: [],
            mappedHeaders: [],
            mappings: {},
          },
        }));
      }
    });
  }, [
    selectedFiles,
    fileHeaders,
    detectHeadersFromFile,
    fetchAndApplyHeaderMappings,
  ]);

  // Updated file selection handler
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files).map((file, index) => ({
      file: file,
      id: `${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
    }));

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setProcessStatus('');
  }, []);

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(event.target.files);
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
      fileInputRef.current.multiple = true;
      fileInputRef.current.click();
    }
  }, []);

  // Project selection handler
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

  // Updated vendor selection handler to refresh mappings
  const handleVendorChange = useCallback(
    (selected: VendorOption | null) => {
      const newValue = selected?.value || null;
      if (newValue !== selectedVendorId) {
        setSelectedVendorId(newValue);
        selectedVendorIdRef.current = newValue; // SET REF IMMEDIATELY
        setProcessStatus('');

        console.log(
          'Vendor changed to:',
          newValue,
          'Re-fetching mappings for all files'
        );

        // Re-fetch mappings for all files when vendor changes
        Object.entries(fileHeaders).forEach(([fileId, headerData]) => {
          if (headerData.originalHeaders.length > 0) {
            fetchAndApplyHeaderMappings(fileId, headerData.originalHeaders);
          }
        });
      }
    },
    [selectedVendorId, fileHeaders, fetchAndApplyHeaderMappings]
  );

  // Updated client selection handler to refresh mappings
  const handleClientChange = useCallback(
    (selected: ClientOption | null) => {
      const newValue = selected?.value || null;
      if (newValue !== selectedClientId) {
        setSelectedClientId(newValue);
        selectedClientIdRef.current = newValue; // SET REF IMMEDIATELY
        setProcessStatus('');

        console.log(
          'Client changed to:',
          newValue,
          'Re-fetching mappings for all files'
        );

        // Re-fetch mappings for all files when client changes
        Object.entries(fileHeaders).forEach(([fileId, headerData]) => {
          if (headerData.originalHeaders.length > 0) {
            fetchAndApplyHeaderMappings(fileId, headerData.originalHeaders);
          }
        });
      }
    },
    [selectedClientId, fileHeaders, fetchAndApplyHeaderMappings]
  );

  const handleUpdateLocalMapping = useCallback(
    (fileId: string, index: number, newMapped: string) => {
      setFileHeaders((prev) => {
        const fileData = prev[fileId];
        if (!fileData) return prev;

        const updatedMappedHeaders = [...fileData.mappedHeaders];
        updatedMappedHeaders[index] = newMapped;

        return {
          ...prev,
          [fileId]: {
            ...fileData,
            mappedHeaders: updatedMappedHeaders,
          },
        };
      });
    },
    []
  );

  // For backwards compatibility with select element
  const handleProjectSelect = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedProjectId(event.target.value);
      setProcessStatus('');
    },
    []
  );

  // Update the allFilesChecked logic
  const allFilesChecked = useMemo(() => {
    return selectedFiles?.every((file) => checkedFiles.has(file.id)) || false;
  }, [selectedFiles, checkedFiles]);

  const canMerge = useMemo(() => {
    if (!allFilesChecked) return false;
    if (allowExtraHeaders) return true;
    return validationSummary.nonMatchingHeaders.length === 0;
  }, [allFilesChecked, validationSummary, allowExtraHeaders]);

  // Clear all inputs
  const clearInputs = useCallback(() => {
    setSelectedFiles([]);
    setSelectedProjectId('');
    setSelectedVendorId(null);
    setSelectedClientId(null);
    setProcessStatus('');
    setProcessResult(null);
    setFileHeaders({});
    setCheckedFiles(new Set());
    setTablePreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Updated handleProcessFiles to use mapped headers
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

    if (!allowExtraHeaders && validationSummary.nonMatchingHeaders.length > 0) {
      setProcessStatus('❌ Please resolve header conflicts before merging');
      return;
    }

    const formData = new FormData();

    selectedFiles.forEach((item) => {
      formData.append('files', item.file);
    });

    formData.append('projectId', selectedProjectId);

    if (selectedVendorId) {
      formData.append('vendorId', selectedVendorId.toString());
    }
    if (selectedClientId) {
      formData.append('clientId', selectedClientId.toString());
    }

     formData.append('ageCalculationMode', ageCalculationMode);

    // Use mapped headers instead of original headers
    const headersMapping: Record<number, string[]> = {};
    selectedFiles.forEach((item, index) => {
      const headerData = fileHeaders[item.id];
      if (headerData && headerData.mappedHeaders) {
        headersMapping[index] = headerData.mappedHeaders;
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
        // Fetch table preview after successful upload
        if (result.tableName) {
          await fetchDistinctAgeRanges(result.tableName);
          console.log('Fetching preview for table:', result.tableName);
          try {
            const preview = await getTablePreview({
              tableName: result.tableName,
              limit: 10,
            }).unwrap();

            if (preview.success) {
              setTablePreview({
                tableName: preview.tableName,
                columns: preview.columns,
                data: preview.data,
                rowCount: preview.rowCount,
              });
            }
          } catch (previewError) {
            console.error('Failed to fetch table preview:', previewError);
          }
        }
      } else {
        throw new Error(result.message || 'Processing failed');
      }
    } catch (error: any) {
      console.error('Processing failed:', error);
      const errorMessage =
        error?.data?.message ||
        error?.message ||
        'Processing failed. Please try again.';
      setProcessStatus(`❌ Error: ${errorMessage}`);
    }
  }, [
    selectedProjectId,
    selectedFiles,
    processFile,
    allFilesChecked,
    fileHeaders,
    validationSummary,
    selectedVendorId,
    selectedClientId,
    allowExtraHeaders,
    getTablePreview,
  ]);

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

  // Updated loading state to include header mapping loading
  const isLoading = useMemo(() => {
    return (
      projectListIsFetching || isLoadingHeaderMappings || isDetectingHeaders
    );
  }, [projectListIsFetching, isLoadingHeaderMappings, isDetectingHeaders]);

  // Updated error state to include header mapping errors
  const error = useMemo(() => {
    return (
      processError ||
      projectListError ||
      headerMappingsError ||
      saveHeaderMappingsError
    );
  }, [
    processError,
    projectListError,
    headerMappingsError,
    saveHeaderMappingsError,
  ]);

  const handleSaveMappingToDB = useCallback(
    async (fileId: string, original: string, mapped: string) => {
      try {
        setProcessStatus(`Saving mapping: ${original} → ${mapped}...`);

        const result = await saveHeaderMappings({
          vendorId: selectedVendorId,
          clientId: selectedClientId,
          mappings: [{ original, mapped }],
        }).unwrap();

        if (result.success) {
          setProcessStatus(`✓ Saved to database, refreshing all files...`);

          // Refresh mappings for ALL files to see the change everywhere
          const refreshPromises = Object.entries(fileHeaders).map(
            ([fId, headerData]) => {
              if (headerData.originalHeaders.length > 0) {
                return fetchAndApplyHeaderMappings(
                  fId,
                  headerData.originalHeaders
                );
              }
              return Promise.resolve();
            }
          );

          await Promise.all(refreshPromises);

          setProcessStatus('✓ All files refreshed with new mapping');
          setTimeout(() => setProcessStatus(''), 2000);
        }
      } catch (error: any) {
        console.error('Error saving mapping:', error);
        setProcessStatus(`❌ Error: ${error.message || 'Failed to save'}`);
      }
    },
    [
      selectedVendorId,
      selectedClientId,
      saveHeaderMappings,
      fetchAndApplyHeaderMappings,
      fileHeaders,
    ]
  );

const downloadFile = useCallback((url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up file after download with delay using RTK Query
  setTimeout(async () => {
    try {
      const result = await cleanupTempFile(filename).unwrap();
      if (result.success) {
        console.log('✅ File cleanup successful:', filename);
      } else {
        console.log('⚠️ File cleanup failed:', result.message);
      }
    } catch (error) {
      console.log('❌ Cleanup request failed:', error.message);
    }
  }, 3000); // 3 second delay to ensure download started
}, [cleanupTempFile]);


const handleExtractFiles = useCallback(async (config) => {
  try {
    setProcessStatus('🔄 Extracting files...');
    const result = await extractFiles(config).unwrap();
    
    if (result.success) {
      setProcessStatus('✅ Files extracted successfully! Downloading...');
      
      if (result.splitMode === 'split') {
        // Download both landline and cell files
        if (result.files.landline) {
          downloadFile(result.files.landline.url, result.files.landline.filename);
        }
        setTimeout(() => {
          if (result.files.cell) {
            downloadFile(result.files.cell.url, result.files.cell.filename);
          }
        }, 1000);
      } else {
        // Download single file
        if (result.files.single) {
          downloadFile(result.files.single.url, result.files.single.filename);
        }
      }
      
      console.log('Files extracted:', result);
    } else {
      setProcessStatus(`❌ Extraction failed: ${result.message}`);
    }
  } catch (error) {
    console.error('Error extracting files:', error);
    const errorMessage = error?.data?.message || error?.message || 'Failed to extract files';
    setProcessStatus(`❌ Error extracting files: ${errorMessage}`);
  }
}, [extractFiles, downloadFile]);

  // Handle split configuration changes
const handleSplitConfigChange = useCallback(async (config: any) => {
  console.log('Split configuration changed:', config);
  setSplitConfiguration(config);
  
  // Handle extract action
  if (config.action === 'extract') {
    await handleExtractFiles(config);
  }
}, [handleExtractFiles]);

// Fetch distinct age ranges from processed table
const fetchDistinctAgeRanges = useCallback(async (tableName: string) => {
  if (!tableName) return;
  
  try {
    console.log('Fetching distinct age ranges for table:', tableName);
    const result = await getDistinctAgeRanges({ tableName }).unwrap();
    
    if (result.success) {
      setDistinctAgeRanges(result.ageRanges || []);
      console.log('Age ranges fetched:', result.ageRanges);
    }
  } catch (error) {
    console.error('Failed to fetch age ranges:', error);
    setDistinctAgeRanges([]);
  }
}, [getDistinctAgeRanges]);

// Generate split files based on configuration
const generateSplitFiles = useCallback(async () => {
  if (!splitConfiguration || !processResult?.tableName) {
    console.error('No split configuration or table name available');
    return;
  }

  try {
    setProcessStatus('🔄 Generating split files...');

    // You'll need to create this API endpoint
    const response = await fetch('/api/sample-automation/generate-split-files', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tableName: processResult.tableName,
        splitConfiguration,
      }),
    });

    const result = await response.json();

    if (result.success) {
      setProcessStatus(`✅ Split files generated successfully!`);
      console.log('Split files generated:', result);
    } else {
      setProcessStatus(`❌ Failed to generate split files: ${result.message}`);
    }
  } catch (error: any) {
    console.error('Error generating split files:', error);
    setProcessStatus(`❌ Error generating split files: ${error.message}`);
  }
}, [splitConfiguration, processResult]);



  return {
    // State
    selectedFiles,
    dragActive,
    selectedProjectId,
    selectedVendorId,
    selectedClientId,

    // Data
    projectListOptions,
    vendors,
    clients,
    userInfo,

    // Processing state
    processResult,
    processStatus,

    // Loading states
    isLoading,
    isProcessing,
    isLoadingClientsAndVendors,
    isLoadingHeaderMappings,
    isSavingHeaderMappings,
    isDetectingHeaders,

    // Success states
    processSuccess,

    // Error states
    error,
    clientsAndVendorsError,
    headerMappingsError,
    saveHeaderMappingsError,

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

    // Vendor/Client handling
    handleVendorChange,
    handleClientChange,

    // Actions
    handleProcessFiles,
    clearInputs,
    validateInputs,

    // Utilities
    formatFileSize,
    totalFileSize,

    // Legacy support
    setSelectedProjectId,

    // Updated header functionality with mapping support
    fileHeaders,
    checkedFiles,
    allFilesChecked,
    hasHeaderConflicts: validationSummary.nonMatchingHeaders.length > 0,
    canMerge,
    validationSummary,
    allowExtraHeaders,
    setAllowExtraHeaders,
    handleSaveMappingToDB,
    handleUpdateLocalMapping,

    // NEW: Header mapping specific functions and data
    fetchAndApplyHeaderMappings,
    headerMappingsData,

    // Table preview
    tablePreview,
    isLoadingPreview,
    previewError,

    // DNC Scrub
    handleCreateDNCScrubbed,
    isCreatingDNC,
    dncScrubResult,

    // NEW: Split configuration exports
  splitConfiguration,
  distinctAgeRanges,
  isLoadingAgeRanges,
  handleSplitConfigChange,
  generateSplitFiles,
  fetchDistinctAgeRanges,
  ageRangesError,

  
  isExtracting,
  handleExtractFiles,

  ageCalculationMode,
  setAgeCalculationMode,
  };
};
