import React, { useState, useEffect } from 'react';
import ProductionReportTable from './ProductionReportTable';
import { setProjectData } from './productionReportSlice';
import { useLazyGetProductionReportQuery } from './productionReportApiSlice';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch } from "react-redux";
import { isValidDate, isValidProjectID } from '../../utils/validators';

const ProductionReport = () => {
  const navigate = useNavigate(); 
  const [searchParams] = useSearchParams();

  const projectidFromUrl = searchParams.get('projectid');
  const recdateFromUrl = searchParams.get('recdate');

  const dispatch = useDispatch();

  const [projectid, setProjectid] = useState(projectidFromUrl || '12886C');
  const [recdate, setRecdate] = useState(recdateFromUrl || '2024-07-31');
  const [isSuccess, setIsSuccess] = useState(false);

  const projectIDRegex = /^\d{5}C?$/;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  const [getProductionReport, { data, isLoading, isError, error }] = useLazyGetProductionReportQuery();

  useEffect(() => {
    const fetchData = async () => {
      if (!isValidDate(recdate)) {
        alert('Invalid Date');
        return;
      }
      if (projectIDRegex.test(projectid) && dateRegex.test(recdate)) {
        try {
          const result = await getProductionReport({ projectid, recdate });
  
          if (result?.data) {
            dispatch(setProjectData({ projectid, recdate }));
            setIsSuccess(true);
            navigate(`/productionreport/tables?projectid=${projectid}&recdate=${recdate}`);
          } else {
            setIsSuccess(false);
          }
        } catch (err) {
          console.error(err);
          setIsSuccess(false);
        }
      }
    };
  
    fetchData(); 
  
  }, [projectidFromUrl, recdateFromUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try{
      if (!isValidProjectID(projectid)) {
        alert('Invalid Project ID');
        return;
      } 
      if (!isValidDate(recdate)) {
        alert('Invalid Date');
        return;
      }
      const result = await getProductionReport({ projectid, recdate });
      console.log(result)
   
      dispatch(setProjectData({ projectid, recdate }));
      if (result?.data) {
        console.log(result.data)
        setIsSuccess(true); 
        navigate(`/productionreport/tables?projectid=${projectid}&recdate=${recdate}`);
      } else {
        console.log('failed')
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
      {isSuccess && <ProductionReportTable data={data} />}
    </section>
  );
  return content;
};

export default ProductionReport;
