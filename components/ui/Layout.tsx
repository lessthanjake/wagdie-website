import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col items-center bg-soul-950 text-ash selection:bg-blood selection:text-white overflow-x-hidden">
      {/* Corner Ornaments (Decorative) */}
      

      {/* Page Content */}
      {children}
    </div>
  );
};
