import React, { useState, useEffect } from 'react';
import Icon from '@mdi/react';
import {
  mdiPlus,
  mdiDelete,
  mdiContentSave,
  mdiChevronDown,
  mdiAlertCircleOutline,
  mdiCheckCircle,
} from '@mdi/js';
import {
  useGetClientsAndVendorsQuery,
  useGetMasterExtractionDefaultsQuery,
  useGetClientExtractionDefaultsQuery,
  useGetVendorClientExtractionDefaultsQuery,
  useSaveMasterExtractionDefaultsMutation,
  useSaveClientExtractionDefaultsMutation,
  useSaveVendorClientExtractionDefaultsMutation,
  useDeleteExtractionDefaultMutation,
} from '../../features/sampleAutomationApiSlice';
import './ExtractionDefaults.css';

interface Variable {
  id?: number;
  variableName: string;
  isNew?: boolean;
}

type TabType = 'master' | 'client' | 'vendor-client';

const ExtractionDefaults: React.FC = () => {
  // State for selections
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('master');

  // Local state for editing
  const [masterVariables, setMasterVariables] = useState<Variable[]>([]);
  const [clientVariables, setClientVariables] = useState<Variable[]>([]);
  const [vendorClientVariables, setVendorClientVariables] = useState<Variable[]>([]);
  const [hasMasterChanges, setHasMasterChanges] = useState(false);
  const [hasClientChanges, setHasClientChanges] = useState(false);
  const [hasVendorClientChanges, setHasVendorClientChanges] = useState(false);

  // New variable input
  const [newVariableName, setNewVariableName] = useState('');

  // API hooks
  const { data: clientsAndVendors, isLoading: isLoadingDropdowns } =
    useGetClientsAndVendorsQuery();

  const {
    data: masterDefaultsData,
    isLoading: isLoadingMasterDefaults,
    refetch: refetchMasterDefaults,
  } = useGetMasterExtractionDefaultsQuery();

  const {
    data: clientDefaultsData,
    isLoading: isLoadingClientDefaults,
    refetch: refetchClientDefaults,
  } = useGetClientExtractionDefaultsQuery(selectedClientId!, {
    skip: !selectedClientId,
  });

  const {
    data: vendorClientDefaultsData,
    isLoading: isLoadingVendorClientDefaults,
    refetch: refetchVendorClientDefaults,
  } = useGetVendorClientExtractionDefaultsQuery(
    { vendorId: selectedVendorId!, clientId: selectedClientId! },
    { skip: !selectedVendorId || !selectedClientId }
  );

  const [saveMasterDefaults, { isLoading: isSavingMaster }] =
    useSaveMasterExtractionDefaultsMutation();
  const [saveClientDefaults, { isLoading: isSavingClient }] =
    useSaveClientExtractionDefaultsMutation();
  const [saveVendorClientDefaults, { isLoading: isSavingVendorClient }] =
    useSaveVendorClientExtractionDefaultsMutation();
  const [deleteDefault] = useDeleteExtractionDefaultMutation();

  // Load master defaults when data changes
  useEffect(() => {
    console.log('Master defaults data:', masterDefaultsData);
    if (masterDefaultsData?.defaults) {
      console.log('Setting master variables:', masterDefaultsData.defaults);
      setMasterVariables(
        masterDefaultsData.defaults.map((d) => ({
          id: d.id,
          variableName: d.variableName,
        }))
      );
      setHasMasterChanges(false);
    }
  }, [masterDefaultsData]);

  // Load client defaults when data changes
  useEffect(() => {
    if (clientDefaultsData?.defaults) {
      setClientVariables(
        clientDefaultsData.defaults.map((d) => ({
          id: d.id,
          variableName: d.variableName,
        }))
      );
      setHasClientChanges(false);
    }
  }, [clientDefaultsData]);

  // Load vendor+client defaults when data changes
  useEffect(() => {
    if (vendorClientDefaultsData?.defaults) {
      setVendorClientVariables(
        vendorClientDefaultsData.defaults.map((d) => ({
          id: d.id,
          variableName: d.variableName,
        }))
      );
      setHasVendorClientChanges(false);
    }
  }, [vendorClientDefaultsData]);

  // Reset vendor+client when client changes
  useEffect(() => {
    setSelectedVendorId(null);
    setVendorClientVariables([]);
    setHasVendorClientChanges(false);
  }, [selectedClientId]);

  // Computed values
  const clients = clientsAndVendors?.clients || [];
  const vendors = clientsAndVendors?.vendors || [];

  const currentVariables =
    activeTab === 'master'
      ? masterVariables
      : activeTab === 'client'
      ? clientVariables
      : vendorClientVariables;
  const setCurrentVariables =
    activeTab === 'master'
      ? setMasterVariables
      : activeTab === 'client'
      ? setClientVariables
      : setVendorClientVariables;
  const hasChanges =
    activeTab === 'master'
      ? hasMasterChanges
      : activeTab === 'client'
      ? hasClientChanges
      : hasVendorClientChanges;
  const setHasChanges =
    activeTab === 'master'
      ? setHasMasterChanges
      : activeTab === 'client'
      ? setHasClientChanges
      : setHasVendorClientChanges;

  // Handlers
  const handleAddVariable = () => {
    if (!newVariableName.trim()) return;

    // Check for duplicate name
    if (
      currentVariables.some(
        (v) => v.variableName.toLowerCase() === newVariableName.trim().toLowerCase()
      )
    ) {
      alert('A variable with this name already exists.');
      return;
    }

    setCurrentVariables([
      ...currentVariables,
      {
        variableName: newVariableName.trim(),
        isNew: true,
      },
    ]);
    setNewVariableName('');
    setHasChanges(true);
  };

  const handleRemoveVariable = (index: number) => {
    const updated = currentVariables.filter((_, i) => i !== index);
    setCurrentVariables(updated);
    setHasChanges(true);
  };

  const handleSave = async () => {
    const variables = currentVariables.map((v) => ({
      variableName: v.variableName,
    }));

    try {
      if (activeTab === 'master') {
        await saveMasterDefaults({ variables }).unwrap();
        refetchMasterDefaults();
      } else if (activeTab === 'client' && selectedClientId) {
        await saveClientDefaults({
          clientId: selectedClientId,
          variables,
        }).unwrap();
        refetchClientDefaults();
      } else if (activeTab === 'vendor-client' && selectedVendorId && selectedClientId) {
        await saveVendorClientDefaults({
          vendorId: selectedVendorId,
          clientId: selectedClientId,
          variables,
        }).unwrap();
        refetchVendorClientDefaults();
      }
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save defaults:', error);
      alert('Failed to save defaults. Please try again.');
    }
  };

  const handleVariableNameChange = (index: number, newName: string) => {
    const updated = [...currentVariables];
    updated[index] = { ...updated[index], variableName: newName };
    setCurrentVariables(updated);
    setHasChanges(true);
  };

  // Only include relevant loading states based on active tab
  const isLoading =
    isLoadingDropdowns ||
    (activeTab === 'master' && isLoadingMasterDefaults) ||
    (activeTab === 'client' && selectedClientId && isLoadingClientDefaults) ||
    (activeTab === 'vendor-client' && selectedClientId && selectedVendorId && isLoadingVendorClientDefaults);
  const isSaving = isSavingMaster || isSavingClient || isSavingVendorClient;

  const canShowClientTab = selectedClientId !== null;
  const canShowVendorClientTab = selectedClientId !== null;
  const canEditVendorClient =
    selectedClientId !== null && selectedVendorId !== null;

  // Determine if we can edit/add variables based on current tab
  const canEdit =
    activeTab === 'master' ||
    (activeTab === 'client' && selectedClientId !== null) ||
    (activeTab === 'vendor-client' && canEditVendorClient);

  return (
    <div className="extraction-defaults">
      <div className="extraction-defaults-header">
        <div className="header-title">
          <h1>Extraction Defaults</h1>
          <p className="header-subtitle">
            Configure default extraction variables for all files, clients, and vendors
          </p>
        </div>
      </div>

      {/* Selection Dropdowns - only show for client/vendor tabs */}
      {activeTab !== 'master' && (
        <div className="extraction-defaults-selectors">
          <div className="selector-group">
            <label>Client</label>
            <div className="select-wrapper">
              <select
                value={selectedClientId || ''}
                onChange={(e) =>
                  setSelectedClientId(e.target.value ? Number(e.target.value) : null)
                }
                disabled={isLoadingDropdowns}
              >
                <option value="">Select a client...</option>
                {clients.map((client) => (
                  <option key={client.ClientID} value={client.ClientID}>
                    {client.ClientName}
                  </option>
                ))}
              </select>
              <Icon path={mdiChevronDown} size={0.75} className="select-icon" />
            </div>
          </div>

          {activeTab === 'vendor-client' && (
            <div className="selector-group">
              <label>Vendor</label>
              <div className="select-wrapper">
                <select
                  value={selectedVendorId || ''}
                  onChange={(e) =>
                    setSelectedVendorId(e.target.value ? Number(e.target.value) : null)
                  }
                  disabled={!selectedClientId || isLoadingDropdowns}
                >
                  <option value="">Select a vendor...</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.VendorID} value={vendor.VendorID}>
                      {vendor.VendorName}
                    </option>
                  ))}
                </select>
                <Icon path={mdiChevronDown} size={0.75} className="select-icon" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="extraction-defaults-tabs">
        <button
          className={`tab-button ${activeTab === 'master' ? 'active' : ''}`}
          onClick={() => setActiveTab('master')}
        >
          Master Defaults
          {hasMasterChanges && <span className="unsaved-indicator" />}
        </button>
        <button
          className={`tab-button ${activeTab === 'client' ? 'active' : ''}`}
          onClick={() => setActiveTab('client')}
        >
          Client Defaults
          {hasClientChanges && <span className="unsaved-indicator" />}
        </button>
        <button
          className={`tab-button ${activeTab === 'vendor-client' ? 'active' : ''}`}
          onClick={() => setActiveTab('vendor-client')}
        >
          Vendor + Client Defaults
          {hasVendorClientChanges && <span className="unsaved-indicator" />}
        </button>
      </div>

      {/* Content Area */}
      <div className="extraction-defaults-content">
        {activeTab === 'client' && !selectedClientId ? (
          <div className="empty-state">
            <Icon path={mdiAlertCircleOutline} size={2} />
            <p>Select a client to manage client defaults</p>
          </div>
        ) : activeTab === 'vendor-client' && !selectedClientId ? (
          <div className="empty-state">
            <Icon path={mdiAlertCircleOutline} size={2} />
            <p>Select a client to manage vendor + client defaults</p>
          </div>
        ) : activeTab === 'vendor-client' && !selectedVendorId ? (
          <div className="empty-state">
            <Icon path={mdiAlertCircleOutline} size={2} />
            <p>Select a vendor to manage vendor + client defaults</p>
          </div>
        ) : isLoading ? (
          <div className="loading-state">
            <p>Loading defaults...</p>
          </div>
        ) : (
          <>
            {/* Add Variable Form */}
            <div className="add-variable-form">
              <input
                type="text"
                placeholder="Variable name..."
                value={newVariableName}
                onChange={(e) => setNewVariableName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddVariable()}
                disabled={!canEdit}
              />
              <button
                className="btn-add"
                onClick={handleAddVariable}
                disabled={!newVariableName.trim() || !canEdit}
              >
                <Icon path={mdiPlus} size={0.75} />
                Add Variable
              </button>
            </div>

            {/* Variables List */}
            <div className="variables-list">
              {currentVariables.length === 0 ? (
                <div className="empty-variables">
                  <p>No variables configured. Add your first variable above.</p>
                </div>
              ) : (
                <table className="variables-table">
                  <thead>
                    <tr>
                      <th className="col-name">Variable Name</th>
                      <th className="col-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentVariables
                      .sort((a, b) => a.variableName.localeCompare(b.variableName))
                      .map((variable, index) => (
                        <tr key={`${variable.variableName}-${index}`}>
                          <td className="col-name">
                            <input
                              type="text"
                              value={variable.variableName}
                              onChange={(e) =>
                                handleVariableNameChange(index, e.target.value)
                              }
                              className="variable-name-input"
                            />
                            {variable.isNew && (
                              <span className="new-badge">NEW</span>
                            )}
                          </td>
                          <td className="col-actions">
                            <div className="action-buttons">
                              <button
                                className="btn-icon btn-delete"
                                onClick={() => handleRemoveVariable(index)}
                                title="Remove"
                              >
                                <Icon path={mdiDelete} size={0.7} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Save Button */}
            <div className="save-section">
              <button
                className={`btn-save ${hasChanges ? 'has-changes' : ''}`}
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
              >
                <Icon
                  path={isSaving ? mdiCheckCircle : mdiContentSave}
                  size={0.75}
                />
                {isSaving ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved'}
              </button>
              {hasChanges && (
                <span className="unsaved-warning">You have unsaved changes</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Info Section */}
      <div className="extraction-defaults-info">
        <h3>How Extraction Defaults Work</h3>
        <ul>
          <li>
            <strong>Master Defaults:</strong> Global variables extracted for ALL files
            regardless of client or vendor. These are always included.
          </li>
          <li>
            <strong>Client Defaults:</strong> Variables specific to a client, applied
            when no vendor is selected (e.g., Tarrance projects).
          </li>
          <li>
            <strong>Vendor + Client Defaults:</strong> Variables that apply when a
            specific vendor is selected for a client.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ExtractionDefaults;
