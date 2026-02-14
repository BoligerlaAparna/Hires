import React, { useState, useEffect } from 'react';
import { Download, Sliders, X, Award, Cpu } from 'lucide-react';
import api from '../api';

const SkillsMatrix: React.FC = () => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [skillMatrices, setSkillMatrices] = useState<{ [key: string]: any }>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const candidatesRes = await api.get('/candidates');
      const candidatesData = candidatesRes.data.content || [];
      setCandidates(candidatesData);

      // Fetch skill matrix for each candidate
      const matrices: { [key: string]: any } = {};
      await Promise.all(candidatesData.map(async (c: any) => {
        try {
          const res = await api.get(`/skill-matrix/candidate/${c.id}`);
          if (res.data && res.data.length > 0) {
            matrices[c.id] = res.data[0]; // Get the latest matrix
          }
        } catch (e) {
          console.error(`Failed to load matrix for ${c.name}`, e);
        }
      }));
      setSkillMatrices(matrices);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Skills Matrix</h2>
          <p className="text-sm text-gray-500">Dynamic proficiency analysis based on resume content.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50/80 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-900 w-1/4">Candidate Name</th>
                <th className="px-6 py-4 font-bold text-gray-900 w-1/2">Extracted Skills & Proficiency</th>
                <th className="px-6 py-4 font-bold text-gray-900 w-1/4">Top Skill Match</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && candidates.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500">Loading analysis...</td>
                </tr>
              ) : (
                candidates.map((candidate) => {
                  const matrix = skillMatrices[candidate.id];
                  // Use metrics from the dedicated SkillMatrix entity if available
                  const metrics = matrix?.skillMetrics || [];
                  const topMetric = metrics.length > 0 ? metrics[0] : null;

                  return (
                    <tr key={candidate.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 text-base">{candidate.name}</div>
                        <div className="text-xs text-gray-500">{candidate.role || 'Candidate'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {metrics.length > 0 ? (
                            metrics.slice(0, 12).map((m: any, idx: number) => (
                              <div
                                key={idx}
                                className={`px-2 py-1 rounded-md border text-xs font-semibold flex items-center gap-1.5 ${m.percentage >= 80 ? 'bg-green-100 text-green-800 border-green-200' :
                                  m.percentage >= 50 ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                    'bg-gray-100 text-gray-800 border-gray-200'
                                  }`}
                              >
                                <span>{m.skill}</span>
                                <span className="opacity-75 text-[10px] border-l border-current pl-1 ml-0.5">{m.percentage}%</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-400 italic text-xs">Analysis pending...</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {topMetric ? (
                            <>
                              <div className="text-2xl font-bold text-gray-900">{topMetric.percentage}%</div>
                              <div>
                                <div className="text-xs text-gray-500 uppercase font-semibold">Top Expert in</div>
                                <div className="font-bold text-gray-900">{topMetric.skill}</div>
                              </div>
                            </>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SkillsMatrix;
