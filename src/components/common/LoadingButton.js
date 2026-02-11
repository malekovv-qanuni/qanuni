import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingButton = ({ loading, children, className, ...props }) => (
  <button {...props} disabled={loading || props.disabled} 
    className={`${className} ${loading ? 'opacity-70 cursor-not-allowed' : ''} flex items-center justify-center gap-2`}>
    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
    {children}
  </button>
);

export default LoadingButton;
