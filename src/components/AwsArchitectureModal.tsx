import React from 'react';
import { X, Server, Shield, Cpu, Database, Bell, Activity, Cloud } from 'lucide-react';

interface AwsArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AwsArchitectureModal: React.FC<AwsArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const awsServices = [
    { name: 'Amazon Cognito', role: 'User Identity & Auth', icon: Shield, color: 'text-purple-600 bg-purple-50' },
    { name: 'AWS Lambda & API Gateway', role: 'Serverless Risk Engine & REST APIs', icon: Server, color: 'text-amber-600 bg-amber-50' },
    { name: 'Amazon Bedrock', role: 'Generative AI Safety & Hydration Recommendations', icon: Cpu, color: 'text-emerald-600 bg-emerald-50' },
    { name: 'Amazon DynamoDB', role: 'GeoSpatial CoolSpot Store & User Settings', icon: Database, color: 'text-blue-600 bg-blue-50' },
    { name: 'Amazon SNS & EventBridge', role: 'Extreme Heat Push Notifications & Cron Triggers', icon: Bell, color: 'text-rose-600 bg-rose-50' },
    { name: 'AWS CloudWatch & Amplify', role: 'Telemetry, Telemetrics & Frontend Hosting', icon: Activity, color: 'text-teal-600 bg-teal-50' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-stone-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-stone-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-[#FF641C]">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-[#102C4C]">AWS Production Readiness Architecture</h3>
              <p className="text-xs text-[#526985]">Target cloud service integration model for HeatShield</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-6">
          <p className="text-sm text-[#526985] leading-relaxed">
            The HeatShield frontend is engineered with strict service abstractions, allowing seamless drop-in integration with AWS serverless infrastructure for the Bharat Builds hackathon deployment.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {awsServices.map((svc, idx) => {
              const Icon = svc.icon;
              return (
                <div key={idx} className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-start gap-3">
                  <div className={`p-2 rounded-xl border border-stone-200 ${svc.color} shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#102C4C]">{svc.name}</h4>
                    <p className="text-xs text-[#526985] mt-0.5">{svc.role}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-[#526985] space-y-2">
            <div className="font-bold text-[#102C4C] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Zero-Credentials Frontend Policy
            </div>
            <p>
              In accordance with AWS security best practices, zero credentials or secret keys are embedded in this client build. All API interactions route securely through AWS Cognito IAM tokens.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#FF641C] hover:bg-[#e0530f] text-white font-bold text-sm transition shadow-md shadow-orange-500/20"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
