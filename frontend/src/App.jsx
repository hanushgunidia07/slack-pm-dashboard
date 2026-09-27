import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Trash2, Send, Upload, RefreshCw, AlertCircle } from 'lucide-react';

export default function App() {
  const [reviews, setReviews] = useState([]);
  const [inputText, setInputText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);

  const API_URL = "https://slack-pm-dashboard.onrender.com";

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${API_URL}/reviews`);
      setReviews(res.data.reviews || []);
    } catch (err) {
      console.error("Error fetching reviews:", err);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      await axios.post(`${API_URL}/analyze`, { text: inputText });
      setInputText("");
      await fetchReviews();
    } catch (err) {
      alert("Error processing review.");
    }
    setLoading(false);
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/upload-csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(`Successfully processed ${res.data.inserted_count} Slack reviews!`);
      setFile(null);
      await fetchReviews();
    } catch (err) {
      alert("CSV upload failed. Ensure column name contains 'review' or 'text'.");
    }
    setLoading(false);
  };

  const handleClear = async () => {
    if (window.confirm("Are you sure you want to clear all data?")) {
      await axios.delete(`${API_URL}/reviews/clear`);
      setActiveFilter(null);
      fetchReviews();
    }
  };

  // Metrics Calculation
  const total = reviews.length;
  const positiveCount = reviews.filter(r => r.sentiment === 'positive').length;
  const negativeCount = reviews.filter(r => r.sentiment === 'negative').length;
  const neutralCount = reviews.filter(r => r.sentiment === 'neutral').length;

  const pieData = [
    { name: 'Positive', value: positiveCount, color: '#22c55e' },
    { name: 'Negative', value: negativeCount, color: '#ef4444' },
    { name: 'Neutral', value: neutralCount, color: '#9ca3af' }
  ];

  // Feature Frequency Extraction
  const featureCounts = {};
  reviews.forEach(r => {
    if (r.features) {
      r.features.forEach(f => {
        featureCounts[f] = (featureCounts[f] || 0) + 1;
      });
    }
  });

  const barData = Object.keys(featureCounts)
    .map(feat => ({ feature: feat, count: featureCounts[feat] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  // Filter Table Data
  const displayedReviews = activeFilter
    ? reviews.filter(r => r.features && r.features.includes(activeFilter))
    : reviews;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <span className="text-purple-600">#</span> Slack PM Voice of Customer
            </h1>
            <p className="text-sm text-slate-500">Real-time sentiment & taxonomy telemetry for Reliability PMs</p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchReviews} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium">
              <RefreshCw size={16} /> Refresh
            </button>
            <button onClick={handleClear} className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 text-sm font-medium">
              <Trash2 size={16} /> Clear Data
            </button>
          </div>
        </div>

        {/* Controls: Single Input & Batch CSV */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form onSubmit={handleSingleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between space-y-3">
            <label className="text-sm font-semibold text-slate-700">Analyze Single Feedback</label>
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. Slack huddles keep dropping audio during calls..." 
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm resize-none h-20 border-slate-200"
            />
            <button type="submit" disabled={loading} className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
              <Send size={16} /> {loading ? "Analyzing..." : "Analyze Sentiment"}
            </button>
          </form>

          <form onSubmit={handleFileUpload} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between space-y-3">
            <label className="text-sm font-semibold text-slate-700">Batch Upload CSV (App Store / G2)</label>
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center">
              <input 
                type="file" 
                accept=".csv"
                onChange={(e) => setFile(e.target.files[0])}
                className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
            </div>
            <button type="submit" disabled={!file || loading} className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm font-medium disabled:opacity-50">
              <Upload size={16} /> Run Pandas ETL & Ingest
            </button>
          </form>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Telemetry Processed</span>
            <span className="text-5xl font-extrabold text-slate-800 mt-2">{total}</span>
          </div>

          {/* Sentiment Donut Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Sentiment Distribution</span>
            {total > 0 ? (
              <PieChart width={240} height={160}>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            ) : <p className="text-xs text-slate-400 mt-6">No data available</p>}
          </div>

          {/* Top Friction Taxonomy Bar Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Top Slack Friction Points</span>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={barData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="feature" type="category" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} onClick={(data) => setActiveFilter(data.feature)} cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-slate-400 mt-6">No features extracted yet</p>}
          </div>
        </div>

        {/* Context Feed Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              Context Feed {activeFilter && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Filter: #{activeFilter}</span>}
            </h2>
            {activeFilter && (
              <button onClick={() => setActiveFilter(null)} className="text-xs text-slate-500 hover:text-slate-800 underline">
                Reset Filter
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-500 sticky top-0">
                <tr>
                  <th className="p-3">Sentiment</th>
                  <th className="p-3">Review Feedback</th>
                  <th className="p-3">Extracted Taxonomy</th>
                  <th className="p-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedReviews.map((r, i) => (
                  <tr key={r.id || i} className="hover:bg-slate-50">
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold text-white ${
                        r.sentiment === 'positive' ? 'bg-emerald-500' :
                        r.sentiment === 'negative' ? 'bg-rose-500' : 'bg-slate-400'
                      }`}>
                        {r.sentiment.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700 max-w-md">{r.text}</td>
                    <td className="p-3">
                      {r.features && r.features.map(f => (
                        <span key={f} onClick={() => setActiveFilter(f)} className="inline-block bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded border border-purple-200 mr-1 cursor-pointer hover:bg-purple-100">
                          #{f}
                        </span>
                      ))}
                    </td>
                    <td className="p-3 text-xs text-slate-400">{r.source_file}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}