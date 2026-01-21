import React, { useState } from 'react';
import Select from 'react-select';
import Icon from '@mdi/react';
import {
  mdiSwapHorizontal,
  mdiPlus,
  mdiPencil,
  mdiDelete,
  mdiMagnify,
  mdiFilterRemove,
  mdiRefresh,
  mdiCancel,
} from '@mdi/js';

import './HeaderMappings.css';
import useHeaderMappingsLogic from './useHeaderMappingsLogic';
import useVariableExclusionsLogic, { VariableExclusion } from './useVariableExclusionsLogic';

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

interface EditingMapping {
  originalHeader: string;
  mappedHeader: string;
  vendorId: number | null;
  clientId: number | null;
  isNew?: boolean;
}

interface EditingExclusion {
  exclusionId?: number;
  variableName: string;
  description: string;
  isNew?: boolean;
}

// Edit/Add Mapping Modal Component
interface MappingModalProps {
  isOpen: boolean;
  mapping: EditingMapping | null;
  vendors: { value: number; label: string }[];
  clients: { value: number; label: string }[];
  onClose: () => void;
  onSave: (mapping: EditingMapping) => Promise<{ success: boolean; error?: string }>;
  onChange: (mapping: EditingMapping) => void;
  isSaving: boolean;
}

const MappingModal: React.FC<MappingModalProps> = ({
  isOpen,
  mapping,
  vendors,
  clients,
  onClose,
  onSave,
  onChange,
  isSaving,
}) => {
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !mapping) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!mapping.originalHeader.trim()) {
      setError('Original header is required');
      return;
    }
    if (!mapping.mappedHeader.trim()) {
      setError('Mapped header is required');
      return;
    }

    const result = await onSave(mapping);
    if (!result.success && result.error) {
      setError(result.error);
    }
  };

  return (
    <div className="hm-modal-overlay" onClick={onClose}>
      <div className="hm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hm-modal-header">
          <h2>{mapping.isNew ? 'Add Header Mapping' : 'Edit Header Mapping'}</h2>
          <button className="hm-modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="hm-modal-body">
            {error && <div className="hm-modal-error">{error}</div>}

            <div className="hm-form-group">
              <label>Original Header</label>
              <input
                type="text"
                value={mapping.originalHeader}
                onChange={(e) => onChange({ ...mapping, originalHeader: e.target.value.toUpperCase() })}
                placeholder="e.g., FIRSTNAME"
                disabled={!mapping.isNew}
                className={!mapping.isNew ? 'disabled' : ''}
              />
              {!mapping.isNew && (
                <span className="hm-form-hint">Original header cannot be changed when editing</span>
              )}
            </div>

            <div className="hm-form-group">
              <label>Mapped Header</label>
              <input
                type="text"
                value={mapping.mappedHeader}
                onChange={(e) => onChange({ ...mapping, mappedHeader: e.target.value.toUpperCase() })}
                placeholder="e.g., FNAME"
              />
            </div>

            <div className="hm-form-row">
              <div className="hm-form-group">
                <label>Vendor (Optional)</label>
                <Select
                  classNamePrefix="my-select"
                  className="hm-select"
                  options={vendors}
                  value={vendors.find(v => v.value === mapping.vendorId) || null}
                  onChange={(opt) => onChange({ ...mapping, vendorId: opt?.value || null })}
                  isClearable
                  placeholder="All Vendors"
                  isDisabled={!mapping.isNew}
                />
              </div>

              <div className="hm-form-group">
                <label>Client (Optional)</label>
                <Select
                  classNamePrefix="my-select"
                  className="hm-select"
                  options={clients}
                  value={clients.find(c => c.value === mapping.clientId) || null}
                  onChange={(opt) => onChange({ ...mapping, clientId: opt?.value || null })}
                  isClearable
                  placeholder="All Clients"
                  isDisabled={!mapping.isNew}
                />
              </div>
            </div>

            <div className="hm-form-hint-box">
              <strong>Mapping Priority:</strong>
              <ul>
                <li>Vendor + Client specific mappings have highest priority</li>
                <li>Vendor-only mappings come next</li>
                <li>Client-only mappings follow</li>
                <li>Global mappings (no vendor/client) are used as fallback</li>
              </ul>
            </div>
          </div>

          <div className="hm-modal-footer">
            <button type="button" className="hm-btn hm-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="hm-btn hm-btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Mapping'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Delete Confirmation Modal for Mappings
interface DeleteMappingConfirmModalProps {
  mapping: HeaderMapping | null;
  onClose: () => void;
  onConfirm: () => Promise<{ success: boolean; error?: string } | void>;
  isDeleting: boolean;
}

const DeleteMappingConfirmModal: React.FC<DeleteMappingConfirmModalProps> = ({
  mapping,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  if (!mapping) return null;

  return (
    <div className="hm-modal-overlay" onClick={onClose}>
      <div className="hm-modal hm-modal-small" onClick={(e) => e.stopPropagation()}>
        <div className="hm-modal-header">
          <h2>Delete Mapping</h2>
          <button className="hm-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="hm-modal-body">
          <p>Are you sure you want to delete this mapping?</p>
          <div className="hm-delete-details">
            <div><strong>Original:</strong> {mapping.originalHeader}</div>
            <div><strong>Mapped:</strong> {mapping.mappedHeader}</div>
            <div><strong>Vendor:</strong> {mapping.vendorName}</div>
            <div><strong>Client:</strong> {mapping.clientName}</div>
          </div>
        </div>
        <div className="hm-modal-footer">
          <button className="hm-btn hm-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="hm-btn hm-btn-danger"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Edit/Add Exclusion Modal Component
interface ExclusionModalProps {
  isOpen: boolean;
  exclusion: EditingExclusion | null;
  onClose: () => void;
  onSave: (exclusion: EditingExclusion) => Promise<{ success: boolean; error?: string }>;
  onChange: (exclusion: EditingExclusion) => void;
  isSaving: boolean;
}

const ExclusionModal: React.FC<ExclusionModalProps> = ({
  isOpen,
  exclusion,
  onClose,
  onSave,
  onChange,
  isSaving,
}) => {
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !exclusion) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!exclusion.variableName.trim()) {
      setError('Variable name is required');
      return;
    }

    const result = await onSave(exclusion);
    if (!result.success && result.error) {
      setError(result.error);
    }
  };

  return (
    <div className="hm-modal-overlay" onClick={onClose}>
      <div className="hm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hm-modal-header">
          <h2>{exclusion.isNew ? 'Add Variable Exclusion' : 'Edit Variable Exclusion'}</h2>
          <button className="hm-modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="hm-modal-body">
            {error && <div className="hm-modal-error">{error}</div>}

            <div className="hm-form-group">
              <label>Variable Name</label>
              <input
                type="text"
                value={exclusion.variableName}
                onChange={(e) => onChange({ ...exclusion, variableName: e.target.value.toUpperCase() })}
                placeholder="e.g., SOURCEID"
                disabled={!exclusion.isNew}
                className={!exclusion.isNew ? 'disabled' : ''}
              />
              {!exclusion.isNew && (
                <span className="hm-form-hint">Variable name cannot be changed when editing</span>
              )}
            </div>

            <div className="hm-form-group">
              <label>Description (Optional)</label>
              <input
                type="text"
                value={exclusion.description}
                onChange={(e) => onChange({ ...exclusion, description: e.target.value })}
                placeholder="Why is this variable excluded?"
              />
            </div>

            <div className="hm-form-hint-box">
              <strong>Note:</strong> Variables added here will be automatically excluded from all uploaded sample files.
              If a specific project needs this variable, it can be overridden during file processing.
            </div>
          </div>

          <div className="hm-modal-footer">
            <button type="button" className="hm-btn hm-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="hm-btn hm-btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Exclusion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Delete Confirmation Modal for Exclusions
interface DeleteExclusionConfirmModalProps {
  exclusion: VariableExclusion | null;
  onClose: () => void;
  onConfirm: () => Promise<{ success: boolean; error?: string } | void>;
  isDeleting: boolean;
}

const DeleteExclusionConfirmModal: React.FC<DeleteExclusionConfirmModalProps> = ({
  exclusion,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  if (!exclusion) return null;

  return (
    <div className="hm-modal-overlay" onClick={onClose}>
      <div className="hm-modal hm-modal-small" onClick={(e) => e.stopPropagation()}>
        <div className="hm-modal-header">
          <h2>Delete Exclusion</h2>
          <button className="hm-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="hm-modal-body">
          <p>Are you sure you want to delete this exclusion?</p>
          <div className="hm-delete-details">
            <div><strong>Variable:</strong> {exclusion.variableName}</div>
            {exclusion.description && (
              <div><strong>Description:</strong> {exclusion.description}</div>
            )}
          </div>
          <p className="hm-warning-text">
            Removing this exclusion means this variable will be included in future file uploads.
          </p>
        </div>
        <div className="hm-modal-footer">
          <button className="hm-btn hm-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="hm-btn hm-btn-danger"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Component
const HeaderMappings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'mappings' | 'exclusions'>('mappings');

  // Header Mappings logic
  const mappingsLogic = useHeaderMappingsLogic();
  const {
    mappings,
    vendors,
    clients,
    filters,
    isLoading: mappingsLoading,
    isRefetching: mappingsRefetching,
    isSaving: mappingsSaving,
    isDeleting: mappingsDeleting,
    error: mappingsError,
    isModalOpen: mappingsModalOpen,
    editingMapping,
    deleteConfirm: mappingDeleteConfirm,
    handleVendorFilterChange,
    handleClientFilterChange,
    handleSearchChange: handleMappingSearchChange,
    clearFilters,
    openAddModal: openAddMappingModal,
    openEditModal: openEditMappingModal,
    closeModal: closeMappingModal,
    setEditingMapping,
    handleSave: handleSaveMapping,
    openDeleteConfirm: openMappingDeleteConfirm,
    closeDeleteConfirm: closeMappingDeleteConfirm,
    handleDelete: handleDeleteMapping,
    refetchMappings,
  } = mappingsLogic;

  // Variable Exclusions logic
  const exclusionsLogic = useVariableExclusionsLogic();
  const {
    exclusions,
    search: exclusionSearch,
    isLoading: exclusionsLoading,
    isRefetching: exclusionsRefetching,
    isSaving: exclusionsSaving,
    isDeleting: exclusionsDeleting,
    error: exclusionsError,
    isModalOpen: exclusionsModalOpen,
    editingExclusion,
    deleteConfirm: exclusionDeleteConfirm,
    handleSearchChange: handleExclusionSearchChange,
    openAddModal: openAddExclusionModal,
    openEditModal: openEditExclusionModal,
    closeModal: closeExclusionModal,
    setEditingExclusion,
    handleSave: handleSaveExclusion,
    openDeleteConfirm: openExclusionDeleteConfirm,
    closeDeleteConfirm: closeExclusionDeleteConfirm,
    handleDelete: handleDeleteExclusion,
    refetchExclusions,
  } = exclusionsLogic;

  const isLoading = activeTab === 'mappings' ? mappingsLoading : exclusionsLoading;
  const error = activeTab === 'mappings' ? mappingsError : exclusionsError;

  if (isLoading) {
    return (
      <div className="header-mappings">
        <div className="hm-header">
          <h1>
            <Icon path={mdiSwapHorizontal} size={1} />
            Header Mappings
          </h1>
        </div>
        <div className="hm-loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="header-mappings">
        <div className="hm-header">
          <h1>
            <Icon path={mdiSwapHorizontal} size={1} />
            Header Mappings
          </h1>
        </div>
        <div className="hm-error">
          Error loading data. Please try again.
        </div>
      </div>
    );
  }

  const hasActiveFilters = filters.vendorId !== undefined ||
    filters.clientId !== undefined ||
    filters.search !== '';

  return (
    <div className="header-mappings">
      <div className="hm-header">
        <div className="hm-header-left">
          <h1>
            <Icon path={mdiSwapHorizontal} size={1} />
            Header Mappings
          </h1>
          <p className="hm-subtitle">Manage header mappings and variable exclusions for sample file processing</p>
        </div>
        <div className="hm-header-right">
          {activeTab === 'mappings' ? (
            <button className="hm-btn hm-btn-primary" onClick={openAddMappingModal}>
              <Icon path={mdiPlus} size={0.75} />
              Add Mapping
            </button>
          ) : (
            <button className="hm-btn hm-btn-primary" onClick={openAddExclusionModal}>
              <Icon path={mdiPlus} size={0.75} />
              Add Exclusion
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="hm-tabs">
        <button
          className={`hm-tab ${activeTab === 'mappings' ? 'active' : ''}`}
          onClick={() => setActiveTab('mappings')}
        >
          <Icon path={mdiSwapHorizontal} size={0.75} />
          Header Mappings
        </button>
        <button
          className={`hm-tab ${activeTab === 'exclusions' ? 'active' : ''}`}
          onClick={() => setActiveTab('exclusions')}
        >
          <Icon path={mdiCancel} size={0.75} />
          Variable Exclusions
        </button>
      </div>

      {/* Header Mappings Tab */}
      {activeTab === 'mappings' && (
        <>
          <div className="hm-controls">
            <div className="hm-filters">
              <div className="hm-search">
                <Icon path={mdiMagnify} size={0.75} className="hm-search-icon" />
                <input
                  type="text"
                  placeholder="Search headers..."
                  value={filters.search}
                  onChange={(e) => handleMappingSearchChange(e.target.value)}
                />
              </div>

              <Select
                classNamePrefix="my-select"
                className="hm-filter-select"
                options={vendors}
                value={vendors.find(v => v.value === filters.vendorId) || null}
                onChange={handleVendorFilterChange}
                isClearable
                placeholder="Filter by Vendor"
              />

              <Select
                classNamePrefix="my-select"
                className="hm-filter-select"
                options={clients}
                value={clients.find(c => c.value === filters.clientId) || null}
                onChange={handleClientFilterChange}
                isClearable
                placeholder="Filter by Client"
              />

              {hasActiveFilters && (
                <button className="hm-btn hm-btn-text" onClick={clearFilters}>
                  <Icon path={mdiFilterRemove} size={0.75} />
                  Clear Filters
                </button>
              )}
            </div>

            <button
              className="hm-btn hm-btn-icon"
              onClick={() => refetchMappings()}
              disabled={mappingsRefetching}
              title="Refresh"
            >
              <Icon path={mdiRefresh} size={0.75} className={mappingsRefetching ? 'spinning' : ''} />
            </button>
          </div>

          <div className="hm-table-container">
            <table className="hm-table">
              <thead>
                <tr>
                  <th>Original Header</th>
                  <th>Mapped Header</th>
                  <th>Vendor</th>
                  <th>Client</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mappings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="hm-empty">
                      {hasActiveFilters
                        ? 'No mappings found matching your filters.'
                        : 'No header mappings configured yet.'}
                    </td>
                  </tr>
                ) : (
                  mappings.map((mapping: HeaderMapping, index: number) => (
                    <tr key={`${mapping.originalHeader}-${mapping.vendorId}-${mapping.clientId}-${index}`}>
                      <td className="hm-header-cell">{mapping.originalHeader}</td>
                      <td className="hm-header-cell hm-mapped">{mapping.mappedHeader}</td>
                      <td>{mapping.vendorName}</td>
                      <td>{mapping.clientName}</td>
                      <td className="hm-actions">
                        <button
                          className="hm-action-btn hm-edit"
                          onClick={() => openEditMappingModal(mapping)}
                          title="Edit"
                        >
                          <Icon path={mdiPencil} size={0.65} />
                        </button>
                        <button
                          className="hm-action-btn hm-delete"
                          onClick={() => openMappingDeleteConfirm(mapping)}
                          title="Delete"
                        >
                          <Icon path={mdiDelete} size={0.65} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="hm-footer">
            <span>{mappings.length} mapping{mappings.length !== 1 ? 's' : ''} total</span>
          </div>
        </>
      )}

      {/* Variable Exclusions Tab */}
      {activeTab === 'exclusions' && (
        <>
          <div className="hm-controls">
            <div className="hm-filters">
              <div className="hm-search">
                <Icon path={mdiMagnify} size={0.75} className="hm-search-icon" />
                <input
                  type="text"
                  placeholder="Search excluded variables..."
                  value={exclusionSearch}
                  onChange={(e) => handleExclusionSearchChange(e.target.value)}
                />
              </div>
            </div>

            <button
              className="hm-btn hm-btn-icon"
              onClick={() => refetchExclusions()}
              disabled={exclusionsRefetching}
              title="Refresh"
            >
              <Icon path={mdiRefresh} size={0.75} className={exclusionsRefetching ? 'spinning' : ''} />
            </button>
          </div>

          <div className="hm-info-banner">
            <strong>Variable Exclusions</strong> are headers that will be automatically removed from uploaded sample files.
            Use this to filter out unnecessary or sensitive data columns that shouldn't be stored in the database.
          </div>

          <div className="hm-table-container">
            <table className="hm-table">
              <thead>
                <tr>
                  <th>Variable Name</th>
                  <th>Description</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {exclusions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="hm-empty">
                      {exclusionSearch
                        ? 'No exclusions found matching your search.'
                        : 'No variable exclusions configured yet.'}
                    </td>
                  </tr>
                ) : (
                  exclusions.map((exclusion: VariableExclusion) => (
                    <tr key={exclusion.exclusionId}>
                      <td className="hm-header-cell">{exclusion.variableName}</td>
                      <td>{exclusion.description || '-'}</td>
                      <td>{new Date(exclusion.createdDate).toLocaleDateString()}</td>
                      <td className="hm-actions">
                        <button
                          className="hm-action-btn hm-edit"
                          onClick={() => openEditExclusionModal(exclusion)}
                          title="Edit"
                        >
                          <Icon path={mdiPencil} size={0.65} />
                        </button>
                        <button
                          className="hm-action-btn hm-delete"
                          onClick={() => openExclusionDeleteConfirm(exclusion)}
                          title="Delete"
                        >
                          <Icon path={mdiDelete} size={0.65} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="hm-footer">
            <span>{exclusions.length} exclusion{exclusions.length !== 1 ? 's' : ''} total</span>
          </div>
        </>
      )}

      {/* Mapping Modals */}
      <MappingModal
        isOpen={mappingsModalOpen}
        mapping={editingMapping}
        vendors={vendors}
        clients={clients}
        onClose={closeMappingModal}
        onSave={handleSaveMapping}
        onChange={setEditingMapping}
        isSaving={mappingsSaving}
      />

      <DeleteMappingConfirmModal
        mapping={mappingDeleteConfirm}
        onClose={closeMappingDeleteConfirm}
        onConfirm={handleDeleteMapping}
        isDeleting={mappingsDeleting}
      />

      {/* Exclusion Modals */}
      <ExclusionModal
        isOpen={exclusionsModalOpen}
        exclusion={editingExclusion}
        onClose={closeExclusionModal}
        onSave={handleSaveExclusion}
        onChange={setEditingExclusion}
        isSaving={exclusionsSaving}
      />

      <DeleteExclusionConfirmModal
        exclusion={exclusionDeleteConfirm}
        onClose={closeExclusionDeleteConfirm}
        onConfirm={handleDeleteExclusion}
        isDeleting={exclusionsDeleting}
      />
    </div>
  );
};

export default HeaderMappings;
