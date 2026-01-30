import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  useProcessFileMutation,
  useGetClientsAndVendorsQuery,
  useLazyGetHeaderMappingsQuery,
  useSaveHeaderMappingsMutation,
  useDetectHeadersMutation,
  useLazyGetTablePreviewQuery,
  useLazyGetDistinctAgeRangesQuery,
  useExtractFilesMutation,
  useCleanupTempFileMutation,
  useLazyGetProjectVariableInclusionsQuery,
  useAddProjectVariableInclusionMutation,
  useDeleteProjectVariableInclusionMutation,
} from '../../features/sampleAutomationApiSlice';
import { useLazyGetProjectListQuery } from '../../features/projectInfoApiSlice';
import { useSelector } from 'react-redux';
import { selectUser, selectCurrentToken } from '../../features/auth/authSlice';
import { useToast } from '../../context/ToastContext';

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
  excludedHeaders?: string[];
  includedFromExclusions?: string[]; // Headers that were excluded but user chose to include
  // Store ALL headers in original file order (including excluded) for correct positioning
  allHeadersInOrder?: string[];
}

export const useSampleAutomationLogic = () => {
  // Get auth token from Redux store
  const token = useSelector(selectCurrentToken);
  const toast = useToast();

  // State management
  const [selectedFiles, setSelectedFiles] = useState<FileWrapper[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedClientName, setSelectedClientName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [splitConfiguration, setSplitConfiguration] = useState<any>(null);
  const [distinctAgeRanges, setDistinctAgeRanges] = useState<string[]>([]);
  const [ageCalculationMode, setAgeCalculationMode] = useState<'january' | 'july'>('january');
  const [requestedFileId, setRequestedFileId] = useState<string>('');
  const [fileType, setFileType] = useState<'landline' | 'cell'>('landline');

  const [extractFiles, { isLoading: isExtracting }] = useExtractFilesMutation();

  // Refs to track current vendor/client IDs without causing re-renders
  const selectedVendorIdRef = useRef(selectedVendorId);
  const selectedClientIdRef = useRef(selectedClientId);

  const [cleanupTempFile] = useCleanupTempFileMutation();

  // Project variable inclusions (for persisting included-from-excluded headers)
  const [getProjectVariableInclusions] = useLazyGetProjectVariableInclusionsQuery();
  const [addProjectVariableInclusion] = useAddProjectVariableInclusionMutation();
  const [deleteProjectVariableInclusion] = useDeleteProjectVariableInclusionMutation();

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

  // Get header mappings for vendor/client with proper hierarchy
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

  // Ref for selectedProjectId to avoid unnecessary re-renders
  const selectedProjectIdRef = useRef(selectedProjectId);
  useEffect(() => {
    selectedProjectIdRef.current = selectedProjectId;
  }, [selectedProjectId]);

  // NEW: Function to fetch and apply header mappings using refs for current vendor/client
  // Also loads project variable inclusions to auto-include previously saved headers
  const fetchAndApplyHeaderMappings = useCallback(
    async (fileId: string, originalHeaders: string[], excludedHeaders: string[] = [], allHeadersInOrderParam?: string[]) => {
      if (!originalHeaders.length) return;

      try {
        // Use refs to get current values without adding to dependencies
        const currentVendorId = selectedVendorIdRef.current;
        const currentClientId = selectedClientIdRef.current;
        const currentProjectId = selectedProjectIdRef.current;

        // IMPORTANT: Use allHeadersInOrder from detection if available, otherwise fallback
        // This preserves the exact original file order for correct column positioning
        const allHeadersInOrder = allHeadersInOrderParam || [...originalHeaders, ...excludedHeaders];

        // Get header mappings from database - server applies proper hierarchy
        // (global -> vendor only -> client only -> vendor+client)
        const mappingsResult = await getHeaderMappings({
          vendorId: currentVendorId,
          clientId: currentClientId,
          originalHeaders,
        }).unwrap();

        // Load project variable inclusions if a project is selected
        let projectInclusions: string[] = [];
        if (currentProjectId) {
          try {
            const inclusionsResult = await getProjectVariableInclusions(parseInt(currentProjectId)).unwrap();
            if (inclusionsResult.success && inclusionsResult.data) {
              projectInclusions = inclusionsResult.data.map(inc => inc.originalVariableName.toUpperCase());
            }
          } catch (error) {
            // Ignore errors loading inclusions
          }
        }

        // Determine which excluded headers should now be included (from project settings)
        const excludedSet = new Set(excludedHeaders.map(h => h.toUpperCase()));
        const includedFromExclusions = excludedHeaders.filter(
          h => projectInclusions.includes(h.toUpperCase())
        );
        const includedFromExclusionsSet = new Set(includedFromExclusions.map(h => h.toUpperCase()));

        // Final excluded headers = excluded minus any project inclusions
        const finalExcludedHeaders = excludedHeaders.filter(
          h => !projectInclusions.includes(h.toUpperCase())
        );

        // Build final headers list maintaining order from allHeadersInOrder
        // Include: originalHeaders + any excludedHeaders that are in project inclusions
        const finalOriginalHeaders = allHeadersInOrder.filter(h => {
          const upper = h.toUpperCase();
          // Include if it was originally included OR if it's included from exclusions
          return !excludedSet.has(upper) || includedFromExclusionsSet.has(upper);
        });

        // Apply mappings to create mapped headers array (in same order)
        const mappedHeaders = finalOriginalHeaders.map((originalHeader) => {
          const upperOriginal = originalHeader.toUpperCase();
          const mapping = mappingsResult.data[upperOriginal];
          return mapping ? mapping.mapped : originalHeader;
        });

        // Update file headers with both original, mapped, and excluded
        console.log(`=== CLIENT: Setting fileHeaders for ${fileId} ===`);
        console.log('allHeadersInOrder count:', allHeadersInOrder.length);
        console.log('excludedHeaders being stored:', finalExcludedHeaders);
        console.log('includedFromExclusions:', includedFromExclusions);
        console.log('finalOriginalHeaders count:', finalOriginalHeaders.length);
        setFileHeaders((prev) => ({
          ...prev,
          [fileId]: {
            originalHeaders: finalOriginalHeaders,
            mappedHeaders,
            mappings: mappingsResult.data,
            excludedHeaders: finalExcludedHeaders,
            includedFromExclusions,
            allHeadersInOrder, // Store for later use when including/excluding
          },
        }));

      } catch (error) {
        // Fallback: use original headers as mapped headers
        const allHeadersInOrder = [...originalHeaders, ...excludedHeaders];
        setFileHeaders((prev) => ({
          ...prev,
          [fileId]: {
            originalHeaders,
            mappedHeaders: originalHeaders,
            mappings: {},
            excludedHeaders,
            allHeadersInOrder,
          },
        }));
      }
    },
    [getHeaderMappings, getProjectVariableInclusions]
  );

  // NEW: Function to detect headers from file using RTK Query
  const detectHeadersFromFile = useCallback(
    async (file: File): Promise<{ headers: string[]; excludedHeaders: string[]; allHeadersInOrder: string[] }> => {
      try {
        const result = await detectHeaders(file).unwrap();
        return {
          headers: result.headers || [],
          excludedHeaders: result.excludedHeaders || [],
          allHeadersInOrder: result.allHeadersInOrder || [...(result.headers || []), ...(result.excludedHeaders || [])],
        };
      } catch (error: any) {
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
    selectedFiles.forEach(async (fileWrapper) => {
      // Skip if we already have header data for this file
      if (fileHeaders[fileWrapper.id]) {
        return;
      }

      try {
        // Step 1: Detect headers from the file using backend (now returns both headers, excludedHeaders, and allHeadersInOrder)
        const { headers: detectedHeaders, excludedHeaders, allHeadersInOrder } = await detectHeadersFromFile(fileWrapper.file);
        console.log(`=== CLIENT: File ${fileWrapper.id} header detection ===`);
        console.log('detectedHeaders:', detectedHeaders);
        console.log('excludedHeaders from detection:', excludedHeaders);
        console.log('allHeadersInOrder from detection:', allHeadersInOrder?.length);

        // Step 2: Fetch database mappings and apply them (pass all headers in original order)
        await fetchAndApplyHeaderMappings(fileWrapper.id, detectedHeaders, excludedHeaders, allHeadersInOrder);

        // Step 3: Mark file as processed
        setCheckedFiles((prev) => new Set([...prev, fileWrapper.id]));
      } catch (error) {
        // Fallback: set empty header data so file doesn't get stuck
        setFileHeaders((prev) => ({
          ...prev,
          [fileWrapper.id]: {
            originalHeaders: [],
            mappedHeaders: [],
            mappings: {},
            excludedHeaders: [],
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

  // Project selection handler - auto-populates client from project data
  // Also re-fetches header mappings to apply project-specific inclusions
  const handleProjectChange = useCallback(
    (selected: ProjectOption | null) => {
      const newValue = selected?.value || '';
      if (newValue !== selectedProjectId) {
        setSelectedProjectId(newValue);
        selectedProjectIdRef.current = newValue; // SET REF IMMEDIATELY
        setProcessStatus('');

        // Auto-populate client from project data if available
        if (newValue && projectList) {
          const selectedProject = projectList.find(
            (p: any) => p.projectId === newValue
          );
          if (selectedProject?.clientId) {
            setSelectedClientId(selectedProject.clientId);
            selectedClientIdRef.current = selectedProject.clientId;
            setSelectedClientName(selectedProject.clientName || '');
          } else {
            // Clear client if project has no client
            setSelectedClientId(null);
            selectedClientIdRef.current = null;
            setSelectedClientName('');
          }
        } else {
          // Clear client if no project selected
          setSelectedClientId(null);
          selectedClientIdRef.current = null;
          setSelectedClientName('');
        }

        // Re-fetch mappings for all files when project changes (to apply project inclusions)
        Object.entries(fileHeaders).forEach(([fileId, headerData]) => {
          if (headerData.originalHeaders.length > 0) {
            // Get the raw excluded headers (before any inclusions were applied)
            const rawExcluded = [
              ...(headerData.excludedHeaders || []),
              ...(headerData.includedFromExclusions || [])
            ];
            // Strip out includedFromExclusions from originalHeaders before re-fetching
            const baseOriginalHeaders = headerData.originalHeaders.filter(
              h => !(headerData.includedFromExclusions || []).includes(h)
            );
            fetchAndApplyHeaderMappings(fileId, baseOriginalHeaders, rawExcluded, headerData.allHeadersInOrder);
          }
        });
      }
    },
    [selectedProjectId, projectList, fileHeaders, fetchAndApplyHeaderMappings]
  );

  // Updated vendor selection handler to refresh mappings
  const handleVendorChange = useCallback(
    (selected: VendorOption | null) => {
      const newValue = selected?.value || null;
      if (newValue !== selectedVendorId) {
        setSelectedVendorId(newValue);
        selectedVendorIdRef.current = newValue; // SET REF IMMEDIATELY
        setProcessStatus('');

        // Re-fetch mappings for all files when vendor changes
        Object.entries(fileHeaders).forEach(([fileId, headerData]) => {
          if (headerData.originalHeaders.length > 0) {
            fetchAndApplyHeaderMappings(fileId, headerData.originalHeaders, headerData.excludedHeaders || [], headerData.allHeadersInOrder);
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

        // Re-fetch mappings for all files when client changes
        Object.entries(fileHeaders).forEach(([fileId, headerData]) => {
          if (headerData.originalHeaders.length > 0) {
            fetchAndApplyHeaderMappings(fileId, headerData.originalHeaders, headerData.excludedHeaders || [], headerData.allHeadersInOrder);
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
      const newValue = event.target.value;
      setSelectedProjectId(newValue);
      setProcessStatus('');

      // Auto-populate client from project data if available
      if (newValue && projectList) {
        const selectedProject = projectList.find(
          (p: any) => p.projectId === newValue
        );
        if (selectedProject?.clientId) {
          setSelectedClientId(selectedProject.clientId);
          selectedClientIdRef.current = selectedProject.clientId;
          setSelectedClientName(selectedProject.clientName || '');
        } else {
          setSelectedClientId(null);
          selectedClientIdRef.current = null;
          setSelectedClientName('');
        }
      } else {
        setSelectedClientId(null);
        selectedClientIdRef.current = null;
        setSelectedClientName('');
      }
    },
    [projectList]
  );

  // Update the allFilesChecked logic
  const allFilesChecked = useMemo(() => {
    return selectedFiles?.every((file) => checkedFiles.has(file.id)) || false;
  }, [selectedFiles, checkedFiles]);

  // Track previous allFilesChecked state to detect when it becomes true
  const prevAllFilesCheckedRef = useRef(false);

  // Show toast notification when all headers are done loading
  useEffect(() => {
    // Only show toast when:
    // 1. allFilesChecked just became true (wasn't true before)
    // 2. There are actually files selected
    // 3. There are headers loaded
    if (
      allFilesChecked &&
      !prevAllFilesCheckedRef.current &&
      selectedFiles.length > 0 &&
      Object.keys(fileHeaders).length > 0
    ) {
      const totalHeaders = Object.values(fileHeaders).reduce(
        (sum, fh) => sum + fh.originalHeaders.length,
        0
      );
      toast.success(
        `${totalHeaders} headers loaded from ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}`,
        'Headers Ready'
      );
    }
    prevAllFilesCheckedRef.current = allFilesChecked;
  }, [allFilesChecked, selectedFiles.length, fileHeaders, toast]);

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
    setSelectedClientName('');
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
      toast.warning('Please select a project');
      return;
    }

    if (selectedFiles.length === 0) {
      setProcessStatus('❌ Please select at least one file');
      toast.warning('Please select at least one file');
      return;
    }

    if (!allFilesChecked) {
      setProcessStatus('❌ Please review headers for all files first');
      toast.warning('Please review headers for all files first');
      return;
    }

    if (!allowExtraHeaders && validationSummary.nonMatchingHeaders.length > 0) {
      setProcessStatus('❌ Please resolve header conflicts before merging');
      toast.warning('Please resolve header conflicts before merging');
      return;
    }

    const formData = new FormData();

    selectedFiles.forEach((item) => {
      formData.append('files', item.file);
    });

    formData.append('projectId', selectedProjectId);

    if (requestedFileId && requestedFileId.trim() !== '') {
    formData.append('requestedFileId', requestedFileId.trim());
  }

    if (selectedVendorId) {
      formData.append('vendorId', selectedVendorId.toString());
    }
    if (selectedClientId) {
      formData.append('clientId', selectedClientId.toString());
    }

     formData.append('ageCalculationMode', ageCalculationMode);
     formData.append('fileType', fileType);

    // Use mapped headers instead of original headers
    const headersMapping: Record<number, string[]> = {};
    const excludedHeadersMapping: Record<number, string[]> = {};
    console.log('=== CLIENT: Building headers mapping ===');
    console.log('selectedFiles count:', selectedFiles.length);
    console.log('fileHeaders keys:', Object.keys(fileHeaders));
    selectedFiles.forEach((item, index) => {
      const headerData = fileHeaders[item.id];
      console.log(`File ${index} (id: ${item.id}):`, {
        hasHeaderData: !!headerData,
        mappedHeadersCount: headerData?.mappedHeaders?.length,
        excludedHeadersCount: headerData?.excludedHeaders?.length,
        excludedHeaders: headerData?.excludedHeaders,
      });
      if (headerData && headerData.mappedHeaders) {
        headersMapping[index] = headerData.mappedHeaders;
      }
      if (headerData && headerData.excludedHeaders) {
        excludedHeadersMapping[index] = headerData.excludedHeaders;
      }
    });

    console.log('=== CLIENT: Final mappings ===');
    console.log('headersMapping:', headersMapping);
    console.log('excludedHeadersMapping:', excludedHeadersMapping);
    console.log('excludedHeadersMapping JSON:', JSON.stringify(excludedHeadersMapping));

    formData.append('customHeaders', JSON.stringify(headersMapping));
    formData.append('excludedColumns', JSON.stringify(excludedHeadersMapping));

    try {
      // Clear previous results to reset step 3
      setProcessResult(null);
      setTablePreview(null);
      setDistinctAgeRanges([]);

      setProcessStatus(
        `Processing ${selectedFiles.length} file${
          selectedFiles.length !== 1 ? 's' : ''
        }...`
      );
      toast.info(`Processing ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}...`, 'Processing');

      const result = await processFile(formData).unwrap();

      if (result.success) {
        setProcessResult(result);
        setProcessStatus(`✅ ${result.message}`);

        // Show success toast with details
        const rowCount = result.rowsInserted?.toLocaleString() || result.totalRows?.toLocaleString() || 0;
        toast.success(`${rowCount} rows processed successfully`, 'Processing Complete');

        // Show CallID assignment toast if applicable
        if (result.callIdAssignment?.success) {
          const assignedCount = result.callIdAssignment.assigned?.length || 0;
          if (assignedCount > 0) {
            toast.success(`${assignedCount} CallIDs auto-assigned`, 'CallID Assignment');
          }
        }

        // Set distinct age ranges from response (already fetched after post-processing)
        if (result.distinctAgeRanges) {
          setDistinctAgeRanges(result.distinctAgeRanges);
        }

        // Fetch table preview after successful upload
        if (result.tableName) {
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
      toast.error(errorMessage, 'Processing Failed');
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
    requestedFileId,
    allowExtraHeaders,
    getTablePreview,
    toast,
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
                  headerData.originalHeaders,
                  headerData.excludedHeaders || [],
                  headerData.allHeadersInOrder
                );
              }
              return Promise.resolve();
            }
          );

          await Promise.all(refreshPromises);

          setProcessStatus('✓ All files refreshed with new mapping');
          toast.success(`Header mapping saved: ${original} → ${mapped}`);
          setTimeout(() => setProcessStatus(''), 2000);
        }
      } catch (error: any) {
        console.error('Error saving mapping:', error);
        const errorMsg = error.message || 'Failed to save mapping';
        setProcessStatus(`❌ Error: ${errorMsg}`);
        toast.error(errorMsg, 'Mapping Save Failed');
      }
    },
    [
      selectedVendorId,
      selectedClientId,
      saveHeaderMappings,
      fetchAndApplyHeaderMappings,
      fileHeaders,
      toast,
    ]
  );

const downloadFile = useCallback(async (url, filename) => {
  try {
    // Make authenticated request with token from Redux store
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    // Get the blob from response
    const blob = await response.blob();

    // Create download link
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the blob URL
    window.URL.revokeObjectURL(downloadUrl);

    // Clean up file after download with delay using RTK Query
    setTimeout(async () => {
      try {
        await cleanupTempFile(filename).unwrap();
      } catch (error) {
        // Cleanup failed silently
      }
    }, 3000); // 3 second delay to ensure download started
  } catch (error) {
    throw error;
  }
}, [token, cleanupTempFile]);


const handleExtractFiles = useCallback(async (config) => {
  try {
    setProcessStatus('🔄 Extracting files...');
    toast.info('Extracting files...', 'Export');
    const result = await extractFiles(config).unwrap();

    if (result.success) {
      setProcessStatus('✅ Files extracted successfully! Downloading...');

      let downloadDelay = 0;
      const DELAY_INCREMENT = 1000; // 1 second between downloads
      let totalFilesDownloaded = 0;

      if (result.splitMode === 'split') {
        // Download landline file
        if (result.files.landline) {
          setTimeout(() => {
            downloadFile(result.files.landline.url, result.files.landline.filename);
          }, downloadDelay);
          downloadDelay += DELAY_INCREMENT;
          totalFilesDownloaded++;
        }

        // Download cell file
        if (result.files.cell) {
          setTimeout(() => {
            downloadFile(result.files.cell.url, result.files.cell.filename);
          }, downloadDelay);
          downloadDelay += DELAY_INCREMENT;
          totalFilesDownloaded++;
        }
      } else {
        // Download single file
        if (result.files.single) {
          setTimeout(() => {
            downloadFile(result.files.single.url, result.files.single.filename);
          }, downloadDelay);
          downloadDelay += DELAY_INCREMENT;
          totalFilesDownloaded++;
        }
      }

      // NEW: Download householding duplicate files if they exist
      if (result.householdingDuplicateFiles && result.householdingDuplicateFiles.files) {
        const duplicateFiles = result.householdingDuplicateFiles.files;

        // Download duplicate2 file
        if (duplicateFiles.duplicate2) {
          setTimeout(() => {
            downloadFile(duplicateFiles.duplicate2.url, duplicateFiles.duplicate2.filename);
          }, downloadDelay);
          downloadDelay += DELAY_INCREMENT;
          totalFilesDownloaded++;
        }

        // Download duplicate3 file
        if (duplicateFiles.duplicate3) {
          setTimeout(() => {
            downloadFile(duplicateFiles.duplicate3.url, duplicateFiles.duplicate3.filename);
          }, downloadDelay);
          downloadDelay += DELAY_INCREMENT;
          totalFilesDownloaded++;
        }

        // Download duplicate4 file
        if (duplicateFiles.duplicate4) {
          setTimeout(() => {
            downloadFile(duplicateFiles.duplicate4.url, duplicateFiles.duplicate4.filename);
          }, downloadDelay);
          downloadDelay += DELAY_INCREMENT;
          totalFilesDownloaded++;
        }

        // Update status message to include householding info
        const totalDuplicateFiles = result.householdingDuplicateFiles.filesGenerated || 0;
        const totalDuplicateRecords = result.householdingDuplicateFiles.totalRecords || 0;

        if (totalDuplicateFiles > 0) {
          setTimeout(() => {
            setProcessStatus(
              `✅ Downloaded ${result.splitMode === 'split' ? '2' : '1'} main file(s) + ${totalDuplicateFiles} householding duplicate file(s) (${totalDuplicateRecords} records)`
            );
          }, downloadDelay);
        }
      }

      toast.success(`${totalFilesDownloaded} file${totalFilesDownloaded !== 1 ? 's' : ''} downloading`, 'Export Complete');

      // Clear status after a delay
      setTimeout(() => {
        setProcessStatus('');
      }, downloadDelay + 5000);

    } else {
      setProcessStatus(`❌ Extraction failed: ${result.message}`);
      toast.error(result.message || 'Extraction failed', 'Export Failed');
    }
  } catch (error: any) {
    const errorMessage = error?.data?.message || error?.message || 'Failed to extract files';
    setProcessStatus(`❌ Error extracting files: ${errorMessage}`);
    toast.error(errorMessage, 'Export Failed');
  }
}, [extractFiles, downloadFile, setProcessStatus, toast]);

  // Handle split configuration changes
const handleSplitConfigChange = useCallback(async (config: any) => {
  setSplitConfiguration(config);

  // Handle extract action
  if (config.action === 'extract') {
    // Add clientId to config for Tarrance client detection
    const configWithClient = {
      ...config,
      clientId: selectedClientId
    };
    await handleExtractFiles(configWithClient);
  }
}, [handleExtractFiles, selectedClientId]);

// Fetch distinct age ranges from processed table
const fetchDistinctAgeRanges = useCallback(async (tableName: string) => {
  if (!tableName) return;

  try {
    const result = await getDistinctAgeRanges({ tableName }).unwrap();

    if (result.success) {
      setDistinctAgeRanges(result.ageRanges || []);
    }
  } catch (error) {
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
    } else {
      setProcessStatus(`❌ Failed to generate split files: ${result.message}`);
    }
  } catch (error: any) {
    setProcessStatus(`❌ Error generating split files: ${error.message}`);
  }
}, [splitConfiguration, processResult]);

// Function to include an excluded header (move from excluded to included)
// Also persists to database if a project is selected
const handleIncludeExcludedHeader = useCallback(async (fileId: string, headerName: string) => {
  console.log(`=== handleIncludeExcludedHeader called ===`);
  console.log(`fileId: ${fileId}, headerName: ${headerName}`);

  // Update local state immediately
  setFileHeaders((prev) => {
    const fileData = prev[fileId];
    if (!fileData) {
      console.log('No fileData found for fileId:', fileId);
      return prev;
    }

    const excludedHeaders = fileData.excludedHeaders || [];
    const includedFromExclusions = fileData.includedFromExclusions || [];
    const allHeadersInOrder = fileData.allHeadersInOrder || [...fileData.originalHeaders, ...excludedHeaders];

    console.log('Before update - excludedHeaders:', excludedHeaders);
    console.log('Before update - includedFromExclusions:', includedFromExclusions);
    console.log('allHeadersInOrder:', allHeadersInOrder);

    // Remove from excluded, add to includedFromExclusions tracking
    const newExcluded = excludedHeaders.filter(h => h !== headerName);
    const newIncluded = [...includedFromExclusions, headerName];

    // Build new headers list by filtering from allHeadersInOrder to maintain correct order
    // Include headers that are either:
    // 1. Already in originalHeaders (not in excluded set)
    // 2. In the newIncluded list (being added now)
    const excludedSet = new Set(newExcluded.map(h => h.toUpperCase()));
    const newOriginalHeaders = allHeadersInOrder.filter(h => !excludedSet.has(h.toUpperCase()));

    // Apply mappings to get mapped headers in the same order
    const newMappedHeaders = newOriginalHeaders.map(h => {
      const upper = h.toUpperCase();
      const mapping = fileData.mappings[upper];
      return mapping ? mapping.mapped : h;
    });

    console.log('After update - newExcluded:', newExcluded);
    console.log('After update - newIncluded:', newIncluded);
    console.log('After update - newOriginalHeaders:', newOriginalHeaders);
    console.log('After update - newMappedHeaders:', newMappedHeaders);

    return {
      ...prev,
      [fileId]: {
        ...fileData,
        originalHeaders: newOriginalHeaders,
        mappedHeaders: newMappedHeaders,
        excludedHeaders: newExcluded,
        includedFromExclusions: newIncluded,
        allHeadersInOrder, // Preserve
      },
    };
  });

  // Persist to database if a project is selected
  if (selectedProjectId) {
    try {
      await addProjectVariableInclusion({
        projectId: parseInt(selectedProjectId),
        originalVariableName: headerName,
        mappedVariableName: headerName, // Keep same name
      }).unwrap();
      toast.success(`"${headerName}" will be included for this project`, 'Variable Saved');
    } catch (error: any) {
      // Don't show error if it's a duplicate (already saved)
      if (!error?.data?.message?.includes('already included')) {
        console.error('Failed to save project variable inclusion:', error);
      }
    }
  }
}, [selectedProjectId, addProjectVariableInclusion, toast]);

// Function to exclude an included header (move from included back to excluded)
// Also removes from database if a project is selected
const handleExcludeIncludedHeader = useCallback(async (fileId: string, headerName: string, inclusionId?: number) => {
  // Update local state immediately
  setFileHeaders((prev) => {
    const fileData = prev[fileId];
    if (!fileData) return prev;

    const excludedHeaders = fileData.excludedHeaders || [];
    const includedFromExclusions = fileData.includedFromExclusions || [];
    const allHeadersInOrder = fileData.allHeadersInOrder || [...fileData.originalHeaders, ...excludedHeaders];

    // Only allow excluding headers that were previously included from exclusions
    if (!includedFromExclusions.includes(headerName)) return prev;

    // Remove from included, add back to excluded
    const newIncluded = includedFromExclusions.filter(h => h !== headerName);
    const newExcluded = [...excludedHeaders, headerName];

    // Build new headers list by filtering from allHeadersInOrder to maintain correct order
    const excludedSet = new Set(newExcluded.map(h => h.toUpperCase()));
    const newOriginalHeaders = allHeadersInOrder.filter(h => !excludedSet.has(h.toUpperCase()));

    // Apply mappings to get mapped headers in the same order
    const newMappedHeaders = newOriginalHeaders.map(h => {
      const upper = h.toUpperCase();
      const mapping = fileData.mappings[upper];
      return mapping ? mapping.mapped : h;
    });

    return {
      ...prev,
      [fileId]: {
        ...fileData,
        originalHeaders: newOriginalHeaders,
        mappedHeaders: newMappedHeaders,
        excludedHeaders: newExcluded,
        includedFromExclusions: newIncluded,
        allHeadersInOrder, // Preserve
      },
    };
  });

  // Remove from database if inclusionId is provided
  if (inclusionId) {
    try {
      await deleteProjectVariableInclusion(inclusionId).unwrap();
      toast.info(`"${headerName}" removed from project inclusions`, 'Variable Removed');
    } catch (error: any) {
      console.error('Failed to delete project variable inclusion:', error);
    }
  }
}, [deleteProjectVariableInclusion, toast]);

  return {
    // State
    selectedFiles,
    dragActive,
    selectedProjectId,
    selectedVendorId,
    selectedClientId,
    selectedClientName,

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

    // Split configuration exports
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

  requestedFileId,
  setRequestedFileId,

  fileType,
  setFileType,

  // Include/Exclude header toggling
  handleIncludeExcludedHeader,
  handleExcludeIncludedHeader,
  };
};
