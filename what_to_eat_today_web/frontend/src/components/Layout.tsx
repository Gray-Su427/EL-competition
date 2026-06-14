import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import { useState, useEffect } from 'react';

const Layout: React.FC = () => {
  const location = useLocation();
  const isAIPage = location.pathname === '/ai';
  const [viewportHeight, setViewportHeight] = useState<number | undefined>();

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      setViewportHeight(vv.height);
    };

    onResize();
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
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
