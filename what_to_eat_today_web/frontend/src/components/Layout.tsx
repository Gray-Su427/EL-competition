import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

const Layout: React.FC = () => (
  <div className="app-container">
    <div className="app-scroll">
      <Outlet />
      <div className="bottom-spacer" />
    </div>
    <BottomNav />
  </div>
);

export default Layout;
