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
  mdiMagnify,
  mdiCalendarStart,
  mdiCalendarEnd,
  mdiInformationOutline,
  mdiFolderOpen,
  mdiPhoneOff,
  mdiLoading,
  mdiTrendingUp,
  mdiClockOutline,
  mdiCheckCircle,
  mdiAlertCircle,
} from '@mdi/js';
import useCallIDManagementLogic from './useCallIDManagementLogic';
import {
  CreateCallIDModal,
  EditCallIDModal,
  DeleteCallIDModal,
  AssignCallIDModal,
} from './CallIDModals';
import {
  EditAssignmentModal,
  SwapAssignmentModal,
  AssignToProjectModal,
  ProjectSlotsModal,
} from './AssignmentModals';
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
    availableNumbers,
    isLoading,
    inventoryFetching,
    creating,
    updating,
    deleting,
    assigning,
    reassigning,
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
    // Assignments tab specific
    projectsWithAssignments,
    projectsLoading,
    projectHistoryLoading,
    handleViewProjectHistory,
    showEditAssignmentModal,
    handleOpenEditAssignmentModal,
    closeEditAssignmentModal,
    handleUpdateAssignment,
    updatingAssignment,
    handleOpenSwapModal,
    handleSwapAssignment,
    swappingAssignment,
    showAssignToProjectModal,
    handleOpenAssignModal,
    closeAssignToProjectModal,
    handleAssignToProject,
    // Analytics specific
    utilizationMetrics,
    mostUsedCallIDs,
    idleCallIDs,
    stateCoverage,
    usageTimeline,
    idleDaysFilter,
    mostUsedLimit,
    timelineMonths,
    handleIdleDaysChange,
    handleMostUsedLimitChange,
    handleTimelineMonthsChange,
    // Project slots modal
    showProjectSlotsModal,
    selectedProjectSlots,
    currentProjectSlots,
    handleManageProjectSlots,
    closeProjectSlotsModal,
    handleAssignSlot,
    handleRemoveSlot,
    handleUpdateSlotDates,
  } = useCallIDManagementLogic();

  // ==================== RENDER FUNCTIONS ====================

  /**
   * Render tab navigation
   */
  const renderTabs = () => (
    <div className='callid-tabs'>
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
      <div className='metrics-grid'>
        <div className='metric-card primary'>
          <div className='metric-icon'>
            <Icon path={mdiPhone} size={1.5} />
          </div>
          <div className='metric-content'>
            <h3 className='metric-value'>
              {dashboardMetrics.totalCallIDs || 0}
            </h3>
            <p className='metric-label'>Total Call IDs</p>
          </div>
        </div>

        <div className='metric-card success'>
          <div className='metric-icon'>
            <Icon path={mdiChartBox} size={1.5} />
          </div>
          <div className='metric-content'>
            <h3 className='metric-value'>
              {dashboardMetrics.activeProjects || 0}
            </h3>
            <p className='metric-label'>Active Projects</p>
          </div>
        </div>

        <div className='metric-card info'>
          <div className='metric-icon'>
            <Icon path={mdiFormatListBulleted} size={1.5} />
          </div>
          <div className='metric-content'>
            <h3 className='metric-value'>
              {dashboardMetrics.availableNumbers || 0}
            </h3>
            <p className='metric-label'>Available Numbers</p>
          </div>
        </div>

        <div className='metric-card warning'>
          <div className='metric-icon'>
            <Icon path={mdiMapMarker} size={1.5} />
          </div>
          <div className='metric-content'>
            <h3 className='metric-value'>
              {dashboardMetrics.stateDistribution?.length || 0}
            </h3>
            <p className='metric-label'>States Covered</p>
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
      <div className='dashboard-section'>
        <h3 className='section-title'>Status Distribution</h3>
        <div className='status-breakdown'>
          {dashboardMetrics.statusBreakdown.map(
            (status: any, index: number) => (
              <div key={index} className='status-item'>
                <span className='status-label'>{status.StatusDescription}</span>
                <span className='status-count'>{status.Count}</span>
              </div>
            )
          )}
        </div>
      </div>
    );
  };

  /**
   * Render state distribution
   */
  const renderStateDistribution = () => {
    if (!dashboardMetrics?.stateDistribution) return null;

    return (
      <div className='dashboard-section'>
        <h3 className='section-title'>All States (by Call ID Count)</h3>
        <div className='state-distribution'>
          {dashboardMetrics.stateDistribution.map((state: any, index: number) => (
            <div key={index} className='state-item'>
              <span className='state-label'>
                {state.StateAbbr} - {state.StateName}
              </span>
              <span className='state-count'>{state.Count}</span>
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
        <div className='dashboard-section'>
          <h3 className='section-title'>Currently Active Assignments</h3>
          <div className='empty-state'>
            <p>No active assignments at this time</p>
          </div>
        </div>
      );
    }

    return (
      <div className='dashboard-section'>
        <h3 className='section-title'>
          Currently Active Assignments ({activeAssignments.length})
        </h3>
        <table className='data-table'>
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
                <td className='project-id'>{assignment.ProjectID}</td>
                <td className='phone-number'>
                  {formatPhoneNumber(assignment.PhoneNumber)}
                </td>
                <td>{assignment.CallerName}</td>
                <td>{assignment.StateAbbr}</td>
                <td>{formatDate(assignment.StartDate)}</td>
                <td className='days-active'>
                  <span
                    className={`days-badge ${getDaysBadgeClass(
                      assignment.DaysActive
                    )}`}
                  >
                    {assignment.DaysActive} days
                  </span>
                </td>
                <td>
                  <span className='status-badge active'>
                    {assignment.Status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  /**
   * Render recent activity
   */
  const renderRecentActivity = () => {
    if (!recentActivity || recentActivity.length === 0) {
      return (
        <div className='dashboard-section'>
          <h3 className='section-title'>Recent Activity</h3>
          <div className='empty-state'>
            <p>No recent activity</p>
          </div>
        </div>
      );
    }

    return (
      <div className='dashboard-section'>
        <h3 className='section-title'>Recent Activity (Last 20)</h3>
        <div className='activity-list'>
          {recentActivity.map((activity: any, index: number) => (
            <div key={index} className='activity-item'>
              <div className='activity-main'>
                <span className='activity-project'>{activity.ProjectID}</span>
                <span className='activity-separator'>•</span>
                <span className='activity-phone'>
                  {formatPhoneNumber(activity.PhoneNumber)}
                </span>
                <span className='activity-separator'>•</span>
                <span className='activity-state'>{activity.StateAbbr}</span>
              </div>
              <div className='activity-meta'>
                <span className='activity-date'>
                  {formatDate(activity.StartDate)}
                </span>
                <span
                  className={`activity-status ${activity.AssignmentStatus.toLowerCase()}`}
                >
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
    <div className='dashboard-content'>
      {renderMetricsCards()}

      <div className='dashboard-grid'>
        <div className='dashboard-column'>
          {renderStatusBreakdown()}
          {renderStateDistribution()}
        </div>
        <div className='dashboard-column wide'>
          {renderActiveAssignments()}
          {renderRecentActivity()}
        </div>
      </div>
    </div>
  );

  /**
   * Render inventory tab
   */
  const renderInventoryTab = () => (
    <div className='inventory-content'>
      {/* Filters Section */}
      <div className='filters-section'>
        <div className='filters-header'>
          <h3>Search & Filter</h3>
          <button
            onClick={handleClearFilters}
            className='clear-filters-btn'
            disabled={!hasActiveFilters()}
          >
            Clear Filters
          </button>
        </div>

        <div className='filters-grid'>
          {/* Phone Number Search */}
          <div className='filter-item'>
            <label>Phone Number</label>
            <input
              type='text'
              placeholder='Search by phone...'
              value={filters.phoneNumber}
              onChange={(e) =>
                handleFilterChange('phoneNumber', e.target.value)
              }
              className='filter-input'
            />
          </div>

          {/* Caller Name Search */}
          <div className='filter-item'>
            <label>Caller Name</label>
            <input
              type='text'
              placeholder='Search by name...'
              value={filters.callerName}
              onChange={(e) => handleFilterChange('callerName', e.target.value)}
              className='filter-input'
            />
          </div>

          {/* Status Filter */}
          <div className='filter-item'>
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className='filter-select'
            >
              <option value=''>All Statuses</option>
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* State Filter */}
          <div className='filter-item'>
            <label>State</label>
            <select
              value={filters.stateFIPS}
              onChange={(e) => handleFilterChange('stateFIPS', e.target.value)}
              className='filter-select'
            >
              <option value=''>All States</option>
              {stateOptions.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Action Buttons */}
      <div className='inventory-actions'>
        <button onClick={openCreateModal} className='btn-primary'>
          <Icon path={mdiPlus} size={0.8} />
          Add New Call ID
        </button>
        <div className='inventory-stats'>
          {inventoryFetching ? (
            <span className='loading-text'>Updating...</span>
          ) : (
            <span className='result-count'>
              {callIDInventory.length}{' '}
              {callIDInventory.length === 1 ? 'result' : 'results'}
            </span>
          )}
        </div>
      </div>

      {/* Inventory Table */}
      {inventoryFetching && callIDInventory.length === 0 ? (
        <div className='loading-state'>
          <Icon path={mdiRefresh} size={2} spin />
          <p>Loading inventory...</p>
        </div>
      ) : callIDInventory.length === 0 ? (
        <div className='empty-state'>
          <Icon path={mdiPhone} size={3} color='#ccc' />
          <p>No call IDs found</p>
          <small>Try adjusting your filters or add a new call ID</small>
        </div>
      ) : (
        <table className='data-table'>
          <thead>
            <tr>
              <th>Phone Number</th>
              <th>Status</th>
              <th>Caller Name</th>
              <th>State</th>
              <th>Active Project</th>
              <th>Date Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {callIDInventory.map((callID: any) => (
              <tr key={callID.PhoneNumberID}>
                <td className='phone-number'>
                  {formatPhoneNumber(callID.PhoneNumber)}
                </td>
                <td>
                  <span
                    className={`status-badge ${getStatusClass(
                      callID.StatusDescription || 'Unknown'
                    )}`}
                  >
                    {callID.StatusDescription || 'Unknown'}
                  </span>
                </td>
                <td>{callID.CallerName}</td>
                <td>
                  <span className='state-badge'>{callID.StateAbbr}</span>
                </td>
                <td className='project-id'>
                  {callID.ActiveProjectID || '-'}
                </td>
                <td>{formatDate(callID.DateCreated)}</td>
                <td className='actions-cell'>
                  <div className='action-buttons'>
                    <button
                      onClick={() => openEditModal(callID)}
                      className='btn-action btn-edit'
                      title='Edit'
                    >
                      <Icon path={mdiPencil} size={0.7} />
                    </button>
                    {!callID.CurrentlyInUse && (
                      <button
                        onClick={() => openAssignModal(callID)}
                        className='btn-action btn-assign'
                        title='Assign to Project'
                      >
                        <Icon path={mdiSwapHorizontal} size={0.7} />
                      </button>
                    )}
                    <button
                      onClick={() => openDeleteModal(callID)}
                      className='btn-action btn-delete'
                      title='Delete'
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
      )}
    </div>
  );

  const renderAssignmentsTab = () => {
    // Group active assignments by project - but we need the full project row
    const projectsMap = new Map();

    filteredActiveAssignments.forEach((assignment: any) => {
      if (!projectsMap.has(assignment.ProjectID)) {
        projectsMap.set(assignment.ProjectID, {
          ProjectID: assignment.ProjectID,
          StartDate: assignment.StartDate,
          EndDate: assignment.EndDate,
          DaysActive: assignment.DaysActive,
          slots: {},
          assignments: [],
        });
      }

      const project = projectsMap.get(assignment.ProjectID);
      project.slots[assignment.SlotName] = {
        PhoneNumberID: assignment.PhoneNumberID,
        PhoneNumber: assignment.PhoneNumber,
        CallerName: assignment.CallerName,
        StateAbbr: assignment.StateAbbr,
      };
      project.assignments.push(assignment);
    });

    const projects = Array.from(projectsMap.values());

    return (
      <div className='assignments-content'>
        {/* Search by Project */}
        <div className='assignments-search'>
          <div className='search-group'>
            <label>Search by Project ID</label>
            <input
              type='text'
              placeholder='Enter project ID...'
              value={projectSearchQuery}
              onChange={(e) => setProjectSearchQuery(e.target.value)}
              className='search-input'
            />
          </div>
        </div>

        {/* Projects Table */}
        <div className='assignments-section'>
          <div className='section-header-bar'>
            <h3>Active Projects</h3>
            <span className='count-badge'>{projects.length} projects</span>
          </div>

          {projects.length === 0 ? (
            <div className='empty-state'>
              <Icon path={mdiSwapHorizontal} size={3} color='#ccc' />
              <p>No active projects</p>
            </div>
          ) : (
            <table className='data-table projects-table'>
              <thead>
                <tr>
                  <th>Project ID</th>
                  <th>CALLIDL1</th>
                  <th>CALLIDL2</th>
                  <th>CALLIDC1</th>
                  <th>CALLIDC2</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Days Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project: any) => {
                  const l1 = project.slots['CallIDL1'];
                  const l2 = project.slots['CallIDL2'];
                  const c1 = project.slots['CallIDC1'];
                  const c2 = project.slots['CallIDC2'];

                  return (
                    <tr key={project.ProjectID}>
                      <td
                        className='project-id clickable'
                        onClick={() => handleViewHistory(project.ProjectID)}
                        style={{ cursor: 'pointer' }}
                      >
                        {project.ProjectID}
                      </td>

                      {/* CALLIDL1 */}
                      <td className='slot-cell'>
                        {l1 ? (
                          <div className='slot-display'>
                            <div className='slot-phone'>
                              {formatPhoneNumber(l1.PhoneNumber)}
                            </div>
                            <div className='slot-meta'>
                              {l1.CallerName} • {l1.StateAbbr}
                            </div>
                          </div>
                        ) : (
                          <span className='slot-empty'>—</span>
                        )}
                      </td>

                      {/* CALLIDL2 */}
                      <td className='slot-cell'>
                        {l2 ? (
                          <div className='slot-display'>
                            <div className='slot-phone'>
                              {formatPhoneNumber(l2.PhoneNumber)}
                            </div>
                            <div className='slot-meta'>
                              {l2.CallerName} • {l2.StateAbbr}
                            </div>
                          </div>
                        ) : (
                          <span className='slot-empty'>—</span>
                        )}
                      </td>

                      {/* CALLIDC1 */}
                      <td className='slot-cell'>
                        {c1 ? (
                          <div className='slot-display'>
                            <div className='slot-phone'>
                              {formatPhoneNumber(c1.PhoneNumber)}
                            </div>
                            <div className='slot-meta'>
                              {c1.CallerName} • {c1.StateAbbr}
                            </div>
                          </div>
                        ) : (
                          <span className='slot-empty'>—</span>
                        )}
                      </td>

                      {/* CALLIDC2 */}
                      <td className='slot-cell'>
                        {c2 ? (
                          <div className='slot-display'>
                            <div className='slot-phone'>
                              {formatPhoneNumber(c2.PhoneNumber)}
                            </div>
                            <div className='slot-meta'>
                              {c2.CallerName} • {c2.StateAbbr}
                            </div>
                          </div>
                        ) : (
                          <span className='slot-empty'>—</span>
                        )}
                      </td>

                      <td>{formatDate(project.StartDate)}</td>
                      <td>{project.EndDate ? formatDate(project.EndDate) : 'No End Date'}</td>
                      <td>
                        <span
                          className={`days-badge ${getDaysBadgeClass(
                            project.DaysActive
                          )}`}
                        >
                          {project.DaysActive} days
                        </span>
                      </td>
                      <td className='actions-cell'>
                        <button
                          onClick={() =>
                            handleManageProjectSlots(
                              project.ProjectID,
                              filteredActiveAssignments.filter(
                                (a: any) => a.ProjectID === project.ProjectID
                              )
                            )
                          }
                          className='btn-action btn-edit'
                          title='Edit Slots'
                        >
                          <Icon path={mdiPencil} size={0.7} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Assignment History */}
        {selectedProjectHistory && (
          <div className='assignments-section'>
            <div className='section-header-bar'>
              <h3>Assignment History - {selectedProjectHistory}</h3>
              <button
                onClick={() => setSelectedProjectHistory(null)}
                className='btn-secondary-small'
              >
                Clear
              </button>
            </div>
            {projectHistory.length === 0 ? (
              <div className='empty-state'>
                <p>No assignment history for this project</p>
              </div>
            ) : (
              <div className='history-list'>
                {projectHistory.map((item: any, index: number) => (
                  <div key={index} className='history-card'>
                    <div className='history-header'>
                      <h4>
                        Period: {formatDate(item.StartDate)} →{' '}
                        {formatDate(item.EndDate)}
                      </h4>
                      <span
                        className={`history-status ${item.Status.toLowerCase()}`}
                      >
                        {item.Status}
                      </span>
                    </div>
                    <div className='history-slots-grid'>
                      {item.PhoneNumberL1 && (
                        <div className='history-slot'>
                          <span className='slot-badge slot-1'>CALLIDL1</span>
                          <span className='history-phone'>
                            {formatPhoneNumber(item.PhoneNumberL1)}
                          </span>
                          <span className='history-details'>
                            {item.CallerNameL1} • {item.StateAbbrL1}
                          </span>
                        </div>
                      )}
                      {item.PhoneNumberL2 && (
                        <div className='history-slot'>
                          <span className='slot-badge slot-2'>CALLIDL2</span>
                          <span className='history-phone'>
                            {formatPhoneNumber(item.PhoneNumberL2)}
                          </span>
                          <span className='history-details'>
                            {item.CallerNameL2} • {item.StateAbbrL2}
                          </span>
                        </div>
                      )}
                      {item.PhoneNumberC1 && (
                        <div className='history-slot'>
                          <span className='slot-badge slot-3'>CALLIDC1</span>
                          <span className='history-phone'>
                            {formatPhoneNumber(item.PhoneNumberC1)}
                          </span>
                          <span className='history-details'>
                            {item.CallerNameC1} • {item.StateAbbrC1}
                          </span>
                        </div>
                      )}
                      {item.PhoneNumberC2 && (
                        <div className='history-slot'>
                          <span className='slot-badge slot-4'>CALLIDC2</span>
                          <span className='history-phone'>
                            {formatPhoneNumber(item.PhoneNumberC2)}
                          </span>
                          <span className='history-details'>
                            {item.CallerNameC2} • {item.StateAbbrC2}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  /**
   * Render analytics tab
   */
  const renderAnalyticsTab = () => (
    <div className='analytics-content'>
      {/* Utilization Overview */}
      {utilizationMetrics && (
        <div className='dashboard-section'>
          <h3 className='section-title'>Utilization Overview</h3>
          <div className='utilization-grid'>
            <div className='utilization-card'>
              <div className='utilization-icon'>
                <Icon path={mdiPhone} size={1.5} />
              </div>
              <div className='utilization-content'>
                <p className='utilization-label'>Total Call IDs</p>
                <h3 className='utilization-value'>
                  {utilizationMetrics.TotalCallIDs || 0}
                </h3>
              </div>
            </div>

            <div className='utilization-card'>
              <div className='utilization-icon warning'>
                <Icon path={mdiTrendingUp} size={1.5} />
              </div>
              <div className='utilization-content'>
                <p className='utilization-label'>Currently In Use</p>
                <h3 className='utilization-value'>
                  {utilizationMetrics.InUseCount || 0}
                </h3>
              </div>
            </div>

            <div className='utilization-card'>
              <div className='utilization-icon success'>
                <Icon path={mdiCheckCircle} size={1.5} />
              </div>
              <div className='utilization-content'>
                <p className='utilization-label'>Available</p>
                <h3 className='utilization-value'>
                  {utilizationMetrics.AvailableCount || 0}
                </h3>
              </div>
            </div>

            <div className='utilization-card'>
              <div className='utilization-icon info'>
                <Icon path={mdiChartLine} size={1.5} />
              </div>
              <div className='utilization-content'>
                <p className='utilization-label'>Utilization Rate</p>
                <h3 className='utilization-value'>
                  {utilizationMetrics.UtilizationRate
                    ? `${utilizationMetrics.UtilizationRate.toFixed(1)}%`
                    : '0%'}
                </h3>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Grid */}
      <div className='analytics-grid'>
        {/* Left Column */}
        <div className='analytics-column'>
          {/* Most Used Call IDs */}
          <div className='dashboard-section'>
            <div className='section-header-bar'>
              <h3>Most Used Call IDs</h3>
              <select
                value={mostUsedLimit}
                onChange={(e) =>
                  handleMostUsedLimitChange(parseInt(e.target.value))
                }
                className='filter-select-small'
              >
                <option value='5'>Top 5</option>
                <option value='10'>Top 10</option>
                <option value='15'>Top 15</option>
                <option value='20'>Top 20</option>
              </select>
            </div>
            {mostUsedCallIDs.length === 0 ? (
              <div className='empty-state'>
                <p>No usage data available</p>
              </div>
            ) : (
              <div className='ranking-list'>
                {mostUsedCallIDs.map((item: any, index: number) => (
                  <div key={index} className='ranking-item'>
                    <div className='ranking-position'>{index + 1}</div>
                    <div className='ranking-content'>
                      <div className='ranking-phone'>
                        {formatPhoneNumber(item.PhoneNumber)}
                      </div>
                      <div className='ranking-meta'>
                        {item.CallerName}
                        <span className='separator'>•</span>
                        {item.StateAbbr}
                      </div>
                    </div>
                    <div className='ranking-stat'>
                      <div className='stat-value'>{item.UsageCount}</div>
                      <div className='stat-label'>uses</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* State Coverage */}
          <div className='dashboard-section'>
            <h3 className='section-title'>State Coverage (All States)</h3>
            {stateCoverage.length === 0 ? (
              <div className='empty-state'>
                <p>No coverage data available</p>
              </div>
            ) : (
              <div className='coverage-list'>
                {stateCoverage.map((state: any, index: number) => {
                  const totalNumbers = state.TotalNumbers || 0;
                  const inUse = state.InUseNumbers || 0;
                  const available = state.AvailableNumbers || 0;
                  const inUsePercent =
                    totalNumbers > 0 ? (inUse / totalNumbers) * 100 : 0;

                  return (
                    <div key={index} className='coverage-item'>
                      <div className='coverage-header'>
                        <span className='state-name'>
                          {state.StateAbbr} - {state.StateName}
                        </span>
                        <span className='coverage-total'>
                          {totalNumbers} number{totalNumbers !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className='coverage-bar'>
                        <div
                          className='coverage-bar-fill in-use'
                          style={{ width: `${inUsePercent}%` }}
                        />
                      </div>
                      <div className='coverage-legend'>
                        <div className='legend-item'>
                          <div className='legend-dot in-use' />
                          In Use: {inUse}
                        </div>
                        <div className='legend-item'>
                          <div className='legend-dot available' />
                          Available: {available}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className='analytics-column'>
          {/* Usage Timeline */}
          <div className='dashboard-section'>
            <div className='section-header-bar'>
              <h3>Usage Timeline</h3>
              <select
                value={timelineMonths}
                onChange={(e) =>
                  handleTimelineMonthsChange(parseInt(e.target.value))
                }
                className='filter-select-small'
              >
                <option value='3'>3 Months</option>
                <option value='6'>6 Months</option>
                <option value='12'>12 Months</option>
              </select>
            </div>
            {usageTimeline.length === 0 ? (
              <div className='empty-state'>
                <p>No timeline data available</p>
              </div>
            ) : (
              <>
                <div className='timeline-chart'>
                  {usageTimeline.map((item: any, index: number) => {
                    const maxValue = Math.max(
                      ...usageTimeline.map((t: any) =>
                        Math.max(
                          t.UniqueNumbersUsed || 0,
                          t.TotalAssignments || 0
                        )
                      )
                    );
                    const numbersHeight =
                      ((item.UniqueNumbersUsed || 0) / maxValue) * 100;
                    const assignmentsHeight =
                      ((item.TotalAssignments || 0) / maxValue) * 100;

                    return (
                      <div key={index} className='timeline-bar-group'>
                        <div className='timeline-bars'>
                          <div
                            className='timeline-bar numbers'
                            style={{ height: `${numbersHeight}%` }}
                            title={`${item.UniqueNumbersUsed} unique numbers`}
                          />
                          <div
                            className='timeline-bar assignments'
                            style={{ height: `${assignmentsHeight}%` }}
                            title={`${item.TotalAssignments} assignments`}
                          />
                        </div>
                        <div className='timeline-label'>
                          {item.MonthName?.substring(0, 3)} '
                          {item.Year?.toString().substring(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className='timeline-legend'>
                  <div className='legend-item'>
                    <div className='legend-dot numbers' />
                    Unique Numbers Used
                  </div>
                  <div className='legend-item'>
                    <div className='legend-dot assignments' />
                    Total Assignments
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Idle Numbers */}
          <div className='dashboard-section'>
            <div className='section-header-bar'>
              <h3>Idle Call IDs</h3>
              <select
                value={idleDaysFilter}
                onChange={(e) => handleIdleDaysChange(parseInt(e.target.value))}
                className='filter-select-small'
              >
                <option value='30'>30+ Days</option>
                <option value='60'>60+ Days</option>
                <option value='90'>90+ Days</option>
                <option value='180'>180+ Days</option>
              </select>
            </div>
            {idleCallIDs.length === 0 ? (
              <div className='empty-state'>
                <Icon path={mdiCheckCircle} size={2} color='#10b981' />
                <p>No idle numbers found</p>
                <small>All numbers have been used recently</small>
              </div>
            ) : (
              <div className='idle-list'>
                {idleCallIDs.map((item: any, index: number) => (
                  <div key={index} className='idle-item'>
                    <div className='idle-content'>
                      <div className='idle-phone'>
                        {formatPhoneNumber(item.PhoneNumber)}
                      </div>
                      <div className='idle-meta'>
                        {item.CallerName}
                        <span className='separator'>•</span>
                        {item.StateAbbr}
                      </div>
                    </div>
                    <div className='idle-stat'>
                      <div className='stat-value warning'>
                        {item.DaysSinceLastUse}
                      </div>
                      <div className='stat-label'>days idle</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ==================== UTILITY FUNCTIONS ====================

  const formatPhoneNumber = (phone: string) => {
    return phone || '';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
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
    if (lower.includes('removed')) return 'removed';
    if (lower.includes('flagged') || lower.includes('spam')) return 'flagged';
    if (lower.includes('in use')) return 'in-use';
    if (lower.includes('available')) return 'available';
    if (lower.includes('active')) return 'active';
    if (lower.includes('inactive')) return 'inactive';
    if (lower.includes('testing')) return 'testing';
    if (lower.includes('unknown')) return 'unknown';
    return '';
  };

  const hasActiveFilters = () => {
    return Object.values(filters).some((value) => value !== '');
  };

  // ==================== MAIN RENDER ====================

  return (
    <section className='callid-management'>
      <div className='section-header'>
        <div className='header-title'>
          <Icon path={mdiPhone} size={1.2} />
          <h1>Call ID Management</h1>
        </div>
        <button
          onClick={handleRefresh}
          className='refresh-button'
          disabled={isLoading}
        >
          <Icon path={mdiRefresh} size={0.8} spin={isLoading} />
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {renderTabs()}

      <div className='tab-content'>
        {isLoading && activeTab === 'dashboard' ? (
          <div className='loading-state'>
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

      {/* Assignment Management Modals */}
      <EditAssignmentModal
        isOpen={showEditAssignmentModal}
        onClose={closeEditAssignmentModal}
        onUpdate={handleUpdateAssignment}
        assignment={selectedAssignment}
        isLoading={updatingAssignment}
      />

      <SwapAssignmentModal
        isOpen={showSwapModal}
        onClose={closeSwapModal}
        onSwap={handleSwapSubmit}
        assignment={selectedAssignment}
        isLoading={reassigning}
        availableCallIDs={availableNumbers}
      />

      <AssignToProjectModal
        isOpen={showAssignToProjectModal}
        onClose={closeAssignToProjectModal}
        onAssign={handleAssignToProject}
        projectId={selectedProjectHistory}
        availableCallIDs={availableNumbers}
        isLoading={assigning}
      />

      <ProjectSlotsModal
        isOpen={showProjectSlotsModal}
        onClose={closeProjectSlotsModal}
        projectId={selectedProjectSlots || ''}
        currentAssignments={
          currentProjectSlots.reduce((acc: any, assignment: any) => {
            if (assignment.SlotName) {
              acc[assignment.SlotName] = assignment.PhoneNumberID;
            }
            return acc;
          }, {})
        }
        assignmentDetails={currentProjectSlots}
        availableCallIDs={availableNumbers}
        onUpdateSlot={handleAssignSlot}
        onUpdateDates={handleUpdateSlotDates}
        isLoading={assigning || ending}
      />
    </section>
  );
};

export default CallIDManagement;
