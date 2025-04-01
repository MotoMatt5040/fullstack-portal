import React, { useState, useEffect } from 'react';
import ProductionReportTable from './ProductionReportTable';
import { setProjectData } from './productionReportSlice';
import { useLazyGetProductionReportQuery } from './productionReportApiSlice';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch } from "react-redux";
import { isValidDate, isValidprojectId } from '../../utils/validators';

const ProductionReport = () => {
  const navigate = useNavigate(); 
  const [searchParams] = useSearchParams();

  const projectIdFromUrl = searchParams.get('projectId');
  const recdateFromUrl = searchParams.get('recdate');

  const dispatch = useDispatch();

  const [projectId, setprojectId] = useState(projectIdFromUrl || '12886C');
  const [recdate, setRecdate] = useState(recdateFromUrl || '2024-07-31');
  const [isSuccess, setIsSuccess] = useState(false);

  const projectIdRegex = /^\d{5}C?$/;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  const [getProductionReport, { data }] = useLazyGetProductionReportQuery();

  useEffect(() => {
    const fetchData = async () => {
      if (!isValidDate(recdate)) {
        alert('Invalid Date');
        return;
      }
      if (projectIdRegex.test(projectId) && dateRegex.test(recdate)) {
        try {
          const result = await getProductionReport({ projectId, recdate });
  
          if (result?.data) {
            dispatch(setProjectData({ projectId, recdate }));
            setIsSuccess(true);
            navigate(`/productionreport/tables?projectId=${projectId}&recdate=${recdate}`);
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
  
  }, [projectIdFromUrl, recdateFromUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try{
      if (!isValidprojectId(projectId)) {
        alert('Invalid Project ID');
        return;
      } 
      if (!isValidDate(recdate)) {
        alert('Invalid Date');
        return;
      }
      const result = await getProductionReport({ projectId, recdate });
      console.log(result)
   
      dispatch(setProjectData({ projectId, recdate }));
      if (result?.data) {
        console.log(result.data)
        setIsSuccess(true); 
        navigate(`/productionreport/tables?projectId=${projectId}&recdate=${recdate}`);
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
          value={projectId}
          onChange={(e) => setprojectId(e.target.value)}
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
