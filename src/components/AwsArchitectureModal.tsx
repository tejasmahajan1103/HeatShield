import React from 'react';
import { X, Server, Shield, Cpu, Database, Bell, Activity, Cloud } from 'lucide-react';

interface AwsArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AwsArchitectureModal: React.FC<AwsArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const awsServices = [
    { name: 'Amazon Cognito', role: 'User Identity & Auth', icon: Shield, color: 'text-purple-400' },
    { name: 'AWS Lambda & API Gateway', role: 'Serverless Risk Engine & REST APIs', icon: Server, color: 'text-amber-400' },
    { name: 'Amazon Bedrock', role: 'Generative AI Safety & Hydration Recommendations', icon: Cpu, color: 'text-emerald-400' },
    { name: 'Amazon DynamoDB', role: 'GeoSpatial CoolSpot Store & History Logs', icon: Database, color: 'text-blue-400' },
    { name: 'Amazon SNS & EventBridge', role: 'Extreme Heat Push Notifications & Cron Triggers', icon: Bell, color: 'text-rose-400' },
    { name: 'AWS CloudWatch & Amplify', role: 'Telemetry, Telemetrics & Frontend Hosting', icon: Activity, color: 'text-cyan-400' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-100">AWS Production Readiness Architecture</h3>
              <p className="text-xs text-slate-400">Target cloud service integration model for HeatShield</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-6">
          <p className="text-sm text-slate-300 leading-relaxed">
            The HeatShield frontend is engineered with strict service abstractions, allowing seamless drop-in integration with AWS serverless infrastructure for the Bharat Builds hackathon deployment.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {awsServices.map((svc, idx) => {
              const Icon = svc.icon;
              return (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-slate-900 border border-slate-700 ${svc.color} shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">{svc.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{svc.role}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="font-semibold text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Zero-Credentials Frontend Policy
            </div>
            <p>
              In accordance with AWS security best practices, zero credentials or secret keys are embedded in this client build. All API interactions route securely through AWS Cognito IAM tokens.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-semibold text-sm transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
