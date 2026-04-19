'use client';

import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface IdleWarningProps {
  open: boolean;
  onStay: () => void;
}

export function IdleWarning({ open, onStay }: IdleWarningProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
          <Clock className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="font-bold text-gray-900 text-lg mb-1">Are you still there?</h2>
        <p className="text-sm text-gray-500 mb-5">
          You'll be signed out in 1 minute due to inactivity.
        </p>
        <Button className="w-full h-11" onClick={onStay}>I&apos;m here — stay signed in</Button>
      </div>
    </div>
  );
}
