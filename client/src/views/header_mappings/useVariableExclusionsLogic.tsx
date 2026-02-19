import { useState, useMemo, useCallback } from 'react';
import {
  useGetVariableExclusionsQuery,
  useAddVariableExclusionMutation,
  useUpdateVariableExclusionMutation,
  useDeleteVariableExclusionMutation,
} from '../sample_automation/sampleAutomationApiSlice';

export interface VariableExclusion {
  exclusionId: number;
  variableName: string;
  description: string | null;
  createdDate: string;
  createdBy: string | null;
}

interface EditingExclusion {
  exclusionId?: number;
  variableName: string;
  description: string;
  isNew?: boolean;
}

const useVariableExclusionsLogic = () => {
  // Search state
  const [search, setSearch] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExclusion, setEditingExclusion] = useState<EditingExclusion | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<VariableExclusion | null>(null);

  // RTK Query hooks
  const {
    data: exclusionsData,
    isLoading,
    isFetching,
    error,
    refetch: refetchExclusions,
  } = useGetVariableExclusionsQuery({ search });

  const [addExclusion, { isLoading: isAdding }] = useAddVariableExclusionMutation();
  const [updateExclusion, { isLoading: isUpdating }] = useUpdateVariableExclusionMutation();
  const [deleteExclusion, { isLoading: isDeleting }] = useDeleteVariableExclusionMutation();

  // Memoized list
  const exclusions = useMemo(() => exclusionsData?.data || [], [exclusionsData]);

  // Search handler
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  // Modal handlers
  const openAddModal = useCallback(() => {
    setEditingExclusion({
      variableName: '',
      description: '',
      isNew: true,
    });
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((exclusion: VariableExclusion) => {
    setEditingExclusion({
      exclusionId: exclusion.exclusionId,
      variableName: exclusion.variableName,
      description: exclusion.description || '',
      isNew: false,
    });
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingExclusion(null);
  }, []);

  // Save handler
  const handleSave = useCallback(async (exclusion: EditingExclusion) => {
    try {
      if (exclusion.isNew) {
        await addExclusion({
          variableName: exclusion.variableName,
          description: exclusion.description || undefined,
        }).unwrap();
      } else if (exclusion.exclusionId) {
        await updateExclusion({
          exclusionId: exclusion.exclusionId,
          description: exclusion.description || undefined,
        }).unwrap();
      }

      closeModal();
      refetchExclusions();
      return { success: true };
    } catch (error: any) {
      console.error('Error saving exclusion:', error);
      const errorMessage = error?.data?.message || error.message || 'Failed to save exclusion';
      return { success: false, error: errorMessage };
    }
  }, [addExclusion, updateExclusion, closeModal, refetchExclusions]);

  // Delete handlers
  const openDeleteConfirm = useCallback((exclusion: VariableExclusion) => {
    setDeleteConfirm(exclusion);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    setDeleteConfirm(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;

    try {
      await deleteExclusion(deleteConfirm.exclusionId).unwrap();

      closeDeleteConfirm();
      refetchExclusions();
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting exclusion:', error);
      return { success: false, error: error.message || 'Failed to delete exclusion' };
    }
  }, [deleteConfirm, deleteExclusion, closeDeleteConfirm, refetchExclusions]);

  // Loading state
  const isRefetching = isFetching && !isLoading;
  const isSaving = isAdding || isUpdating;

  return {
    // Data
    exclusions,
    search,

    // Loading states
    isLoading,
    isRefetching,
    isSaving,
    isDeleting,

    // Error state
    error,

    // Modal state
    isModalOpen,
    editingExclusion,
    deleteConfirm,

    // Search handler
    handleSearchChange,

    // Modal handlers
    openAddModal,
    openEditModal,
    closeModal,
    setEditingExclusion,

    // Save/Delete handlers
    handleSave,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDelete,

    // Refresh
    refetchExclusions,
  };
};

export default useVariableExclusionsLogic;
