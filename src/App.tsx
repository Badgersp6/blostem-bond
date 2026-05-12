import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import AuthGate from './AuthGate';
import { readDeepLink } from './sdk-init';
import Discover from './screens/Discover';
import AllBonds from './screens/AllBonds';
import AllIpos from './screens/AllIpos';
import BondDetails from './screens/BondDetails';
import IpoDetails from './screens/IpoDetails';
import Checkout from './screens/Checkout';
import KycRequired from './screens/KycRequired';
import KycPanFetch from './screens/kyc/PanFetch';
import KycPanInput from './screens/kyc/PanInput';
import KycPanVerify from './screens/kyc/PanVerify';
import KycBank from './screens/kyc/Bank';
import KycKraFetch from './screens/kyc/KraFetch';
import KycSelfie from './screens/kyc/Selfie';
import KycWetSign from './screens/kyc/WetSign';
import KycPersonal from './screens/kyc/Personal';
import KycDigilocker from './screens/kyc/Digilocker';
import KycEsign from './screens/kyc/Esign';
import KycDemat from './screens/kyc/Demat';
import KycDone from './screens/kyc/Done';
import PlacingOrder from './screens/PlacingOrder';
import Payment from './screens/Payment';
import OrderStatus from './screens/OrderStatus';
import OrdersList from './screens/OrdersList';
import Portfolio from './screens/Portfolio';
import Profile from './screens/Profile';

function EntryPoint() {
  const { isin, orderId } = readDeepLink();
  if (isin) return <Navigate to={`/bonds/${isin}`} replace />;
  if (orderId) return <Navigate to={`/orders/${orderId}`} replace />;
  return <Discover />;
}

export default function App() {
  return (
    <AuthGate>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<EntryPoint />} />
          <Route path="/bonds" element={<AllBonds />} />
          <Route path="/bonds/:isin" element={<BondDetails />} />
          <Route path="/ipos" element={<AllIpos />} />
          <Route path="/ipos/:secId" element={<IpoDetails />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/kyc-required" element={<KycRequired />} />
          <Route path="/kyc/start" element={<KycPanFetch />} />
          <Route path="/kyc/pan-input" element={<KycPanInput />} />
          <Route path="/kyc/pan-verify" element={<KycPanVerify />} />
          <Route path="/kyc/bank" element={<KycBank />} />
          <Route path="/kyc/kra-fetch" element={<KycKraFetch />} />
          <Route path="/kyc/selfie" element={<KycSelfie />} />
          <Route path="/kyc/wet-sign" element={<KycWetSign />} />
          <Route path="/kyc/personal" element={<KycPersonal />} />
          <Route path="/kyc/digilocker" element={<KycDigilocker />} />
          <Route path="/kyc/esign" element={<KycEsign />} />
          <Route path="/kyc/demat" element={<KycDemat />} />
          <Route path="/kyc/done" element={<KycDone />} />
          <Route path="/placing-order" element={<PlacingOrder />} />
          <Route path="/payment/:orderNo" element={<Payment />} />
          <Route path="/orders" element={<OrdersList />} />
          <Route path="/orders/:orderId" element={<OrderStatus />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthGate>
  );
}
