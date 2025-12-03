import React from 'react';
import Icon from '@mdi/react';
import { mdiPlus, mdiFilterOutline, mdiDatabase } from '@mdi/js';
import { useProjectNumberingLogic } from './useProjectNumberingLogic';
import ProjectsTable from './ProjectsTable';
import ProjectModal from './ProjectModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import SearchBar from './SearchBar';
import AdvancedSearchModal from './AdvancedSearchModal';
import Pagination from './Pagination';
import './Projects.css';

const ProjectNumbering = () => {
  const {
    projects,
    total,
    page,
    limit,
    totalPages,
    sortBy,
    sortOrder,
    searchTerm,
    searchResults,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isSearching,
    error,
    isAddModalOpen,
    isEditModalOpen,
    isDeleteModalOpen,
    isAdvancedSearchOpen,
    selectedProject,
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
  } = useProjectNumberingLogic();

  return (
    <div className="projects-container">
      {/* Header */}
      <div className="projects-header">
        <div className="projects-header-left">
          <h1>
            <Icon path={mdiDatabase} size={1} />
            Project Database
          </h1>
          <p className="projects-subtitle">
            Manage and track all project information
          </p>
        </div>
        <div className="projects-header-right">
          <button className="btn-primary" onClick={openAddModal}>
            <Icon path={mdiPlus} size={0.8} />
            Add Project
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="projects-controls">
        <SearchBar
          value={searchTerm}
          onChange={handleSearch}
          onClear={clearSearch}
          placeholder="Search by project name, number, client, or contact..."
          isSearching={isSearching}
        />
        <button
          className="btn-secondary btn-with-icon"
          onClick={toggleAdvancedSearch}
        >
          <Icon path={mdiFilterOutline} size={0.8} />
          Advanced Search
        </button>
      </div>

      {/* Results Info */}
      <div className="projects-info">
        {searchResults ? (
          <div className="search-results-info">
            <span className="results-badge">
              {total} result{total !== 1 ? 's' : ''} found
            </span>
            <button className="btn-link" onClick={clearSearch}>
              Clear search
            </button>
          </div>
        ) : (
          <span className="total-count">
            Total Projects: <strong>{total}</strong>
          </span>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <p>Error loading projects: {error.message || 'Unknown error'}</p>
        </div>
      )}

      {/* Projects Table */}
      <ProjectsTable
        projects={projects}
        isLoading={isLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
      />

      {/* Pagination */}
      {!searchResults && totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          limit={limit}
          onLimitChange={handleLimitChange}
        />
      )}

      {/* Modals */}
      {isAddModalOpen && (
        <ProjectModal
          isOpen={isAddModalOpen}
          onClose={closeAddModal}
          onSubmit={handleAddProject}
          isLoading={isCreating}
          mode="create"
        />
      )}

      {isEditModalOpen && selectedProject && (
        <ProjectModal
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          onSubmit={handleEditProject}
          isLoading={isUpdating}
          mode="edit"
          initialData={selectedProject}
        />
      )}

      {isDeleteModalOpen && selectedProject && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteProject}
          isLoading={isDeleting}
          projectName={selectedProject.projectName}
          projectID={selectedProject.projectID}
        />
      )}

      {isAdvancedSearchOpen && (
        <AdvancedSearchModal
          isOpen={isAdvancedSearchOpen}
          onClose={toggleAdvancedSearch}
          onSearch={handleAdvancedSearch}
          isLoading={isSearching}
        />
      )}
    </div>
  );
};

export default ProjectNumbering;
