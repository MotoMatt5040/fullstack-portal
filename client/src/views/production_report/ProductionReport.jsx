import React from 'react';
import { Link } from 'react-router-dom';

import useProductionReportLogic from './useProductionReportLogic';

import MyPieChart from '../../components/MyPieChart';
import MyDateRangePicker from '../../components/DateRangePicker';
import MyTable from '../../components/MyTable';
import MyMultiSelect from '../../components/MyMultiSelect';
import MyToggle from '../../components/MyToggle';

const ProductionReport = () => {
  const {
    projectIds,
    projectIdOptions,
    value,
    allProjectsToggle,
    handleToggleAllProjects,
    handleChangeDate,
    chartData,
    avgCPH,
    setAvgCPH,
    isSuccess,
    data,
    handleSelectProjects,
    startDate,
    endDate
  } = useProductionReportLogic();

  const columnKeyMap = {
    "Project ID": "projectId",
    "EID": "eid",
    "Ref Name": "refname",
    "Rec Loc": "recloc",
    "Hrs": "hrs",
    "Connect Time": "connecttime",
    "Pause Time": "pausetime",
    "CPH": "cph",
    "CMS": "cms",
    "Int. AL": "intal",
    "MPH": "mph",
    "Total Dials": "totaldials",
  };

  return (
    <section>
      <MyPieChart data={chartData} domainColumn='field' valueColumn='value' />

      <div className='cph-group'>
        <label>CPH: </label>
        <input
          type='text'
          value={avgCPH}
          onChange={(e) => setAvgCPH(e.target.value)}
          placeholder='CPH'
        />
      </div>

      <MyToggle
        label='All Projects'
        active={allProjectsToggle}
        onClick={handleToggleAllProjects}
      />

      <MyMultiSelect
        options={projectIdOptions}
        items={projectIds}
        onChange={handleSelectProjects}
        isDisabled={allProjectsToggle}
      />

      <MyDateRangePicker start={startDate} end={endDate} onChange={handleChangeDate} />

      <Link to='/welcome'>Back to Welcome</Link>
      {isSuccess && <MyTable data={data} columnKeyMap={columnKeyMap} />}
    </section>
  );
};

export default ProductionReport;
