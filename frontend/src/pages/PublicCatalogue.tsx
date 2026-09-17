import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Scissors, Clock, DollarSign, Sparkles, MapPin, CheckCircle, Info, Home } from 'lucide-react';

export const PublicCatalogue: React.FC = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/services')
      .then(res => setServices(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Return Home Button */}
      <div className="flex items-center space-x-2 mb-4">
        <button
          onClick={() => navigate('/welcome')}
          className="bg-dark-800 hover:bg-dark-700 text-gold-400 border border-dark-600 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Return Home</span>
        </button>
      </div>

      {/* Header Banner */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center space-x-2 bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs px-3 py-1 rounded-full mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>TrueCut Harare Main Branch</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
          Service Catalogue & Prices
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto text-sm sm:text-base">
          Transparent pricing with zero hidden fees. Browse our executive grooming services below.
        </p>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="text-center py-12 text-gold-500 animate-pulse">Loading service catalogue...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {services.map((s) => (
            <div key={s.id} className="bg-dark-800 border border-dark-700 rounded-xl p-6 hover:border-gold-500/50 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-white">{s.name}</h3>
                  <span className="text-xl font-extrabold text-gold-400 bg-gold-500/10 px-3 py-1 rounded-lg border border-gold-500/20">
                    ${Number(s.price).toFixed(2)}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-4">{s.description}</p>
              </div>

              <div className="pt-4 border-t border-dark-700 flex items-center justify-between">
                <div className="flex items-center text-xs text-gray-400 space-x-1">
                  <Clock className="w-4 h-4 text-gold-500" />
                  <span>Duration: {s.durationMinutes} mins</span>
                </div>
                <Link
                  to={`/book?serviceId=${s.id}`}
                  className="bg-gold-500 hover:bg-gold-600 text-black font-bold text-xs px-4 py-2 rounded-lg transition-colors flex items-center space-x-1"
                >
                  <span>Select & Book</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transparent Fee Policy Box */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-3 flex items-center space-x-2">
          <Info className="w-5 h-5 text-gold-500" />
          <span>Transparent Fee Breakdown</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-dark-900 p-3 rounded-lg border border-dark-700">
            <span className="text-gray-400 block mb-1">Standard Booking Fee</span>
            <span className="text-white font-bold text-sm">$2.00 (Non-refundable)</span>
          </div>
          <div className="bg-dark-900 p-3 rounded-lg border border-dark-700">
            <span className="text-gray-400 block mb-1">Emergency Surcharge</span>
            <span className="text-white font-bold text-sm">$10.00 (Priority slot)</span>
          </div>
          <div className="bg-dark-900 p-3 rounded-lg border border-dark-700">
            <span className="text-gray-400 block mb-1">House Call Travel Fee</span>
            <span className="text-white font-bold text-sm">$5.00 (Harare within 10km)</span>
          </div>
          <div className="bg-dark-900 p-3 rounded-lg border border-dark-700">
            <span className="text-gray-400 block mb-1">Squeeze-In Fee</span>
            <span className="text-white font-bold text-sm">$3.00 (Walk-in override)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
