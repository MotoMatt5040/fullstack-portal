import { useState, useEffect } from 'react';
import {
  useGetProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useSearchProjectsMutation,
} from '../../features/projectNumberingApiSlice';

export const useProjectNumberingLogic = () => {
  // State for pagination and filtering
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(75);
  const [sortBy, setSortBy] = useState('projectID');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // State for modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // State for advanced search
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to first page on new search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch projects with current filters
  const {
    data: projectsData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetProjectsQuery({
    page,
    limit,
    sortBy,
    sortOrder,
    search: debouncedSearch,
  });

  // Mutations
  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();
  const [updateProject, { isLoading: isUpdating }] = useUpdateProjectMutation();
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();
  const [searchProjects, { isLoading: isSearching }] = useSearchProjectsMutation();

  // Handle sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      // Toggle sort order if clicking same column
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      // Set new column and default to DESC
      setSortBy(column);
      setSortOrder('DESC');
    }
    setPage(1); // Reset to first page on sort change
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing limit
  };

  // Handle search
  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults(null);
  };

  // Handle advanced search
  const handleAdvancedSearch = async (criteria) => {
    try {
      const result = await searchProjects(criteria).unwrap();
      setSearchResults(result);
      setIsAdvancedSearchOpen(false);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  // Handle add project
  const handleAddProject = async (projectData) => {
    try {
      await createProject(projectData).unwrap();
      setIsAddModalOpen(false);
      return { success: true };
    } catch (error) {
      console.error('Create error:', error);
      return { success: false, error };
    }
  };

  // Handle edit project
  const handleEditProject = async (projectData) => {
    try {
      await updateProject({
        projectID: selectedProject.projectID,
        ...projectData,
      }).unwrap();
      setIsEditModalOpen(false);
      setSelectedProject(null);
      return { success: true };
    } catch (error) {
      console.error('Update error:', error);
      return { success: false, error };
    }
  };

  // Handle delete project
  const handleDeleteProject = async () => {
    try {
      await deleteProject(selectedProject.projectID).unwrap();
      setIsDeleteModalOpen(false);
      setSelectedProject(null);
      return { success: true };
    } catch (error) {
      console.error('Delete error:', error);
      return { success: false, error };
    }
  };

  // Modal handlers
  const openAddModal = () => {
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
  };

  const openEditModal = (project) => {
    setSelectedProject(project);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedProject(null);
  };

  const openDeleteModal = (project) => {
    setSelectedProject(project);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedProject(null);
  };

  const toggleAdvancedSearch = () => {
    setIsAdvancedSearchOpen(!isAdvancedSearchOpen);
  };

  return {
    // Data
    projects: searchResults?.projects || projectsData?.projects || [],
    total: searchResults ? searchResults.count : projectsData?.total || 0,
    page,
    limit,
    totalPages: projectsData?.totalPages || 1,
    sortBy,
    sortOrder,
    searchTerm,
    searchResults,

    // Loading states
    isLoading: isLoading || isFetching,
    isCreating,
    isUpdating,
    isDeleting,
    isSearching,
    error,

    // Modal states
    isAddModalOpen,
    isEditModalOpen,
    isDeleteModalOpen,
    isAdvancedSearchOpen,
    selectedProject,

    // Handlers
    handleSort,
    handlePageChange,
    handleLimitChange,
    handleSearch,
    clearSearch,
    handleAdvancedSearch,
    handleAddProject,
    handleEditProject,
    handleDeleteProject,
    openAddModal,
    closeAddModal,
    openEditModal,
    closeEditModal,
    openDeleteModal,
    closeDeleteModal,
    toggleAdvancedSearch,
    refetch,
  };
};