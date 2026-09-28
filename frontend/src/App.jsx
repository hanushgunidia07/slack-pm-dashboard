import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Trash2, Send, Upload, RefreshCw, MessageSquare, Hash, Smile, Activity, BarChart2, List, Download, Search, Database, FileText } from 'lucide-react';

export default function App() {
  const [reviews, setReviews] = useState([]);
  const [inputText, setInputText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState('overview');

  const API_URL = "https://slack-pm-dashboard.onrender.com/api";

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
    if (window.confirm("Are you sure you want to clear ALL data? This cannot be undone.")) {
      await axios.delete(`${API_URL}/reviews/clear`);
      setActiveFilter(null);
      setSearchQuery("");
      fetchReviews();
    }
  };

  // NEW: Delete individual file data
  const handleDeleteSource = async (source) => {
    if (window.confirm(`Are you sure you want to delete all data imported from "${source}"?`)) {
      try {
        await axios.delete(`${API_URL}/reviews/source/${source}`);
        setActiveFilter(null);
        fetchReviews();
      } catch (err) {
        alert("Error deleting file data.");
      }
    }
  };

  // Upgraded Sentiment Math for Progress Bars
  const total = reviews.length;
  const positiveCount = reviews.filter(r => r.sentiment === 'positive').length;
  const negativeCount = reviews.filter(r => r.sentiment === 'negative').length;
  const neutralCount = reviews.filter(r => r.sentiment === 'neutral').length;
  
  const positivePercentage = total > 0 ? Math.round((positiveCount / total) * 100) : 0;
  const negativePercentage = total > 0 ? Math.round((negativeCount / total) * 100) : 0;
  const neutralPercentage = total > 0 ? 100 - positivePercentage - negativePercentage : 0; // Ensures perfect 100% total

  const pieData = [
    { name: 'Positive', value: positiveCount, color: '#10b981' },
    { name: 'Negative', value: negativeCount, color: '#f43f5e' },
    { name: 'Neutral', value: neutralCount, color: '#94a3b8' }
  ];

  const featureCounts = {};
  reviews.forEach(r => {
    if (r.features) {
      r.features.forEach(f => {
        featureCounts[f] = (featureCounts[f] || 0) + 1;
      });
    }
  });

  const totalFeatures = Object.keys(featureCounts).length;

  const barData = Object.keys(featureCounts)
    .map(feat => ({ feature: feat, count: featureCounts[feat] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  const displayedReviews = reviews.filter(r => {
    const matchesFilter = activeFilter ? r.features && r.features.includes(activeFilter) : true;
    const matchesSearch = searchQuery ? (r.text || "").toLowerCase().includes(searchQuery.toLowerCase()) : true;
    return matchesFilter && matchesSearch;
  });

  // NEW: Extract unique files for the Manage tab
  const uniqueSources = [...new Set(reviews.map(r => r.source_file).filter(Boolean))];

  const handleExportCSV = () => {
    if (displayedReviews.length === 0) {
      alert("No data to export!");
      return;
    }
    const headers = ["Sentiment", "Review Text", "Extracted Features", "Source File"];
    const csvRows = displayedReviews.map(r => {
      const sentiment = r.sentiment || "unknown";
      const text = r.text ? `"${r.text.replace(/"/g, '""')}"` : "";
      const features = r.features && r.features.length ? `"${r.features.join(", ")}"` : "none";
      const source = r.source_file ? `"${r.source_file}"` : "unknown";
      return `${sentiment},${text},${features},${source}`;
    });
    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `slack_telemetry_${activeFilter || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 1. Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <span className="text-purple-600 bg-purple-50 p-2 rounded-lg">#</span> 
              Slack PM Voice of Customer
            </h1>
            <p className="text-sm text-slate-500 mt-1">Real-time sentiment & taxonomy telemetry for Reliability PMs</p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchReviews} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium transition-colors">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 text-sm font-medium transition-colors">
              <Download size={16} /> Export CSV
            </button>
            <button onClick={handleClear} className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 text-sm font-medium transition-colors">
              <Trash2 size={16} /> Clear All
            </button>
          </div>
        </div>

        {/* 2. Interactive Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Feedback</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{total}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><MessageSquare size={20} /></div>
          </div>
          
          {/* UPGRADED: Sentiment Health Progress Bars */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Sentiment Health</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{positivePercentage}% <span className="text-xs font-normal text-slate-500 ml-1">Positive</span></h3>
              </div>
              <div className="p-2 bg-slate-50 text-slate-400 rounded-lg"><Smile size={18} /></div>
            </div>
            <div className="w-full h-2 flex rounded-full overflow-hidden bg-slate-100">
              <div style={{ width: `${positivePercentage}%` }} className="bg-emerald-500 transition-all duration-500" title="Positive"></div>
              <div style={{ width: `${neutralPercentage}%` }} className="bg-slate-400 transition-all duration-500" title="Neutral"></div>
              <div style={{ width: `${negativePercentage}%` }} className="bg-rose-500 transition-all duration-500" title="Negative"></div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Friction Points</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalFeatures}</h3>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Hash size={20} /></div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">System Status</p>
              <h3 className="text-sm font-semibold text-emerald-600 flex items-center gap-2 mt-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Operational
              </h3>
            </div>
            <div className="p-3 bg-slate-50 text-slate-600 rounded-xl"><Activity size={20} /></div>
          </div>
        </div>

        {/* 3. Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form onSubmit={handleSingleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-800">Analyze Single Feedback</label>
              <p className="text-xs text-slate-500 mt-1">Paste a single user review or ticket for instant extraction.</p>
            </div>
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. Slack huddles keep dropping audio during calls..." 
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm resize-none h-24 border-slate-200 bg-slate-50"
            />
            <button type="submit" disabled={loading || !inputText.trim()} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Send size={16} /> {loading ? "Analyzing..." : "Analyze Sentiment"}
            </button>
          </form>

          <form onSubmit={handleFileUpload} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-800">Batch Upload CSV</label>
              <p className="text-xs text-slate-500 mt-1">Upload App Store or G2 reviews. Must contain a 'review' or 'text' column.</p>
            </div>
            <div className="relative border-2 border-dashed border-slate-300 hover:border-purple-400 bg-slate-50 hover:bg-purple-50/50 transition-colors rounded-xl p-6 text-center flex flex-col items-center justify-center cursor-pointer group h-24">
              <input 
                type="file" 
                accept=".csv"
                onChange={(e) => setFile(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="text-slate-400 group-hover:text-purple-500 mb-2 transition-colors" size={24} />
              <span className="text-sm font-medium text-slate-600 group-hover:text-purple-700 transition-colors">
                {file ? file.name : "Drop CSV file here or click to browse"}
              </span>
            </div>
            <button type="submit" disabled={!file || loading} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Activity size={16} /> Run Pandas ETL & Ingest
            </button>
          </form>
        </div>

        {/* 4. Tab Navigation */}
        <div className="flex space-x-2 border-b border-slate-200 pb-px overflow-x-auto">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'text-purple-700 bg-white border-t border-l border-r border-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
          >
            <BarChart2 size={16} /> Dashboard Overview
          </button>
          <button 
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'data' ? 'text-purple-700 bg-white border-t border-l border-r border-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
          >
            <List size={16} /> Context Feed Table
          </button>
          {/* NEW: Manage Files Tab */}
          <button 
            onClick={() => setActiveTab('manage')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'manage' ? 'text-purple-700 bg-white border-t border-l border-r border-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
          >
            <Database size={16} /> Manage Files
          </button>
        </div>

        {/* 5. Tab Content: Overview (Charts) */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="mb-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Sentiment Distribution</h3>
              </div>
              <div className="flex justify-center items-center h-64">
                {total > 0 ? (
                  <PieChart width={300} height={250}>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" stroke="none">
                      {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                ) : <p className="text-sm text-slate-400">No data available</p>}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="mb-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Top Slack Friction Points</h3>
              </div>
              <div className="h-64">
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="feature" type="category" width={100} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} onClick={(data) => setActiveFilter(data.feature)} cursor="pointer">
                        {barData.map((entry, index) => (
                          <Cell key={`cell-${index}`} className="hover:opacity-80 transition-opacity" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-slate-400 flex justify-center items-center h-full">No features extracted yet</p>}
              </div>
            </div>
          </div>
        )}

        {/* 6. Tab Content: Data (Table) */}
        {activeTab === 'data' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                Raw Telemetry 
                {activeFilter && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full flex items-center gap-2">
                    Filter: #{activeFilter}
                    <button onClick={() => setActiveFilter(null)} className="hover:text-purple-900 font-bold">&times;</button>
                  </span>
                )}
              </h2>
              
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search feedback keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white text-slate-500 sticky top-0 shadow-sm z-10">
                  <tr>
                    <th className="p-4 font-semibold w-24">Sentiment</th>
                    <th className="p-4 font-semibold">Review Feedback</th>
                    <th className="p-4 font-semibold w-48">Extracted Taxonomy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedReviews.length > 0 ? displayedReviews.map((r, i) => (
                    <tr key={r.id || i} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                          r.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-700' :
                          r.sentiment === 'negative' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {r.sentiment.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-slate-700 leading-relaxed max-w-xl">{r.text}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {r.features && r.features.map(f => (
                            <span key={f} onClick={() => setActiveFilter(f)} className="inline-block bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded-md border border-purple-100 cursor-pointer hover:bg-purple-100 hover:border-purple-200 transition-colors">
                              #{f}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="3" className="p-8 text-center text-slate-400">No data matches your search or filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. NEW Tab Content: Manage Files */}
        {activeTab === 'manage' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Uploaded Files</h2>
            <p className="text-sm text-slate-500 mb-6">Manage datasets currently driving your telemetry metrics. Deleting a file removes all its associated reviews without affecting other data.</p>
            
            {uniqueSources.length > 0 ? (
              <ul className="space-y-3">
                {uniqueSources.map(source => (
                  <li key={source} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-4 rounded-xl border border-slate-100 gap-4 transition-colors hover:border-purple-200">
                    <span className="text-sm font-medium text-slate-700 flex items-center gap-3">
                       <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm"><FileText size={16} className="text-purple-600"/></div> 
                       {source === "manual_entry" ? "Manual Single Entries" : source}
                    </span>
                    <button
                      onClick={() => handleDeleteSource(source)}
                      className="text-rose-600 hover:text-white hover:bg-rose-500 border border-rose-200 hover:border-rose-500 flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-white rounded-lg transition-colors shadow-sm"
                    >
                      <Trash2 size={14} /> Delete Dataset
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                <Database className="mx-auto text-slate-300 mb-3" size={32} />
                <p className="text-sm font-medium text-slate-500">No active files in the database.</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}