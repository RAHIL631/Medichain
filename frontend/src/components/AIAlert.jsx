// c:\Users\Rahil hassan\OneDrive\Desktop\Major project\MediChain\frontend\src\components\AIAlert.jsx
import React from 'react';

const AIAlert = ({ alerts = [], onDismiss }) => {
  // If no alerts, show success state
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
        <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="flex-grow">
          <h4 className="text-green-400 font-medium text-sm">AI Scan Complete</h4>
          <p className="text-green-500/80 text-xs mt-0.5">✓ No dangerous drug interactions detected.</p>
        </div>
      </div>
    );
  }

  // Get color styles based on severity
  const getSeverityStyles = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'HIGH':
        return {
          wrapper: 'bg-red-900/20 border-red-500/50 shadow-red-900/20',
          iconBg: 'bg-red-500/20 text-red-400',
          badge: 'bg-red-500/20 text-red-400 border-red-500/30',
          text: 'text-red-200',
          title: 'text-red-400'
        };
      case 'MODERATE':
        return {
          wrapper: 'bg-orange-900/20 border-orange-500/50 shadow-orange-900/20',
          iconBg: 'bg-orange-500/20 text-orange-400',
          badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
          text: 'text-orange-200',
          title: 'text-orange-400'
        };
      case 'LOW':
      default:
        return {
          wrapper: 'bg-yellow-900/20 border-yellow-500/50 shadow-yellow-900/20',
          iconBg: 'bg-yellow-500/20 text-yellow-400',
          badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
          text: 'text-yellow-200',
          title: 'text-yellow-400'
        };
    }
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => {
        const styles = getSeverityStyles(alert.severity);
        
        return (
          <div 
            key={index} 
            className={`relative border rounded-xl p-4 flex gap-4 transition-all duration-300 animate-[slideInDown_0.3s_ease-out_forwards] ${styles.wrapper} shadow-lg backdrop-blur-md`}
            style={{ animationDelay: `${index * 100}ms`, opacity: 0 }}
          >
            {/* Warning Icon */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${styles.iconBg}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            {/* Content */}
            <div className="flex-grow pr-6">
              <div className="flex items-center gap-2 mb-1">
                <h4 className={`font-semibold text-sm ${styles.title}`}>Interaction Alert</h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${styles.badge}`}>
                  {alert.severity} RISK
                </span>
              </div>
              
              <p className={`text-sm font-medium mb-1 ${styles.text}`}>
                {alert.drug1} <span className="opacity-60">+</span> {alert.drug2}
              </p>
              
              <p className="text-xs text-gray-400 leading-relaxed">
                {alert.description}
              </p>
            </div>

            {/* Dismiss Button */}
            {onDismiss && (
              <button 
                onClick={() => onDismiss(index)}
                className="absolute top-3 right-3 p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                title="Dismiss alert"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AIAlert;
