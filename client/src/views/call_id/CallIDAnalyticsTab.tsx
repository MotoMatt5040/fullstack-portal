// client/src/views/callid_management/CallIDAnalyticsTab.tsx
import React from 'react';
import Icon from '@mdi/react';
import {
  mdiPercent,
  mdiTrendingUp,
  mdiClockOutline,
  mdiMapMarker,
  mdiPhone,
  mdiChartBox,
  mdiRefresh,
} from '@mdi/js';

interface AnalyticsTabProps {
  utilizationMetrics: any;
  mostUsedCallIDs: any[];
  idleCallIDs: any[];
  stateCoverage: any[];
  usageTimeline: any[];
  isLoading: boolean;
  idleDays: number;
  onIdleDaysChange: (days: number) => void;
}

const CallIDAnalyticsTab: React.FC<AnalyticsTabProps> = ({
  utilizationMetrics,
  mostUsedCallIDs,
  idleCallIDs,
  stateCoverage,
  usageTimeline,
  isLoading,
  idleDays,
  onIdleDaysChange,
}) => {
  // Utility functions
  const formatPhoneNumber = (phone: string) => {
    if (!phone || phone.length !== 10) return phone;
    return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
  };

  const getMonthLabel = (month: number) => {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return months[month - 1] || '';
  };

  if (isLoading) {
    return (
      <div className='loading-state'>
        <Icon path={mdiRefresh} size={2} spin />
        <p>Loading analytics data...</p>
      </div>
    );
  }

  return (
    <div className='analytics-content'>
      {/* Utilization Overview Cards */}
      <div className='utilization-grid'>
        <div className='utilization-card'>
          <div className='utilization-icon'>
            <Icon path={mdiPhone} size={1.5} />
          </div>
          <div className='utilization-content'>
            <p className='utilization-label'>Total Call IDs</p>
            <h3 className='utilization-value'>
              {utilizationMetrics?.totalNumbers || 0}
            </h3>
          </div>
        </div>

        <div className='utilization-card'>
          <div className='utilization-icon success'>
            <Icon path={mdiTrendingUp} size={1.5} />
          </div>
          <div className='utilization-content'>
            <p className='utilization-label'>Utilization Rate</p>
            <h3 className='utilization-value'>
              {utilizationMetrics?.utilizationRate || 0}%
            </h3>
          </div>
        </div>

        <div className='utilization-card'>
          <div className='utilization-icon info'>
            <Icon path={mdiChartBox} size={1.5} />
          </div>
          <div className='utilization-content'>
            <p className='utilization-label'>Currently In Use</p>
            <h3 className='utilization-value'>
              {utilizationMetrics?.inUseNumbers || 0}
            </h3>
          </div>
        </div>

        <div className='utilization-card'>
          <div className='utilization-icon warning'>
            <Icon path={mdiClockOutline} size={1.5} />
          </div>
          <div className='utilization-content'>
            <p className='utilization-label'>Avg. Duration</p>
            <h3 className='utilization-value'>
              {utilizationMetrics?.avgDurationDays || 0}
              <span
                style={{
                  fontSize: '1rem',
                  fontWeight: 400,
                  marginLeft: '0.25rem',
                }}
              >
                days
              </span>
            </h3>
          </div>
        </div>
      </div>

      {/* Analytics Grid - Main Charts */}
      <div className='analytics-grid'>
        {/* Left Column */}
        <div className='analytics-column'>
          {/* Most Used Call IDs */}
          <div className='dashboard-section'>
            <h3 className='section-title'>Most Used Call IDs (Top 10)</h3>
            {mostUsedCallIDs && mostUsedCallIDs.length > 0 ? (
              <div className='ranking-list'>
                {mostUsedCallIDs.map((item, index) => (
                  <div key={index} className='ranking-item'>
                    <div className='ranking-position'>#{index + 1}</div>
                    <div className='ranking-content'>
                      <div className='ranking-phone'>
                        {formatPhoneNumber(item.PhoneNumber)}
                      </div>
                      <div className='ranking-meta'>
                        {item.CallerName}
                        <span className='separator'>•</span>
                        {item.StateAbbr}
                        <span className='separator'>•</span>
                        Last used: {formatDate(item.LastUsed)}
                      </div>
                    </div>
                    <div className='ranking-stat'>
                      <div className='stat-value'>{item.TimesUsed}</div>
                      <div className='stat-label'>times used</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='empty-state'>
                <p>No usage data available</p>
              </div>
            )}
          </div>

          {/* Idle Call IDs */}
          <div className='dashboard-section'>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                paddingBottom: '0.75rem',
                borderBottom: '2px solid var(--callid-gray-200)',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
                Idle Call IDs
              </h3>
              <select
                value={idleDays}
                onChange={(e) => onIdleDaysChange(Number(e.target.value))}
                className='filter-select-small'
              >
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={180}>180 days</option>
              </select>
            </div>
            {idleCallIDs && idleCallIDs.length > 0 ? (
              <div className='idle-list'>
                {idleCallIDs.map((item, index) => (
                  <div key={index} className='idle-item'>
                    <div className='idle-content'>
                      <div className='idle-phone'>
                        {formatPhoneNumber(item.PhoneNumber)}
                      </div>
                      <div className='idle-meta'>
                        {item.CallerName}
                        <span className='separator'>•</span>
                        {item.StateAbbr}
                        <span className='separator'>•</span>
                        {item.StatusDescription}
                      </div>
                    </div>
                    <div className='idle-stat'>
                      <div className='stat-value warning'>
                        {item.DaysSinceLastUse || 'Never'}
                      </div>
                      <div className='stat-label'>
                        {item.DaysSinceLastUse ? 'days idle' : 'used'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='empty-state'>
                <p>No idle call IDs found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className='analytics-column'>
          {/* State Coverage */}
          <div className='dashboard-section'>
            <h3 className='section-title'>
              <Icon
                path={mdiMapMarker}
                size={0.9}
                style={{ marginRight: '0.5rem' }}
              />
              State Coverage (Top 10)
            </h3>
            {stateCoverage && stateCoverage.length > 0 ? (
              <div className='coverage-list'>
                {stateCoverage.slice(0, 10).map((state, index) => {
                  const total = state.TotalNumbers || 0;
                  const inUse = state.InUseNumbers || 0;
                  const available = state.AvailableNumbers || 0;
                  const inUsePercent = total > 0 ? (inUse / total) * 100 : 0;
                  const availablePercent =
                    total > 0 ? (available / total) * 100 : 0;

                  return (
                    <div key={index} className='coverage-item'>
                      <div className='coverage-header'>
                        <span className='state-name'>
                          {state.StateAbbr} - {state.StateName}
                        </span>
                        <span className='coverage-total'>{total} total</span>
                      </div>
                      <div className='coverage-bar'>
                        <div
                          className='coverage-bar-fill in-use'
                          style={{ width: `${inUsePercent}%` }}
                          title={`${inUse} in use`}
                        />
                        <div
                          className='coverage-bar-fill available'
                          style={{ width: `${availablePercent}%` }}
                          title={`${available} available`}
                        />
                      </div>
                      <div className='coverage-legend'>
                        <div className='legend-item'>
                          <div className='legend-dot in-use' />
                          <span>{inUse} in use</span>
                        </div>
                        <div className='legend-item'>
                          <div className='legend-dot available' />
                          <span>{available} available</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className='empty-state'>
                <p>No state coverage data available</p>
              </div>
            )}
          </div>

          {/* Usage Timeline */}
          <div className='dashboard-section'>
            <h3 className='section-title'>Usage Timeline (Last 6 Months)</h3>
            {usageTimeline && usageTimeline.length > 0 ? (
              <>
                <div className='timeline-chart'>
                  {usageTimeline.map((item, index) => {
                    const maxValue = Math.max(
                      ...usageTimeline.map((i) =>
                        Math.max(
                          i.UniqueNumbersUsed || 0,
                          i.TotalAssignments || 0
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
                          {getMonthLabel(item.Month)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className='timeline-legend'>
                  <div className='legend-item'>
                    <div className='legend-dot numbers' />
                    <span>Unique Numbers</span>
                  </div>
                  <div className='legend-item'>
                    <div className='legend-dot assignments' />
                    <span>Total Assignments</span>
                  </div>
                </div>
              </>
            ) : (
              <div className='empty-state'>
                <p>No timeline data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallIDAnalyticsTab;
