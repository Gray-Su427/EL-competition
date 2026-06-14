import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';

const Layout: React.FC = () => {
  const location = useLocation();
  const isAIPage = location.pathname === '/ai';
  const [viewportHeight, setViewportHeight] = useState<number | undefined>();

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }

    const handleResize = () => {
      setViewportHeight(viewport.height);
    };

    handleResize();
    viewport.addEventListener('resize', handleResize);
    return () => viewport.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="app-container">
      <div
        className={isAIPage ? 'app-scroll-full' : 'app-scroll'}
        style={isAIPage && viewportHeight ? { height: viewportHeight } : undefined}
      >
        <Outlet />
        {!isAIPage && <div className="bottom-spacer" />}
      </div>
      <BottomNav />
    </div>
  );
};

export default Layout;
