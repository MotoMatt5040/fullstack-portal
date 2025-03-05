import React, { useState, useEffect } from 'react';
import LiveProjectsTable from './LiveProjectsTable';
import { setProjectData } from './liveProjectsSlice';
import { useLazyGetLiveProjectsQuery } from './liveProjectsApiSlice';
import { Link } from 'react-router-dom';
import { useDispatch } from "react-redux";

const LiveProjects = () => {
  const [projectid, setProjectid] = useState('12886C');
  const [recdate, setRecdate] = useState('2024-07-31');
  const [isSuccess, setIsSuccess] = useState(false);

  const dispatch = useDispatch();

  const projectIDRegex = /^\d{5}C?$/;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;


  const [getLiveProjects, { data, isLoading, isError, error }] = useLazyGetLiveProjectsQuery();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try{
      if (!projectIDRegex.test(projectid)) {
        alert('Invalid Project ID');
        return;
      } 
      if (!dateRegex.test(recdate)) {
        alert('Invalid Date');
        return;
      }

      const result = await getLiveProjects({ projectid, recdate });
   
      dispatch(setProjectData({ projectid, recdate }));
      if (result?.isSuccess) {
        setIsSuccess(true); 
      } else {
        setIsSuccess(false); 
      }
    }
    catch (err) {
      console.log(err);
      setIsSuccess(false);
    }
  };

  let content = (
    <section>
      <form onSubmit={handleSubmit}>
        <input
          type='text'
          value={projectid}
          onChange={(e) => setProjectid(e.target.value)}
          placeholder='Project ID'
        />
        <input
          type='text'
          value={recdate}
          onChange={(e) => setRecdate(e.target.value)}
          placeholder='Rec Date'
        />
        <button type='submit'>Fetch Data</button>
      </form>
      <Link to='/welcome'>Back to Welcome</Link>
      {isSuccess && <LiveProjectsTable data={data} />}
    </section>
  );
  return content;
};

export default LiveProjects;
