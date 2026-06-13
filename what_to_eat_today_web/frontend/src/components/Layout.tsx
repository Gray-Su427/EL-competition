import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';

const Layout: React.FC = () => {
  const location = useLocation();
  const isAIPage = location.pathname === '/ai';

  return (
    <div className="app-container">
      <div className={isAIPage ? 'app-scroll-full' : 'app-scroll'}>
        <Outlet />
        {!isAIPage && <div className="bottom-spacer" />}
      </div>
      <BottomNav />
    </div>
  );
};

export default Layout;
