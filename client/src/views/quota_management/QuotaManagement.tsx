import React, { useMemo } from 'react';
import Select from 'react-select';
import Icon from '@mdi/react';
import { mdiChartBox } from '@mdi/js';

import './QuotaManagement.css';
import useQuotaManagementLogic from './useQuotaManagementLogic';
import QuotaManagementTable from './QuotaManagementTable';
import ExportExcelButton from '../../components/ExportExcelButton';
import { SkeletonTable } from '../../components/Skeleton';

const QuotaManagement = () => {
  const {
    selectedProject,
    handleProjectChange,
    quotas,
    isLoading,
    isRefetching,
    projectListOptions,
    visibleStypes,
    error,
  } = useQuotaManagementLogic();

  if (isLoading) {
    return (
      <div className='quota-management'>
        <div className='quota-header'>
          <h1>
            <Icon path={mdiChartBox} size={1} />
            Quota Management
          </h1>
        </div>
        <div className='quota-loading'>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='quota-management'>
        <div className='quota-header'>
          <h1>
            <Icon path={mdiChartBox} size={1} />
            Quota Management
          </h1>
        </div>
        <div className='quota-error'>
          Error loading data. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className='quota-management'>
      <div className='quota-header'>
        <div className='quota-header-left'>
          <h1>
            <Icon path={mdiChartBox} size={1} />
            Quota Management
          </h1>
          <p className='quota-subtitle'>View and monitor project quotas</p>
        </div>
        <div className='quota-header-right'>
          {selectedProject && Object.keys(quotas).length > 0 && (
            <ExportExcelButton tableId={`${selectedProject}-quotas`} />
          )}
        </div>
      </div>

      <div className='quota-controls'>
        <Select
          classNamePrefix='my-select'
          className='quota-select'
          options={projectListOptions}
          value={
            projectListOptions.find((opt) => opt.value === selectedProject) ||
            null
          }
          onChange={handleProjectChange}
          isDisabled={false}
          placeholder='Select a project...'
          isClearable
          closeMenuOnSelect={true}
        />
        {isRefetching && <span className='quota-updating'>Updating...</span>}
      </div>

      {selectedProject && Object.keys(quotas).length > 0 ? (
        <QuotaManagementTable
          id={`${selectedProject}-quotas`}
          quotaData={quotas}
          visibleStypes={visibleStypes}
        />
      ) : (
        <div className='quota-empty'>
          <p>Select a project to view quota data.</p>
        </div>
      )}
    </div>
  );
};

export default QuotaManagement;
