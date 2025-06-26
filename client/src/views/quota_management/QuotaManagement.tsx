import React from 'react';
import Select from 'react-select';
import MyToggle from '../../components/MyToggle';

import './QuotaManagement.css';
import '../styles/Sections.css';
import '../styles/ViewToggles.css';
import '../styles/Containers.css';
import useQuotaManagementLogic from './useQuotaManagementLogic';
import QuotaManagementTable from './QuotaManagementTable';
import Icon from '@mdi/react';
import { mdiFilterMenu } from '@mdi/js';
import ExportExcelButton from '../../components/ExportExcelButton';

type Props = {};

const QuotaManagement = (props: Props) => {
  const {
    selectedProject,
    handleProjectChange, // Use the callback from the hook
    quotas,
    isLoading,
    isRefetching,
    projectListOptions,
    visibleStypes,
    error,
  } = useQuotaManagementLogic();

  // Show loading indicator only on initial load, not during refreshes
  if (isLoading) {
    return (
      <section className='quota-management section'>
        <h1>Quota Management Module</h1>
        <div className='quota-management-container'>
          <div className="loading-indicator">Loading...</div>
        </div>
      </section>
    );
  }

  // Show error state
  if (error) {
    return (
      <section className='quota-management section'>
        <h1>Quota Management Module</h1>
        <div className='quota-management-container'>
          <div className="error-indicator">
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
          <div className='multi-select'>
            <Select
              classNamePrefix="my-select"
              className='quota-management-select'
              options={projectListOptions}
              value={
                projectListOptions.find(
                  (opt) => opt.value === selectedProject
                ) || null
              }
              onChange={handleProjectChange} // Use the optimized callback
              isDisabled={false}
              placeholder='Select...'
              isClearable
              closeMenuOnSelect={true}
            />
          </div>
          
          {/* Optional: Show refresh indicator */}
          {isRefetching && (
            <div className="refresh-indicator">
              <span>Updating...</span>
            </div>
          )}
        </div>
        
        <div className='quota-table-data-container'>
          <div className='quota-table-header'>
            <ExportExcelButton tableId={`${selectedProject}-quotas`} />
          </div>

          {/* FIXED: Always show table when we have data, regardless of fetching state */}
          {selectedProject && Object.keys(quotas).length > 0 && (
            <QuotaManagementTable
              id={`${selectedProject}-quotas`}
              quotaData={quotas}
              visibleStypes={visibleStypes}
            />
          )}
          
          {/* Show message when no project is selected */}
          {!selectedProject && (
            <div className="no-selection-message">
              <p>Please select a project to view quota data.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default QuotaManagement;