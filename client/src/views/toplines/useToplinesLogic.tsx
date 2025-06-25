import { useState, useEffect, useRef } from 'react';
import { useLazyGetToplineReportQuery } from '../../features/reportsApiSlice';

export const useToplinesLogic = () => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [getToplineReport, { isLoading, error }] =
    useLazyGetToplineReportQuery();
  const pdfUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const fetchPdf = () => {
      getToplineReport()
        .unwrap()
        .then((response) => {
          const file = new Blob([response], { type: 'application/pdf' });
          const fileURL = URL.createObjectURL(file);
          pdfUrlRef.current = fileURL;
          setPdfUrl(fileURL);
        })
        .catch((err) => {
          console.error('Failed to fetch PDF:', err);
        });
    };

    fetchPdf();

    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }
    };
  }, [getToplineReport]);

  return { pdfUrl, isLoading, error };
};
