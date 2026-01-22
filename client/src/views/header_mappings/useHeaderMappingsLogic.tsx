import { useState, useMemo, useCallback } from 'react';
import {
  useGetAllHeaderMappingsQuery,
  useGetClientsAndVendorsQuery,
  useSaveHeaderMappingsMutation,
  useDeleteHeaderMappingMutation,
} from '../../features/sampleAutomationApiSlice';

interface HeaderMapping {
  originalHeader: string;
  mappedHeader: string;
  vendorId: number | null;
  clientId: number | null;
  vendorName: string;
  clientName: string;
  createdDate: string;
  modifiedDate: string | null;
}

interface FilterState {
  vendorId: number | undefined;
  clientId: number | undefined;
  search: string;
}

interface EditingMapping {
  originalHeader: string;
  mappedHeader: string;
  vendorId: number | null;
  clientId: number | null;
  isNew?: boolean;
}

const useHeaderMappingsLogic = () => {
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    vendorId: undefined,
    clientId: undefined,
    search: '',
  });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<EditingMapping | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<HeaderMapping | null>(null);

  // RTK Query hooks
  const {
    data: mappingsData,
    isLoading: mappingsLoading,
    isFetching: mappingsFetching,
    error: mappingsError,
    refetch: refetchMappings,
  } = useGetAllHeaderMappingsQuery(filters);

  const {
    data: clientsVendorsData,
    isLoading: clientsVendorsLoading,
  } = useGetClientsAndVendorsQuery();

  const [saveHeaderMappings, { isLoading: isSaving }] = useSaveHeaderMappingsMutation();
  const [deleteHeaderMapping, { isLoading: isDeleting }] = useDeleteHeaderMappingMutation();

  // Memoized lists
  const mappings = useMemo(() => mappingsData?.data || [], [mappingsData]);

  const vendors = useMemo(() => {
    if (!clientsVendorsData?.vendors) return [];
    return clientsVendorsData.vendors.map(v => ({
      value: v.VendorID,
      label: v.VendorName,
    }));
  }, [clientsVendorsData]);

  const clients = useMemo(() => {
    if (!clientsVendorsData?.clients) return [];
    return clientsVendorsData.clients.map(c => ({
      value: c.ClientID,
      label: c.ClientName,
    }));
  }, [clientsVendorsData]);

  // Filter handlers
  const handleVendorFilterChange = useCallback((option: { value: number; label: string } | null) => {
    setFilters(prev => ({ ...prev, vendorId: option?.value }));
  }, []);

  const handleClientFilterChange = useCallback((option: { value: number; label: string } | null) => {
    setFilters(prev => ({ ...prev, clientId: option?.value }));
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ vendorId: undefined, clientId: undefined, search: '' });
  }, []);

  // Modal handlers
  const openAddModal = useCallback(() => {
    setEditingMapping({
      originalHeader: '',
      mappedHeader: '',
      vendorId: null,
      clientId: null,
      isNew: true,
    });
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((mapping: HeaderMapping) => {
    setEditingMapping({
      originalHeader: mapping.originalHeader,
      mappedHeader: mapping.mappedHeader,
      vendorId: mapping.vendorId,
      clientId: mapping.clientId,
      isNew: false,
    });
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingMapping(null);
  }, []);

  // Save handler
  const handleSave = useCallback(async (mapping: EditingMapping) => {
    try {
      await saveHeaderMappings({
        vendorId: mapping.vendorId,
        clientId: mapping.clientId,
        mappings: [{
          original: mapping.originalHeader,
          mapped: mapping.mappedHeader,
        }],
      }).unwrap();

      closeModal();
      refetchMappings();
      return { success: true };
    } catch (error: any) {
      console.error('Error saving mapping:', error);
      return { success: false, error: error.message || 'Failed to save mapping' };
    }
  }, [saveHeaderMappings, closeModal, refetchMappings]);

  // Delete handlers
  const openDeleteConfirm = useCallback((mapping: HeaderMapping) => {
    setDeleteConfirm(mapping);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    setDeleteConfirm(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;

    try {
      await deleteHeaderMapping({
        originalHeader: deleteConfirm.originalHeader,
        vendorId: deleteConfirm.vendorId,
        clientId: deleteConfirm.clientId,
      }).unwrap();

      closeDeleteConfirm();
      refetchMappings();
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting mapping:', error);
      return { success: false, error: error.message || 'Failed to delete mapping' };
    }
  }, [deleteConfirm, deleteHeaderMapping, closeDeleteConfirm, refetchMappings]);

  // Loading state
  const isLoading = mappingsLoading || clientsVendorsLoading;
  const isRefetching = mappingsFetching && !mappingsLoading;

  return {
    // Data
    mappings,
    vendors,
    clients,
    filters,

    // Loading states
    isLoading,
    isRefetching,
    isSaving,
    isDeleting,

    // Error state
    error: mappingsError,

    // Modal state
    isModalOpen,
    editingMapping,
    deleteConfirm,

    // Filter handlers
    handleVendorFilterChange,
    handleClientFilterChange,
    handleSearchChange,
    clearFilters,

    // Modal handlers
    openAddModal,
    openEditModal,
    closeModal,
    setEditingMapping,

    // Save/Delete handlers
    handleSave,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDelete,

    // Refresh
    refetchMappings,
  };
};

export default useHeaderMappingsLogic;
