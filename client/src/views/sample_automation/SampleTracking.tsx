import React, { useState } from 'react';
import Icon from '@mdi/react';
import {
  mdiTableLarge,
  mdiChevronDown,
  mdiChevronRight,
  mdiDelete,
  mdiRefresh,
  mdiMagnify,
  mdiFileTree,
  mdiTable,
  mdiAlertCircleOutline,
} from '@mdi/js';
import {
  useGetSampleTablesQuery,
  useLazyGetSampleTableDetailsQuery,
  useDeleteSampleTableMutation,
  SampleTableFamily,
  SampleTableProject,
} from '../../features/sampleAutomationApiSlice';
import './SampleTracking.css';

const SampleTracking: React.FC = () => {
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // API hooks
  const {
    data: tablesData,
    isLoading: isLoadingTables,
    refetch: refetchTables,
    error: tablesError,
  } = useGetSampleTablesQuery({ limit: 100 });

  const [
    getTableDetails,
    { data: tableDetailsData, isLoading: isLoadingDetails },
  ] = useLazyGetSampleTableDetailsQuery();

  const [deleteSampleTable, { isLoading: isDeleting }] = useDeleteSampleTableMutation();

  // Filter projects based on search
  const filteredProjects = tablesData?.data?.map((project: SampleTableProject) => {
    const searchLower = searchFilter.toLowerCase();
    // Filter tables within each project
    const filteredTables = project.tables.filter((family: SampleTableFamily) =>
      family.parentTable.tableName.toLowerCase().includes(searchLower) ||
      family.parentTable.projectId?.toLowerCase().includes(searchLower) ||
      family.derivatives.some((d) => d.tableName.toLowerCase().includes(searchLower))
    );
    return {
      ...project,
      tables: filteredTables,
    };
  }).filter((project: SampleTableProject) => project.tables.length > 0) || [];

  // Count total table families
  const totalFamilies = filteredProjects.reduce(
    (acc: number, p: SampleTableProject) => acc + p.tables.length,
    0
  );

  // Toggle project expansion
  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  // Toggle family expansion
  const toggleFamily = (tableName: string) => {
    const newExpanded = new Set(expandedFamilies);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedFamilies(newExpanded);
  };

  // View table details
  const viewTableDetails = async (tableName: string) => {
    setSelectedTable(tableName);
    await getTableDetails(tableName);
  };

  // Handle delete
  const handleDelete = async (tableName: string) => {
    try {
      await deleteSampleTable({ tableName, includeDerivatives: true }).unwrap();
      setDeleteConfirm(null);
      refetchTables();
    } catch (error) {
      console.error('Failed to delete table:', error);
    }
  };

  // Format date for display
  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Unknown';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get derivative type badge color
  const getDerivativeColor = (type: string) => {
    const colors: Record<string, string> = {
      LANDLINE: '#3b82f6',
      CELL: '#10b981',
      LSAM: '#3b82f6',
      CSAM: '#10b981',
      DUPLICATES: '#f59e0b',
      duplicate2: '#f59e0b',
      duplicate3: '#f59e0b',
      duplicate4: '#f59e0b',
      WDNC: '#ef4444',
      BACKUP: '#8b5cf6',
    };
    return colors[type] || '#6b7280';
  };

  return (
    <div className="sample-tracking">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-title">
          <Icon path={mdiFileTree} size={1.25} color="var(--accent-color)" />
          <div>
            <h1>Sample Tracking</h1>
            <p className="header-subtitle">View and manage SA_* table families</p>
          </div>
        </div>
        <button className="btn-refresh" onClick={() => refetchTables()} disabled={isLoadingTables}>
          <Icon path={mdiRefresh} size={0.875} />
          Refresh
        </button>
      </div>

      {/* Search and Stats Bar */}
      <div className="search-bar">
        <div className="search-input-wrapper">
          <Icon path={mdiMagnify} size={0.875} className="search-icon" />
          <input
            type="text"
            placeholder="Search by table name or project ID..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="stats-badges">
          <span className="stat-badge">
            <Icon path={mdiFileTree} size={0.75} />
            {filteredProjects.length} projects
          </span>
          <span className="stat-badge">
            <Icon path={mdiTableLarge} size={0.75} />
            {totalFamilies} tables
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="tracking-content">
        {/* Table List */}
        <div className="table-list-panel">
          {isLoadingTables ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading tables...</p>
            </div>
          ) : tablesError ? (
            <div className="error-state">
              <Icon path={mdiAlertCircleOutline} size={1.5} />
              <p>Failed to load tables</p>
              <button onClick={() => refetchTables()}>Retry</button>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="empty-state">
              <Icon path={mdiTableLarge} size={2} />
              <p>No sample tables found</p>
              {searchFilter && <span>Try adjusting your search filter</span>}
            </div>
          ) : (
            <div className="project-groups">
              {filteredProjects.map((project: SampleTableProject) => (
                <div key={project.projectId} className="project-group">
                  {/* Project Header */}
                  <div
                    className="project-header"
                    onClick={() => toggleProject(project.projectId)}
                  >
                    <Icon
                      path={
                        expandedProjects.has(project.projectId)
                          ? mdiChevronDown
                          : mdiChevronRight
                      }
                      size={0.875}
                    />
                    <span className="project-label">Project {project.projectId}</span>
                    <span className="project-table-count">
                      {project.tables.length} table{project.tables.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Tables within project */}
                  {expandedProjects.has(project.projectId) && (
                    <div className="table-families">
                      {project.tables.map((family: SampleTableFamily) => (
                        <div
                          key={family.parentTable.tableName}
                          className={`table-family ${
                            selectedTable === family.parentTable.tableName ? 'selected' : ''
                          }`}
                        >
                          {/* Parent Table Row */}
                          <div className="family-header">
                            <button
                              className="expand-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFamily(family.parentTable.tableName);
                              }}
                              disabled={family.derivatives.length === 0}
                            >
                              <Icon
                                path={
                                  expandedFamilies.has(family.parentTable.tableName)
                                    ? mdiChevronDown
                                    : mdiChevronRight
                                }
                                size={0.875}
                              />
                            </button>
                            <div
                              className="table-info"
                              onClick={() => viewTableDetails(family.parentTable.tableName)}
                            >
                              <div className="table-name">
                                <Icon path={mdiTable} size={0.75} />
                                <span>{family.parentTable.timestamp || family.parentTable.tableName}</span>
                              </div>
                              <div className="table-meta">
                                <span className="row-count">
                                  {family.parentTable.rowCount?.toLocaleString()} rows
                                </span>
                                <span className="created-date">
                                  {formatDate(family.parentTable.createdDate)}
                                </span>
                              </div>
                            </div>
                            <div className="family-actions">
                              {family.derivatives.length > 0 && (
                                <span className="derivative-count">
                                  +{family.derivatives.length}
                                </span>
                              )}
                              {deleteConfirm === family.parentTable.tableName ? (
                                <div className="delete-confirm">
                                  <button
                                    className="btn-confirm-delete"
                                    onClick={() => handleDelete(family.parentTable.tableName)}
                                    disabled={isDeleting}
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    className="btn-cancel-delete"
                                    onClick={() => setDeleteConfirm(null)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="btn-delete"
                                  onClick={() => setDeleteConfirm(family.parentTable.tableName)}
                                  title="Delete table family"
                                >
                                  <Icon path={mdiDelete} size={0.75} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Derivative Tables */}
                          {expandedFamilies.has(family.parentTable.tableName) &&
                            family.derivatives.length > 0 && (
                              <div className="derivatives-list">
                                {family.derivatives.map((derivative) => (
                                  <div
                                    key={derivative.tableName}
                                    className={`derivative-row ${
                                      selectedTable === derivative.tableName ? 'selected' : ''
                                    }`}
                                    onClick={() => viewTableDetails(derivative.tableName)}
                                  >
                                    <span
                                      className="derivative-badge"
                                      style={{ backgroundColor: getDerivativeColor(derivative.type) }}
                                    >
                                      {derivative.type}
                                    </span>
                                    <span className="derivative-name">{derivative.tableName}</span>
                                    <span className="derivative-rows">
                                      {derivative.rowCount?.toLocaleString()} rows
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Table Details Panel */}
        <div className="table-details-panel">
          {!selectedTable ? (
            <div className="no-selection">
              <Icon path={mdiTableLarge} size={2} />
              <p>Select a table to view details</p>
            </div>
          ) : isLoadingDetails ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading table details...</p>
            </div>
          ) : tableDetailsData?.data ? (
            <>
              <div className="details-header">
                <h2>{tableDetailsData.data.tableName}</h2>
                <span className="total-rows">
                  {tableDetailsData.data.totalRows?.toLocaleString()} total rows
                </span>
              </div>

              {/* Columns Section */}
              <div className="details-section">
                <h3>Columns ({tableDetailsData.data.columns?.length || 0})</h3>
                <div className="columns-grid">
                  {tableDetailsData.data.columns?.map((col) => (
                    <div key={col.name} className="column-item">
                      <span className="column-name">{col.name}</span>
                      <span className="column-type">
                        {col.dataType}
                        {col.maxLength && col.maxLength > 0 && `(${col.maxLength})`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sample Data Section */}
              <div className="details-section">
                <h3>Sample Data (first 10 rows)</h3>
                <div className="sample-data-wrapper">
                  {tableDetailsData.data.sampleRows?.length > 0 ? (
                    <table className="sample-data-table">
                      <thead>
                        <tr>
                          {tableDetailsData.data.columns?.slice(0, 8).map((col) => (
                            <th key={col.name}>{col.name}</th>
                          ))}
                          {(tableDetailsData.data.columns?.length || 0) > 8 && (
                            <th>...</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {tableDetailsData.data.sampleRows.map((row, idx) => (
                          <tr key={idx}>
                            {tableDetailsData.data.columns?.slice(0, 8).map((col) => (
                              <td key={col.name}>
                                {row[col.name] !== null && row[col.name] !== undefined
                                  ? String(row[col.name]).substring(0, 50)
                                  : '-'}
                              </td>
                            ))}
                            {(tableDetailsData.data.columns?.length || 0) > 8 && (
                              <td>...</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="no-data">No data available</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="error-state">
              <Icon path={mdiAlertCircleOutline} size={1.5} />
              <p>Failed to load table details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SampleTracking;
