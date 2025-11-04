// client/src/views/callid_management/CallIDManagement.tsx
import React from 'react';
import Icon from '@mdi/react';
import {
  mdiPhone,
  mdiRefresh,
  mdiPlus,
  mdiChartBox,
  mdiFormatListBulleted,
  mdiSwapHorizontal,
  mdiChartLine,
  mdiMapMarker,
  mdiPencil,
  mdiDelete,
  mdiClose,
} from '@mdi/js';
import useCallIDManagementLogic from './useCallIDManagementLogic';
import {
  CreateCallIDModal,
  EditCallIDModal,
  DeleteCallIDModal,
  AssignCallIDModal,
} from './CallIDModals';
import './CallIDManagement.css';

const CallIDManagement: React.FC = () => {
  const {
    activeTab,
    filters,
    showCreateModal,
    showEditModal,
    showDeleteModal,
    showAssignModal,
    showSwapModal,
    selectedCallID,
    selectedAssignment,
    projectSearchQuery,
    setProjectSearchQuery,
    selectedProjectHistory,
    setSelectedProjectHistory,
    projectHistory,
    filteredActiveAssignments,
    dashboardMetrics,
    activeAssignments,
    recentActivity,
    callIDInventory,
    statusOptions,
    stateOptions,
    isLoading,
    inventoryFetching,
    creating,
    updating,
    deleting,
    assigning,
    ending,
    handleTabChange,
    handleFilterChange,
    handleClearFilters,
    handleRefresh,
    openCreateModal,
    closeCreateModal,
    openEditModal,
    closeEditModal,
    openDeleteModal,
    closeDeleteModal,
    openAssignModal,
    closeAssignModal,
    handleCreateCallID,
    handleUpdateCallID,
    handleDeleteCallID,
    handleAssignCallID,
    handleEndAssignment,
    handleSwapNumber,
    closeSwapModal,
    handleSwapSubmit,
    handleEndAssignmentClick,
    handleViewHistory,
  } = useCallIDManagementLogic();

  // ==================== RENDER FUNCTIONS ====================

  /**
   * Render tab navigation
   */
  const renderTabs = () => (
    <div className="callid-tabs">
      <button
        className={`callid-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => handleTabChange('dashboard')}
      >
        <Icon path={mdiChartBox} size={0.8} />
        Dashboard
      </button>
      <button
        className={`callid-tab ${activeTab === 'inventory' ? 'active' : ''}`}
        onClick={() => handleTabChange('inventory')}
      >
        <Icon path={mdiFormatListBulleted} size={0.8} />
        Inventory
      </button>
      <button
        className={`callid-tab ${activeTab === 'assignments' ? 'active' : ''}`}
        onClick={() => handleTabChange('assignments')}
      >
        <Icon path={mdiSwapHorizontal} size={0.8} />
        Assignments
      </button>
      <button
        className={`callid-tab ${activeTab === 'analytics' ? 'active' : ''}`}
        onClick={() => handleTabChange('analytics')}
      >
        <Icon path={mdiChartLine} size={0.8} />
        Analytics
      </button>
    </div>
  );

  /**
   * Render dashboard metrics cards
   */
  const renderMetricsCards = () => {
    if (!dashboardMetrics) return null;

    return (
      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="metric-icon">
            <Icon path={mdiPhone} size={1.5} />
          </div>
          <div className="metric-content">
            <h3 className="metric-value">{dashboardMetrics.totalCallIDs || 0}</h3>
            <p className="metric-label">Total Call IDs</p>
          </div>
        </div>

        <div className="metric-card success">
          <div className="metric-icon">
            <Icon path={mdiChartBox} size={1.5} />
          </div>
          <div className="metric-content">
            <h3 className="metric-value">{dashboardMetrics.activeProjects || 0}</h3>
            <p className="metric-label">Active Projects</p>
          </div>
        </div>

        <div className="metric-card info">
          <div className="metric-icon">
            <Icon path={mdiFormatListBulleted} size={1.5} />
          </div>
          <div className="metric-content">
            <h3 className="metric-value">{dashboardMetrics.availableNumbers || 0}</h3>
            <p className="metric-label">Available Numbers</p>
          </div>
        </div>

        <div className="metric-card warning">
          <div className="metric-icon">
            <Icon path={mdiMapMarker} size={1.5} />
          </div>
          <div className="metric-content">
            <h3 className="metric-value">
              {dashboardMetrics.stateDistribution?.length || 0}
            </h3>
            <p className="metric-label">States Covered</p>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render status breakdown
   */
  const renderStatusBreakdown = () => {
    if (!dashboardMetrics?.statusBreakdown) return null;

    return (
      <div className="dashboard-section">
        <h3 className="section-title">Status Distribution</h3>
        <div className="status-breakdown">
          {dashboardMetrics.statusBreakdown.map((status: any, index: number) => (
            <div key={index} className="status-item">
              <span className="status-label">{status.StatusDescription}</span>
              <span className="status-count">{status.Count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Render state distribution
   */
  const renderStateDistribution = () => {
    if (!dashboardMetrics?.stateDistribution) return null;

    // Show top 10 states
    const topStates = dashboardMetrics.stateDistribution.slice(0, 10);

    return (
      <div className="dashboard-section">
        <h3 className="section-title">Top States (by Call ID Count)</h3>
        <div className="state-distribution">
          {topStates.map((state: any, index: number) => (
            <div key={index} className="state-item">
              <span className="state-label">
                {state.StateAbbr} - {state.StateName}
              </span>
              <span className="state-count">{state.Count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Render currently active assignments
   */
  const renderActiveAssignments = () => {
    if (!activeAssignments || activeAssignments.length === 0) {
      return (
        <div className="dashboard-section">
          <h3 className="section-title">Currently Active Assignments</h3>
          <div className="empty-state">
            <p>No active assignments at this time</p>
          </div>
        </div>
      );
    }

    return (
      <div className="dashboard-section">
        <h3 className="section-title">
          Currently Active Assignments ({activeAssignments.length})
        </h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project ID</th>
                <th>Phone Number</th>
                <th>Caller Name</th>
                <th>State</th>
                <th>Start Date</th>
                <th>Days Active</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeAssignments.map((assignment: any, index: number) => (
                <tr key={index}>
                  <td className="project-id">{assignment.ProjectID}</td>
                  <td className="phone-number">{formatPhoneNumber(assignment.PhoneNumber)}</td>
                  <td>{assignment.CallerName}</td>
                  <td>{assignment.StateAbbr}</td>
                  <td>{formatDate(assignment.StartDate)}</td>
                  <td className="days-active">
                    <span className={`days-badge ${getDaysBadgeClass(assignment.DaysActive)}`}>
                      {assignment.DaysActive} days
                    </span>
                  </td>
                  <td>
                    <span className="status-badge active">{assignment.Status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  /**
   * Render recent activity
   */
  const renderRecentActivity = () => {
    if (!recentActivity || recentActivity.length === 0) {
      return (
        <div className="dashboard-section">
          <h3 className="section-title">Recent Activity</h3>
          <div className="empty-state">
            <p>No recent activity</p>
          </div>
        </div>
      );
    }

    return (
      <div className="dashboard-section">
        <h3 className="section-title">Recent Activity (Last 20)</h3>
        <div className="activity-list">
          {[...recentActivity].reverse().map((activity: any, index: number) => (
            <div key={index} className="activity-item">
              <div className="activity-main">
                <span className="activity-project">{activity.ProjectID}</span>
                <span className="activity-separator">•</span>
                <span className="activity-phone">{formatPhoneNumber(activity.PhoneNumber)}</span>
                <span className="activity-separator">•</span>
                <span className="activity-state">{activity.StateAbbr}</span>
              </div>
              <div className="activity-meta">
                <span className="activity-date">{formatDate(activity.StartDate)}</span>
                <span className={`activity-status ${activity.AssignmentStatus.toLowerCase()}`}>
                  {activity.AssignmentStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Render dashboard tab content
   */
  const renderDashboardTab = () => (
    <div className="dashboard-content">
      {renderMetricsCards()}
      
      <div className="dashboard-grid">
        <div className="dashboard-column">
          {renderStatusBreakdown()}
          {renderStateDistribution()}
        </div>
        <div className="dashboard-column wide">
          {renderActiveAssignments()}
        </div>
      </div>

      {renderRecentActivity()}
    </div>
  );

  /**
   * Render inventory tab
   */
  const renderInventoryTab = () => (
    <div className="inventory-content">
      {/* Filters Section */}
      <div className="filters-section">
        <div className="filters-header">
          <h3>Search & Filter</h3>
          <button 
            onClick={handleClearFilters} 
            className="clear-filters-btn"
            disabled={!hasActiveFilters()}
          >
            Clear Filters
          </button>
        </div>

        <div className="filters-grid">
          {/* Phone Number Search */}
          <div className="filter-item">
            <label>Phone Number</label>
            <input
              type="text"
              placeholder="Search by phone..."
              value={filters.phoneNumber}
              onChange={(e) => handleFilterChange('phoneNumber', e.target.value)}
              className="filter-input"
            />
          </div>

          {/* Caller Name Search */}
          <div className="filter-item">
            <label>Caller Name</label>
            <input
              type="text"
              placeholder="Search by name..."
              value={filters.callerName}
              onChange={(e) => handleFilterChange('callerName', e.target.value)}
              className="filter-input"
            />
          </div>

          {/* Status Filter */}
          <div className="filter-item">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* State Filter */}
          <div className="filter-item">
            <label>State</label>
            <select
              value={filters.stateFIPS}
              onChange={(e) => handleFilterChange('stateFIPS', e.target.value)}
              className="filter-select"
            >
              <option value="">All States</option>
              {stateOptions.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          </div>

          {/* In Use Filter */}
          <div className="filter-item">
            <label>Currently In Use</label>
            <select
              value={filters.inUse}
              onChange={(e) => handleFilterChange('inUse', e.target.value)}
              className="filter-select"
            >
              <option value="">All</option>
              <option value="true">In Use</option>
              <option value="false">Available</option>
            </select>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="inventory-actions">
        <button onClick={openCreateModal} className="btn-primary">
          <Icon path={mdiPlus} size={0.8} />
          Add New Call ID
        </button>
        <div className="inventory-stats">
          {inventoryFetching ? (
            <span className="loading-text">Updating...</span>
          ) : (
            <span className="result-count">
              {callIDInventory.length} {callIDInventory.length === 1 ? 'result' : 'results'}
            </span>
          )}
        </div>
      </div>

      {/* Inventory Table */}
      {inventoryFetching && callIDInventory.length === 0 ? (
        <div className="loading-state">
          <Icon path={mdiRefresh} size={2} spin />
          <p>Loading inventory...</p>
        </div>
      ) : callIDInventory.length === 0 ? (
        <div className="empty-state">
          <Icon path={mdiPhone} size={3} color="#ccc" />
          <p>No call IDs found</p>
          <small>Try adjusting your filters or add a new call ID</small>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Phone Number</th>
                <th>Status</th>
                <th>Caller Name</th>
                <th>State</th>
                <th>In Use</th>
                <th>Active Project</th>
                <th>Date Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {callIDInventory.map((callID: any) => (
                <tr key={callID.PhoneNumberID}>
                  <td className="phone-number">
                    {formatPhoneNumber(callID.PhoneNumber)}
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(callID.StatusDescription)}`}>
                      {callID.StatusDescription}
                    </span>
                  </td>
                  <td>{callID.CallerName}</td>
                  <td>
                    <span className="state-badge">
                      {callID.StateAbbr}
                    </span>
                  </td>
                  <td>
                    {callID.CurrentlyInUse ? (
                      <span className="badge-in-use">In Use</span>
                    ) : (
                      <span className="badge-available">Available</span>
                    )}
                  </td>
                  <td className="project-id">
                    {callID.ActiveProjectID || '-'}
                  </td>
                  <td>{formatDate(callID.DateCreated)}</td>
                  <td className="actions-cell">
                    <div className="action-buttons">
                      <button
                        onClick={() => openEditModal(callID)}
                        className="btn-action btn-edit"
                        title="Edit"
                      >
                        <Icon path={mdiPencil} size={0.7} />
                      </button>
                      {!callID.CurrentlyInUse && (
                        <button
                          onClick={() => openAssignModal(callID)}
                          className="btn-action btn-assign"
                          title="Assign to Project"
                        >
                          <Icon path={mdiSwapHorizontal} size={0.7} />
                        </button>
                      )}
                      <button
                        onClick={() => openDeleteModal(callID)}
                        className="btn-action btn-delete"
                        title="Delete"
                        disabled={callID.CurrentlyInUse}
                      >
                        <Icon path={mdiDelete} size={0.7} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  /**
   * Render assignments tab
   */
  const renderAssignmentsTab = () => (
    <div className="assignments-content">
      {/* Search by Project */}
      <div className="assignments-search">
        <div className="search-group">
          <label>Search by Project ID</label>
          <input
            type="text"
            placeholder="Enter project ID..."
            value={projectSearchQuery}
            onChange={(e) => setProjectSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Active Assignments Table */}
      <div className="assignments-section">
        <div className="section-header-bar">
          <h3>Active Assignments</h3>
          <span className="count-badge">
            {activeAssignments.length} active
          </span>
        </div>

        {activeAssignments.length === 0 ? (
          <div className="empty-state">
            <Icon path={mdiSwapHorizontal} size={3} color="#ccc" />
            <p>No active assignments</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project ID</th>
                  <th>Phone Number</th>
                  <th>Caller Name</th>
                  <th>State</th>
                  <th>Start Date</th>
                  <th>Days Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredActiveAssignments.map((assignment: any, index: number) => (
                  <tr key={index}>
                    <td className="project-id">{assignment.ProjectID}</td>
                    <td className="phone-number">{formatPhoneNumber(assignment.PhoneNumber)}</td>
                    <td>{assignment.CallerName}</td>
                    <td>
                      <span className="state-badge">{assignment.StateAbbr}</span>
                    </td>
                    <td>{formatDate(assignment.StartDate)}</td>
                    <td>
                      <span className={`days-badge ${getDaysBadgeClass(assignment.DaysActive)}`}>
                        {assignment.DaysActive} days
                      </span>
                    </td>
                    <td className="actions-cell">
                      <div className="action-buttons">
                        <button
                          onClick={() => handleSwapNumber(assignment)}
                          className="btn-action btn-swap"
                          title="Swap Phone Number"
                        >
                          <Icon path={mdiSwapHorizontal} size={0.7} />
                        </button>
                        <button
                          onClick={() => handleEndAssignmentClick(assignment)}
                          className="btn-action btn-end"
                          title="End Assignment"
                        >
                          <Icon path={mdiClose} size={0.7} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assignment History */}
      {selectedProjectHistory && (
        <div className="assignments-section">
          <div className="section-header-bar">
            <h3>Assignment History - {selectedProjectHistory}</h3>
            <button
              onClick={() => setSelectedProjectHistory(null)}
              className="btn-secondary-small"
            >
              Clear
            </button>
          </div>
          <div className="history-timeline">
            {projectHistory.map((item: any, index: number) => (
              <div key={index} className="history-item">
                <div className="history-dot" />
                <div className="history-content">
                  <div className="history-phone">{formatPhoneNumber(item.PhoneNumber)}</div>
                  <div className="history-meta">
                    <span>{formatDate(item.StartDate)} → {formatDate(item.EndDate)}</span>
                    <span className={`history-status ${item.Status.toLowerCase()}`}>
                      {item.Status}
                    </span>
                  </div>
                  <div className="history-details">
                    {item.CallerName} • {item.StateAbbr} • {item.DurationDays} days
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  /**
   * Render analytics tab (placeholder for now)
   */
  const renderAnalyticsTab = () => (
    <div className="tab-placeholder">
      <h2>Analytics & Reports</h2>
      <p>Coming soon...</p>
    </div>
  );

  // ==================== UTILITY FUNCTIONS ====================

  const formatPhoneNumber = (phone: string) => {
    if (!phone || phone.length !== 10) return phone;
    return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getDaysBadgeClass = (days: number) => {
    if (days < 7) return 'new';
    if (days < 30) return 'active';
    if (days < 90) return 'long';
    return 'very-long';
  };

  const getStatusClass = (status: string) => {
    if (!status) return '';
    const lower = status.toLowerCase();
    if (lower.includes('active')) return 'active';
    if (lower.includes('inactive')) return 'inactive';
    if (lower.includes('flagged')) return 'flagged';
    if (lower.includes('testing')) return 'testing';
    return '';
  };

  const hasActiveFilters = () => {
    return Object.values(filters).some(value => value !== '');
  };

  // ==================== MAIN RENDER ====================

  return (
    <section className="callid-management">
      <div className="section-header">
        <div className="header-title">
          <Icon path={mdiPhone} size={1.2} />
          <h1>Call ID Management</h1>
        </div>
        <button
          onClick={handleRefresh}
          className="refresh-button"
          disabled={isLoading}
        >
          <Icon path={mdiRefresh} size={0.8} spin={isLoading} />
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {renderTabs()}

      <div className="tab-content">
        {isLoading && activeTab === 'dashboard' ? (
          <div className="loading-state">
            <Icon path={mdiRefresh} size={2} spin />
            <p>Loading dashboard data...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboardTab()}
            {activeTab === 'inventory' && renderInventoryTab()}
            {activeTab === 'assignments' && renderAssignmentsTab()}
            {activeTab === 'analytics' && renderAnalyticsTab()}
          </>
        )}
      </div>

      {/* Modals */}
      <CreateCallIDModal
        isOpen={showCreateModal}
        onClose={closeCreateModal}
        onCreate={handleCreateCallID}
        statusOptions={statusOptions}
        stateOptions={stateOptions}
        isLoading={creating}
      />

      <EditCallIDModal
        isOpen={showEditModal}
        onClose={closeEditModal}
        onUpdate={handleUpdateCallID}
        callID={selectedCallID}
        statusOptions={statusOptions}
        stateOptions={stateOptions}
        isLoading={updating}
      />

      <DeleteCallIDModal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        onDelete={handleDeleteCallID}
        callID={selectedCallID}
        isLoading={deleting}
      />

      <AssignCallIDModal
        isOpen={showAssignModal}
        onClose={closeAssignModal}
        onAssign={handleAssignCallID}
        callID={selectedCallID}
        isLoading={assigning}
      />
    </section>
  );
};

export default CallIDManagement;