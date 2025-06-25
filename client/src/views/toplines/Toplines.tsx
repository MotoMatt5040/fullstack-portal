import React from 'react';
import { useToplinesLogic } from './useToplinesLogic';
import MyGoBackButton from '../../components/MyGoBackButton';
import '../styles/Sections.css';

const Toplines: React.FC = () => {
  const { pdfUrl, isLoading, error } = useToplinesLogic();

  return (
    <section className='report section'>
      <MyGoBackButton to='Reports' url='/reports' />
      <h1>Topline Report</h1>
      {isLoading && <p>Loading PDF...</p>}
      {error && (
        <p>There was an error loading the report. Please try again later.</p>
      )}
      {pdfUrl && !isLoading && !error && (
        <iframe
          src={pdfUrl}
          style={{ width: '100%', height: '80vh', border: 'none' }}
          title='Topline Report'
        />
      )}
    </section>
  );
};

export default Toplines;
