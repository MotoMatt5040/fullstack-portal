import React, { useMemo } from 'react';
import Select from 'react-select';

import './QuotaManagement.css';
import '../styles/Sections.css';
import '../styles/ViewToggles.css';
import '../styles/Containers.css';
import useQuotaManagementLogic from './useQuotaManagementLogic';
import QuotaManagementTable from './QuotaManagementTable';
import ExportExcelButton from '../../components/ExportExcelButton';
import MyPieChart from '../../components/MyPieChart';

type Props = {};

const QuotaManagement = (props: Props) => {
  const {
    selectedProject,
    handleProjectChange,
    quotas,
    isLoading,
    isRefetching,
    projectListOptions,
    visibleStypes,
    error,
    // webDispositionData,
    // chartData,
  } = useQuotaManagementLogic();

  const stypeLabels = useMemo(() => {
    if (!visibleStypes) return [];

    const ignoredGroups = ['Total', 'Project', 'blankSpace'];
    const labels = new Set<string>(); // Use a Set to avoid duplicates

    Object.entries(visibleStypes).forEach(([group, subGroups]) => {
      // Ignore administrative groups
      if (!ignoredGroups.some(ignored => group.startsWith(ignored))) {
        Object.keys(subGroups).forEach(subGroup => {
          // Ignore the 'Total' subgroup within a main group
          if (subGroup !== 'Total') {
            labels.add(subGroup);
          }
        });
      }
    });

    return Array.from(labels);
  }, [visibleStypes]);

  if (isLoading) {
    return (
      <section className='quota-management section'>
        <h1>Quota Management Module</h1>
        <div className='quota-management-container'>
          <div className='loading-indicator'>Loading...</div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className='quota-management section'>
        <h1>Quota Management Module</h1>
        <div className='quota-management-container'>
          <div className='error-indicator'>
            Error loading data. Please try again.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className='quota-management section'>
      <h1>Quota Management Module</h1>
      <div className='quota-management-container'>
        <div className='quota-management-header header'>
          <Select
            classNamePrefix='my-select'
            className='quota-management-select'
            options={projectListOptions}
            value={
              projectListOptions.find((opt) => opt.value === selectedProject) ||
              null
            }
            onChange={handleProjectChange}
            isDisabled={false}
            placeholder='Select...'
            isClearable
            closeMenuOnSelect={true}
          />

          {isRefetching && (
            <div className='refresh-indicator'>
              <span>Updating...</span>
            </div>
          )}
        </div>

        {/* <div className='disposition-chart-container'>
          {stypeLabels.length > 0 && (
            <div className='stype-display-container'>
              <strong>Active Types:</strong>
              {stypeLabels.map(label => (
                <span key={label} className='stype-badge'>
                  {label}
                </span>
              ))}
            </div>
          )}

          {webDispositionData && Object.keys(webDispositionData).length > 0 && (
            <p>
              Responses: {webDispositionData.Responses}
              <br />
              Avg Completion Time:{' '}
              {webDispositionData.AvgCompletionTime.startsWith('00:')
                ? webDispositionData.AvgCompletionTime.substring(3)
                : webDispositionData.AvgCompletionTime}
            </p>
          )}

          {chartData && (
            <MyPieChart
              data={chartData}
              title='Web Disposition Overview'
              dataIsReady={!!chartData}
              height={500}
              width={900}
              domainColumn='field'
              valueColumn='value'
              textOutside={true}
              colorMap={{
                Completed: '#4CAF50',
                Closed: '#2196F3',
                DropOut: '#FF9800',
                Interrupted: '#F44336',
                ScreenedOut: '#9E9E9E',
              }}
            />
          )}
        </div> */}

        <div className='quota-table-data-container'>
          <div className='quota-table-header'>
            <ExportExcelButton tableId={`${selectedProject}-quotas`} />
          </div>

          {selectedProject && Object.keys(quotas).length > 0 && (
            <QuotaManagementTable
              id={`${selectedProject}-quotas`}
              quotaData={quotas}
              visibleStypes={visibleStypes}
            />
          )}

          {!selectedProject && (
            <div className='no-selection-message'>
              <p>Please select a project to view quota data.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default QuotaManagement;